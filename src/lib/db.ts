import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export interface ExtractedLink {
  url: string;
  text: string;
  isTrackingPixel: boolean;
  utmParams: Record<string, string>;
}

export interface AttachmentMeta {
  id: string;
  emailId: string;
  filename: string;
  contentType: string;
  size: number;
  contentId: string | null;
  isInline: boolean;
}

export interface EmailSummary {
  id: string;
  mailbox: string;
  subAddressTag: string | null;
  originalTo: string;
  fromName: string;
  fromAddress: string;
  subject: string;
  snippet: string;
  listUnsubscribe: string | null;
  hasAttachments: boolean;
  isRead: boolean;
  isStarred: boolean;
  folder: string;
  receivedAt: string;
}

export interface EmailDetail extends EmailSummary {
  replyTo: string | null;
  htmlBody: string | null;
  textBody: string | null;
  rawHeaders: Record<string, string>;
  rawMime: string | null;
  listUnsubscribePost: string | null;
  extractedLinks: ExtractedLink[];
  attachments: AttachmentMeta[];
}

export interface MailboxSummary {
  username: string;
  unreadCount: number;
  totalCount: number;
  lastAccessedAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __mailSqliteDb: DatabaseSync | undefined;
}

export function getDb(): DatabaseSync {
  if (globalThis.__mailSqliteDb) {
    return globalThis.__mailSqliteDb;
  }

  const dbPath =
    process.env.DATABASE_PATH || path.join(process.cwd(), "data", "mail.db");
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA synchronous = NORMAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mailboxes (
      username TEXT PRIMARY KEY,
      last_accessed_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS emails (
      id TEXT PRIMARY KEY,
      mailbox TEXT NOT NULL,
      sub_address_tag TEXT,
      original_to TEXT NOT NULL,
      from_name TEXT NOT NULL,
      from_address TEXT NOT NULL,
      reply_to TEXT,
      subject TEXT NOT NULL,
      snippet TEXT NOT NULL,
      html_body TEXT,
      text_body TEXT,
      raw_headers TEXT NOT NULL,
      raw_mime TEXT,
      list_unsubscribe TEXT,
      list_unsubscribe_post TEXT,
      extracted_links TEXT NOT NULL,
      has_attachments INTEGER NOT NULL DEFAULT 0,
      is_read INTEGER NOT NULL DEFAULT 0,
      is_starred INTEGER NOT NULL DEFAULT 0,
      folder TEXT NOT NULL DEFAULT 'inbox',
      received_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_emails_mailbox_received
      ON emails(mailbox, folder, received_at DESC);

    CREATE INDEX IF NOT EXISTS idx_emails_received
      ON emails(received_at DESC);

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      email_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      content_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      content_id TEXT,
      is_inline INTEGER NOT NULL DEFAULT 0,
      data BLOB NOT NULL,
      FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_attachments_email_id
      ON attachments(email_id);
  `);

  const defaultDomain = (process.env.MAIL_DOMAIN || "inbxr.cloud")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");

  const existingDomain = db
    .prepare("SELECT value FROM settings WHERE key = 'domain'")
    .get() as { value: string } | undefined;

  if (!existingDomain) {
    db.prepare("INSERT INTO settings (key, value) VALUES ('domain', ?)").run(
      defaultDomain
    );
  }

  globalThis.__mailSqliteDb = db;
  return db;
}

export function parseRecipientAddress(rawAddress: string): {
  mailbox: string;
  subAddressTag: string | null;
  cleanAddress: string;
} {
  const trimmed = rawAddress.trim();
  const match = trimmed.match(/<([^>]+)>/);
  const emailPart = (match ? match[1] : trimmed).trim().toLowerCase();
  const [localPartRaw = "demo", domainPart = getDomain()] = emailPart.split("@");
  const plusIndex = localPartRaw.indexOf("+");

  let mailbox = localPartRaw;
  let subAddressTag: string | null = null;
  if (plusIndex > 0) {
    mailbox = localPartRaw.slice(0, plusIndex);
    subAddressTag = localPartRaw.slice(plusIndex + 1) || null;
  }

  mailbox = mailbox.replace(/[^a-z0-9._-]/g, "") || "inbox";
  return {
    mailbox,
    subAddressTag,
    cleanAddress: `${localPartRaw}@${domainPart}`,
  };
}

export function getDomain(): string {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM settings WHERE key = 'domain'")
    .get() as { value: string } | undefined;
  return row?.value || process.env.MAIL_DOMAIN || "inbxr.cloud";
}

export function setDomain(domain: string): string {
  const cleaned = domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^@/, "")
    .replace(/\/.*$/, "");
  if (!cleaned) {
    return getDomain();
  }
  const db = getDb();
  db.prepare(
    "INSERT INTO settings (key, value) VALUES ('domain', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(cleaned);
  return cleaned;
}

export function touchMailbox(username: string): string {
  const parsed = parseRecipientAddress(username);
  const cleanUsername = parsed.mailbox;
  const now = new Date().toISOString();
  const db = getDb();
  db.prepare(
    `INSERT INTO mailboxes (username, last_accessed_at, created_at)
     VALUES (?, ?, ?)
     ON CONFLICT(username) DO UPDATE SET last_accessed_at = excluded.last_accessed_at`
  ).run(cleanUsername, now, now);
  return cleanUsername;
}

export function listMailboxesWithCounts(): {
  mailboxes: MailboxSummary[];
  allUnreadCount: number;
  allTotalCount: number;
} {
  const db = getDb();

  const rows = db
    .prepare(
      `
      WITH all_names AS (
        SELECT username, last_accessed_at FROM mailboxes
        UNION
        SELECT DISTINCT mailbox AS username, MAX(received_at) AS last_accessed_at
        FROM emails
        GROUP BY mailbox
      ),
      deduped AS (
        SELECT username, MAX(last_accessed_at) AS last_accessed_at
        FROM all_names
        GROUP BY username
      )
      SELECT
        d.username AS username,
        d.last_accessed_at AS lastAccessedAt,
        COUNT(CASE WHEN e.folder = 'inbox' THEN 1 END) AS totalCount,
        COUNT(CASE WHEN e.folder = 'inbox' AND e.is_read = 0 THEN 1 END) AS unreadCount
      FROM deduped d
      LEFT JOIN emails e ON e.mailbox = d.username
      GROUP BY d.username
      ORDER BY d.last_accessed_at DESC
    `
    )
    .all() as Array<{
    username: string;
    lastAccessedAt: string;
    totalCount: number;
    unreadCount: number;
  }>;

  const globalCounts = db
    .prepare(
      `
      SELECT
        COUNT(CASE WHEN folder = 'inbox' THEN 1 END) AS allTotalCount,
        COUNT(CASE WHEN folder = 'inbox' AND is_read = 0 THEN 1 END) AS allUnreadCount
      FROM emails
    `
    )
    .get() as { allTotalCount: number; allUnreadCount: number };

  return {
    mailboxes: rows.map((r) => ({
      username: r.username,
      lastAccessedAt: r.lastAccessedAt,
      totalCount: Number(r.totalCount || 0),
      unreadCount: Number(r.unreadCount || 0),
    })),
    allTotalCount: Number(globalCounts?.allTotalCount || 0),
    allUnreadCount: Number(globalCounts?.allUnreadCount || 0),
  };
}

export interface ListEmailsFilter {
  mailbox: string; // specific username or "__all__"
  folder?: "inbox" | "starred" | "sent" | "drafts" | "trash";
  search?: string;
}

export function listEmails(filter: ListEmailsFilter): {
  emails: EmailSummary[];
  unreadCount: number;
  totalInboxCount: number;
  starredCount: number;
  trashCount: number;
} {
  const db = getDb();
  const isCatchAll = filter.mailbox === "__all__";
  const folder = filter.folder || "inbox";

  // Vanity folders ("sent", "drafts") always return empty list per requirements
  if (folder === "sent" || folder === "drafts") {
    const counts = getFolderCounts(filter.mailbox);
    return {
      emails: [],
      ...counts,
    };
  }

  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (!isCatchAll) {
    conditions.push("mailbox = ?");
    params.push(filter.mailbox.toLowerCase());
  }

  if (folder === "starred") {
    conditions.push("is_starred = 1 AND folder != 'trash'");
  } else if (folder === "trash") {
    conditions.push("folder = 'trash'");
  } else {
    conditions.push("folder = 'inbox'");
  }

  if (filter.search && filter.search.trim()) {
    const q = `%${filter.search.trim()}%`;
    conditions.push(
      "(subject LIKE ? OR from_name LIKE ? OR from_address LIKE ? OR snippet LIKE ? OR text_body LIKE ? OR original_to LIKE ?)"
    );
    params.push(q, q, q, q, q, q);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = db
    .prepare(
      `
      SELECT
        id,
        mailbox,
        sub_address_tag,
        original_to,
        from_name,
        from_address,
        subject,
        snippet,
        list_unsubscribe,
        has_attachments,
        is_read,
        is_starred,
        folder,
        received_at
      FROM emails
      ${whereClause}
      ORDER BY received_at DESC
      LIMIT 250
    `
    )
    .all(...params) as Array<Record<string, unknown>>;

  const counts = getFolderCounts(filter.mailbox);

  return {
    emails: rows.map(mapRowToEmailSummary),
    ...counts,
  };
}

function getFolderCounts(mailbox: string): {
  unreadCount: number;
  totalInboxCount: number;
  starredCount: number;
  trashCount: number;
} {
  const db = getDb();
  const isCatchAll = mailbox === "__all__";
  const where = isCatchAll ? "" : "WHERE mailbox = ?";
  const params = isCatchAll ? [] : [mailbox.toLowerCase()];

  const row = db
    .prepare(
      `
      SELECT
        COUNT(CASE WHEN folder = 'inbox' AND is_read = 0 THEN 1 END) AS unreadCount,
        COUNT(CASE WHEN folder = 'inbox' THEN 1 END) AS totalInboxCount,
        COUNT(CASE WHEN is_starred = 1 AND folder != 'trash' THEN 1 END) AS starredCount,
        COUNT(CASE WHEN folder = 'trash' THEN 1 END) AS trashCount
      FROM emails
      ${where}
    `
    )
    .get(...params) as {
    unreadCount: number;
    totalInboxCount: number;
    starredCount: number;
    trashCount: number;
  };

  return {
    unreadCount: Number(row?.unreadCount || 0),
    totalInboxCount: Number(row?.totalInboxCount || 0),
    starredCount: Number(row?.starredCount || 0),
    trashCount: Number(row?.trashCount || 0),
  };
}

function mapRowToEmailSummary(row: Record<string, unknown>): EmailSummary {
  return {
    id: String(row.id),
    mailbox: String(row.mailbox),
    subAddressTag: row.sub_address_tag ? String(row.sub_address_tag) : null,
    originalTo: String(row.original_to),
    fromName: String(row.from_name),
    fromAddress: String(row.from_address),
    subject: String(row.subject),
    snippet: String(row.snippet),
    listUnsubscribe: row.list_unsubscribe ? String(row.list_unsubscribe) : null,
    hasAttachments: Boolean(row.has_attachments),
    isRead: Boolean(row.is_read),
    isStarred: Boolean(row.is_starred),
    folder: String(row.folder),
    receivedAt: String(row.received_at),
  };
}

export function getEmailById(id: string): EmailDetail | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM emails WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;

  if (!row) {
    return null;
  }

  const attachmentRows = db
    .prepare(
      `
      SELECT id, email_id, filename, content_type, size, content_id, is_inline
      FROM attachments
      WHERE email_id = ?
      ORDER BY is_inline ASC, filename ASC
    `
    )
    .all(id) as Array<Record<string, unknown>>;

  let rawHeaders: Record<string, string> = {};
  try {
    rawHeaders = JSON.parse(String(row.raw_headers || "{}"));
  } catch {
    rawHeaders = {};
  }

  let extractedLinks: ExtractedLink[] = [];
  try {
    extractedLinks = JSON.parse(String(row.extracted_links || "[]"));
  } catch {
    extractedLinks = [];
  }

  return {
    ...mapRowToEmailSummary(row),
    replyTo: row.reply_to ? String(row.reply_to) : null,
    htmlBody: row.html_body ? String(row.html_body) : null,
    textBody: row.text_body ? String(row.text_body) : null,
    rawHeaders,
    rawMime: row.raw_mime ? String(row.raw_mime) : null,
    listUnsubscribePost: row.list_unsubscribe_post
      ? String(row.list_unsubscribe_post)
      : null,
    extractedLinks,
    attachments: attachmentRows.map((a) => ({
      id: String(a.id),
      emailId: String(a.email_id),
      filename: String(a.filename),
      contentType: String(a.content_type),
      size: Number(a.size),
      contentId: a.content_id ? String(a.content_id) : null,
      isInline: Boolean(a.is_inline),
    })),
  };
}

export function getAttachmentBinary(
  emailId: string,
  attachmentId: string
): {
  filename: string;
  contentType: string;
  size: number;
  data: Uint8Array;
} | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT filename, content_type, size, data FROM attachments WHERE email_id = ? AND id = ?"
    )
    .get(emailId, attachmentId) as
    | {
        filename: string;
        content_type: string;
        size: number;
        data: Uint8Array;
      }
    | undefined;

  if (!row) return null;
  return {
    filename: row.filename,
    contentType: row.content_type,
    size: Number(row.size),
    data: row.data,
  };
}

export interface InsertAttachmentInput {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  contentId: string | null;
  isInline: boolean;
  data: Buffer | Uint8Array;
}

export interface InsertEmailInput {
  id: string;
  mailbox: string;
  subAddressTag: string | null;
  originalTo: string;
  fromName: string;
  fromAddress: string;
  replyTo: string | null;
  subject: string;
  snippet: string;
  htmlBody: string | null;
  textBody: string | null;
  rawHeaders: Record<string, string>;
  rawMime: string | null;
  listUnsubscribe: string | null;
  listUnsubscribePost: string | null;
  extractedLinks: ExtractedLink[];
  receivedAt?: string;
  isRead?: boolean;
  isStarred?: boolean;
  attachments?: InsertAttachmentInput[];
}

export function insertEmailRecord(input: InsertEmailInput): EmailSummary {
  const db = getDb();
  const receivedAt = input.receivedAt || new Date().toISOString();
  const attachments = input.attachments || [];
  const nonInlineAttachments = attachments.filter((a) => !a.isInline);

  db.exec("BEGIN");
  try {
    touchMailbox(input.mailbox);

    db.prepare(
      `
      INSERT INTO emails (
        id, mailbox, sub_address_tag, original_to,
        from_name, from_address, reply_to,
        subject, snippet, html_body, text_body,
        raw_headers, raw_mime,
        list_unsubscribe, list_unsubscribe_post,
        extracted_links, has_attachments,
        is_read, is_starred, folder, received_at
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?,
        ?, ?,
        ?, ?,
        ?, ?, 'inbox', ?
      )
    `
    ).run(
      input.id,
      input.mailbox,
      input.subAddressTag,
      input.originalTo,
      input.fromName,
      input.fromAddress,
      input.replyTo,
      input.subject,
      input.snippet,
      input.htmlBody,
      input.textBody,
      JSON.stringify(input.rawHeaders),
      input.rawMime,
      input.listUnsubscribe,
      input.listUnsubscribePost,
      JSON.stringify(input.extractedLinks),
      nonInlineAttachments.length > 0 ? 1 : 0,
      input.isRead ? 1 : 0,
      input.isStarred ? 1 : 0,
      receivedAt
    );

    const insertAtt = db.prepare(
      `
      INSERT INTO attachments (
        id, email_id, filename, content_type, size, content_id, is_inline, data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    );

    for (const att of attachments) {
      insertAtt.run(
        att.id,
        input.id,
        att.filename,
        att.contentType,
        att.size,
        att.contentId,
        att.isInline ? 1 : 0,
        att.data
      );
    }

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  return {
    id: input.id,
    mailbox: input.mailbox,
    subAddressTag: input.subAddressTag,
    originalTo: input.originalTo,
    fromName: input.fromName,
    fromAddress: input.fromAddress,
    subject: input.subject,
    snippet: input.snippet,
    listUnsubscribe: input.listUnsubscribe,
    hasAttachments: nonInlineAttachments.length > 0,
    isRead: Boolean(input.isRead),
    isStarred: Boolean(input.isStarred),
    folder: "inbox",
    receivedAt,
  };
}

export function updateEmailFlags(
  id: string,
  updates: {
    isRead?: boolean;
    isStarred?: boolean;
    folder?: "inbox" | "trash";
  }
): EmailDetail | null {
  const db = getDb();
  const sets: string[] = [];
  const params: Array<string | number> = [];

  if (typeof updates.isRead === "boolean") {
    sets.push("is_read = ?");
    params.push(updates.isRead ? 1 : 0);
  }
  if (typeof updates.isStarred === "boolean") {
    sets.push("is_starred = ?");
    params.push(updates.isStarred ? 1 : 0);
  }
  if (updates.folder) {
    sets.push("folder = ?");
    params.push(updates.folder);
  }

  if (sets.length > 0) {
    params.push(id);
    db.prepare(`UPDATE emails SET ${sets.join(", ")} WHERE id = ?`).run(
      ...params
    );
  }

  return getEmailById(id);
}

export function bulkUpdateEmails(
  ids: string[],
  updates: {
    isRead?: boolean;
    isStarred?: boolean;
    folder?: "inbox" | "trash";
    deletePermanently?: boolean;
  }
): void {
  if (ids.length === 0) return;
  const db = getDb();
  const placeholders = ids.map(() => "?").join(", ");

  if (updates.deletePermanently) {
    db.prepare(`DELETE FROM emails WHERE id IN (${placeholders})`).run(...ids);
    return;
  }

  const sets: string[] = [];
  const params: Array<string | number> = [];
  if (typeof updates.isRead === "boolean") {
    sets.push("is_read = ?");
    params.push(updates.isRead ? 1 : 0);
  }
  if (typeof updates.isStarred === "boolean") {
    sets.push("is_starred = ?");
    params.push(updates.isStarred ? 1 : 0);
  }
  if (updates.folder) {
    sets.push("folder = ?");
    params.push(updates.folder);
  }

  if (sets.length > 0) {
    db.prepare(
      `UPDATE emails SET ${sets.join(", ")} WHERE id IN (${placeholders})`
    ).run(...params, ...ids);
  }
}

export function deleteEmailById(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM emails WHERE id = ?").run(id);
}

export function clearMailboxEmails(mailbox: string): void {
  const db = getDb();
  if (mailbox === "__all__") {
    db.prepare("DELETE FROM emails").run();
  } else {
    db.prepare("DELETE FROM emails WHERE mailbox = ?").run(
      mailbox.toLowerCase()
    );
  }
}
