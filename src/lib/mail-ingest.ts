import crypto from "node:crypto";
import { simpleParser } from "mailparser";
import {
  type EmailSummary,
  type ExtractedLink,
  type InsertAttachmentInput,
  getDomain,
  insertEmailRecord,
  parseRecipientAddress,
} from "./db";
import { emitNewEmail } from "./events";

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&zwnj;|&#8204;|&#x200c;|&#847;|&#x034f;|&shy;|&#173;/gi, " ")
    .replace(/&nbsp;|&#160;|&#xa0;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number(dec);
      if (code === 8203 || code === 8204 || code === 847 || code === 65279) {
        return " ";
      }
      return String.fromCharCode(code);
    });
}

export function extractPreheaderSnippet(
  html: string | null | undefined,
  text: string | null | undefined
): string {
  if (html && html.trim()) {
    const cleaned = decodeHtmlEntities(
      html
        .replace(/<!--[\s\S]*?-->/g, " ")
        .replace(/<head[\s\S]*?<\/head>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<title[\s\S]*?<\/title>/gi, " ")
        .replace(/<[^>]+>/g, " ")
    )
      .replace(/[\u200B-\u200D\uFEFF\u034F\u00AD]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned) {
      return cleaned.slice(0, 180);
    }
  }

  if (text && text.trim()) {
    return text
      .replace(/[\u200B-\u200D\uFEFF\u034F\u00AD]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180);
  }

  return "";
}

export function parseListUnsubscribeHeader(
  rawValue: string | null | undefined
): string | null {
  if (!rawValue) return null;
  const matches = Array.from(rawValue.matchAll(/<([^>]+)>/g)).map((m) =>
    m[1].trim()
  );
  if (matches.length > 0) {
    const httpUrl = matches.find((u) => /^https?:\/\//i.test(u));
    if (httpUrl) return httpUrl;
    return matches[0];
  }
  const urlMatch = rawValue.match(/https?:\/\/[^\s"'>]+/i);
  if (urlMatch) {
    return urlMatch[0];
  }
  const trimmed = rawValue.trim();
  if (/^(https?:\/\/|mailto:)/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export function extractLinksAndPixels(
  html: string | null | undefined
): ExtractedLink[] {
  if (!html) return [];
  const results: ExtractedLink[] = [];

  // Extract <a href="...">...</a>
  const anchorRegex = /<a\b[^>]*?\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorRegex)) {
    const rawUrl = decodeHtmlEntities(match[1].trim());
    if (!rawUrl || rawUrl.startsWith("#") || rawUrl.startsWith("javascript:")) {
      continue;
    }
    const innerText = decodeHtmlEntities(
      match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    );
    const utmParams: Record<string, string> = {};
    try {
      const parsed = new URL(rawUrl, "https://example.com");
      parsed.searchParams.forEach((val, key) => {
        if (
          key.toLowerCase().startsWith("utm_") ||
          ["lid", "mc_cid", "mc_eid", "_hsenc", "_hsmi", " sfmc_id"].includes(
            key.toLowerCase().trim()
          )
        ) {
          utmParams[key] = val;
        }
      });
    } catch {
      // ignore invalid URLs
    }

    results.push({
      url: rawUrl,
      text: innerText || "(Image / Button Link)",
      isTrackingPixel: false,
      utmParams,
    });
  }

  // Extract 1x1 / open tracking pixels <img ... src="...">
  const imgRegex = /<img\b([^>]*?)>/gi;
  for (const match of html.matchAll(imgRegex)) {
    const attrs = match[1];
    const srcMatch = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    if (!srcMatch) continue;
    const src = decodeHtmlEntities(srcMatch[1].trim());
    if (!src || src.startsWith("cid:") || src.startsWith("data:")) continue;

    // Check explicit numeric width/height attributes to avoid flagging responsive content images (e.g. width="170")
    const widthAttr = attrs.match(/\bwidth\s*=\s*["']?\s*(\d+)/i);
    const heightAttr = attrs.match(/\bheight\s*=\s*["']?\s*(\d+)/i);
    const explicitWidth = widthAttr ? Number(widthAttr[1]) : null;
    const explicitHeight = heightAttr ? Number(heightAttr[1]) : null;
    const hasLargeDimensions =
      (explicitWidth !== null && explicitWidth > 2) ||
      (explicitHeight !== null && explicitHeight > 2);

    if (hasLargeDimensions) {
      continue;
    }

    const hasTinyAttrDimension =
      (explicitWidth !== null && explicitWidth <= 1) ||
      (explicitHeight !== null && explicitHeight <= 1);

    const hasTinyStyleDimension =
      /\b(?:width|height)\s*:\s*[01](?:px)?\b/i.test(attrs);

    const isHiddenImage =
      /display\s*:\s*none/i.test(attrs) ||
      /visibility\s*:\s*hidden/i.test(attrs);

    const isTrackingUrl =
      /\/t\/o\/|\/o\.gif\b|(?:open|track|pixel|beacon|wf\/open|trk)/i.test(src);

    const isOneByOne =
      hasTinyAttrDimension ||
      hasTinyStyleDimension ||
      isHiddenImage ||
      isTrackingUrl;

    if (isOneByOne) {
      const utmParams: Record<string, string> = {};
      try {
        const parsed = new URL(src, "https://example.com");
        parsed.searchParams.forEach((val, key) => {
          utmParams[key] = val;
        });
      } catch {
        // ignore
      }
      results.push({
        url: src,
        text: "1x1 Open Tracking Pixel",
        isTrackingPixel: true,
        utmParams,
      });
    }
  }

  return results;
}

function rewriteCidReferences(
  html: string | null,
  emailId: string,
  attachments: InsertAttachmentInput[]
): string | null {
  if (!html) return null;
  let updated = html;
  for (const att of attachments) {
    if (att.contentId) {
      const escapedCid = att.contentId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const cidRegex = new RegExp(`cid:${escapedCid}`, "gi");
      updated = updated.replace(
        cidRegex,
        `/api/emails/${emailId}/attachments/${att.id}`
      );
    }
  }
  return updated;
}

export async function ingestRawMime(
  rawMimeInput: Buffer | string,
  envelopeRecipients?: string[]
): Promise<EmailSummary[]> {
  const rawBuffer =
    typeof rawMimeInput === "string"
      ? Buffer.from(rawMimeInput, "utf-8")
      : rawMimeInput;

  const parsed = await simpleParser(rawBuffer, { keepCidLinks: true });

  // Collect headers into plain object
  const rawHeaders: Record<string, string> = {};
  for (const [key, val] of parsed.headers) {
    if (typeof val === "string") {
      rawHeaders[key] = val;
    } else if (val && typeof val === "object" && "text" in val) {
      rawHeaders[key] = String((val as { text: string }).text);
    } else {
      rawHeaders[key] = JSON.stringify(val);
    }
  }

  const fromValue = parsed.from?.value?.[0];
  const fromName =
    fromValue?.name?.trim() ||
    fromValue?.address?.split("@")[0] ||
    "Unknown Sender";
  const fromAddress = fromValue?.address?.trim() || "sender@example.com";
  const replyTo = parsed.replyTo?.text || null;
  const subject = parsed.subject?.trim() || "(no subject)";

  // Determine recipients
  const recipientList: string[] = [];
  if (envelopeRecipients && envelopeRecipients.length > 0) {
    recipientList.push(...envelopeRecipients);
  } else {
    const toFields = [parsed.to, parsed.cc, parsed.bcc].filter(Boolean);
    for (const field of toFields) {
      if (!field) continue;
      const items = Array.isArray(field) ? field : [field];
      for (const item of items) {
        for (const v of item.value) {
          if (v.address) recipientList.push(v.address);
        }
      }
    }
  }

  if (recipientList.length === 0) {
    recipientList.push(`demo@${getDomain()}`);
  }

  const htmlBodyRaw = typeof parsed.html === "string" ? parsed.html : null;
  const textBody = parsed.text || null;
  const snippet = extractPreheaderSnippet(htmlBodyRaw, textBody);
  const rawMimeText = rawBuffer.toString("utf-8");

  const listHeaderObj = parsed.headers.get("list") as
    | { unsubscribe?: { url?: string; mail?: string } }
    | undefined;
  const mimeUnsubMatch = rawMimeText.match(/^List-Unsubscribe:\s*(.+)$/im);
  const listUnsubRaw =
    listHeaderObj?.unsubscribe?.url ||
    (listHeaderObj?.unsubscribe?.mail
      ? `mailto:${listHeaderObj.unsubscribe.mail}`
      : null) ||
    rawHeaders["list-unsubscribe"] ||
    (mimeUnsubMatch ? mimeUnsubMatch[1].trim() : null);

  if (listUnsubRaw && !rawHeaders["list-unsubscribe"]) {
    rawHeaders["list-unsubscribe"] = listUnsubRaw;
  }

  const listUnsubscribe = parseListUnsubscribeHeader(listUnsubRaw);
  const listUnsubscribePost = rawHeaders["list-unsubscribe-post"] || null;
  const extractedLinks = extractLinksAndPixels(htmlBodyRaw);

  // Deliver to each unique target recipient
  const seenTargets = new Set<string>();
  const createdSummaries: EmailSummary[] = [];

  for (const rawRecipient of recipientList) {
    const parsedRecip = parseRecipientAddress(rawRecipient);
    const dedupeKey = `${parsedRecip.mailbox}:${parsedRecip.cleanAddress}`;
    if (seenTargets.has(dedupeKey)) continue;
    seenTargets.add(dedupeKey);

    const emailId = crypto.randomUUID();
    const attachments: InsertAttachmentInput[] = (parsed.attachments || []).map(
      (att) => {
        const cleanCid = att.contentId
          ? att.contentId.replace(/^<|>$/g, "").trim()
          : null;
        return {
          id: crypto.randomUUID(),
          filename: att.filename || "attachment.bin",
          contentType: att.contentType || "application/octet-stream",
          size: att.size || att.content.length,
          contentId: cleanCid,
          isInline:
            att.contentDisposition === "inline" || Boolean(cleanCid),
          data: att.content,
        };
      }
    );

    const htmlBody = rewriteCidReferences(htmlBodyRaw, emailId, attachments);

    const summary = insertEmailRecord({
      id: emailId,
      mailbox: parsedRecip.mailbox,
      subAddressTag: parsedRecip.subAddressTag,
      originalTo: parsedRecip.cleanAddress,
      fromName,
      fromAddress,
      replyTo,
      subject,
      snippet,
      htmlBody,
      textBody,
      rawHeaders,
      rawMime: rawMimeText,
      listUnsubscribe,
      listUnsubscribePost,
      extractedLinks,
      receivedAt: parsed.date ? parsed.date.toISOString() : undefined,
      attachments,
    });

    emitNewEmail({
      id: summary.id,
      mailbox: summary.mailbox,
      originalTo: summary.originalTo,
      fromName: summary.fromName,
      fromAddress: summary.fromAddress,
      subject: summary.subject,
      snippet: summary.snippet,
      receivedAt: summary.receivedAt,
    });

    createdSummaries.push(summary);
  }

  return createdSummaries;
}

export interface StructuredEmailPayload {
  to: string;
  fromName: string;
  fromAddress: string;
  replyTo?: string | null;
  subject: string;
  html?: string | null;
  text?: string | null;
  headers?: Record<string, string>;
  listUnsubscribe?: string | null;
  receivedAt?: string;
  isRead?: boolean;
  isStarred?: boolean;
  attachments?: Array<{
    filename: string;
    contentType: string;
    content: Buffer | string;
    contentId?: string;
    isInline?: boolean;
  }>;
}

export function ingestStructuredEmail(
  payload: StructuredEmailPayload
): EmailSummary {
  const emailId = crypto.randomUUID();
  const parsedRecip = parseRecipientAddress(payload.to);
  const rawHeaders: Record<string, string> = {
    from: `${payload.fromName} <${payload.fromAddress}>`,
    to: parsedRecip.cleanAddress,
    subject: payload.subject,
    date: payload.receivedAt
      ? new Date(payload.receivedAt).toUTCString()
      : new Date().toUTCString(),
    "message-id": `<${emailId}@${getDomain()}>`,
    "mime-version": "1.0",
    "content-type": payload.html
      ? 'text/html; charset="UTF-8"'
      : 'text/plain; charset="UTF-8"',
    ...(payload.headers || {}),
  };

  if (payload.listUnsubscribe && !rawHeaders["list-unsubscribe"]) {
    rawHeaders["list-unsubscribe"] = `<${payload.listUnsubscribe}>`;
    rawHeaders["list-unsubscribe-post"] = "List-Unsubscribe=One-Click";
  }

  const attachments: InsertAttachmentInput[] = (payload.attachments || []).map(
    (att) => {
      const buf =
        typeof att.content === "string"
          ? Buffer.from(att.content, "utf-8")
          : att.content;
      return {
        id: crypto.randomUUID(),
        filename: att.filename,
        contentType: att.contentType,
        size: buf.length,
        contentId: att.contentId || null,
        isInline: Boolean(att.isInline),
        data: buf,
      };
    }
  );

  const htmlBody = rewriteCidReferences(
    payload.html || null,
    emailId,
    attachments
  );
  const snippet = extractPreheaderSnippet(htmlBody, payload.text);
  const listUnsubscribe =
    payload.listUnsubscribe ||
    parseListUnsubscribeHeader(rawHeaders["list-unsubscribe"]);
  const extractedLinks = extractLinksAndPixels(htmlBody);

  const rawMimeLines = Object.entries(rawHeaders).map(
    ([k, v]) => `${k}: ${v}`
  );
  rawMimeLines.push("", payload.html || payload.text || "");

  const summary = insertEmailRecord({
    id: emailId,
    mailbox: parsedRecip.mailbox,
    subAddressTag: parsedRecip.subAddressTag,
    originalTo: parsedRecip.cleanAddress,
    fromName: payload.fromName,
    fromAddress: payload.fromAddress,
    replyTo: payload.replyTo || null,
    subject: payload.subject,
    snippet,
    htmlBody,
    textBody: payload.text || null,
    rawHeaders,
    rawMime: rawMimeLines.join("\r\n"),
    listUnsubscribe,
    listUnsubscribePost: rawHeaders["list-unsubscribe-post"] || null,
    extractedLinks,
    receivedAt: payload.receivedAt,
    isRead: payload.isRead,
    isStarred: payload.isStarred,
    attachments,
  });

  emitNewEmail({
    id: summary.id,
    mailbox: summary.mailbox,
    originalTo: summary.originalTo,
    fromName: summary.fromName,
    fromAddress: summary.fromAddress,
    subject: summary.subject,
    snippet: summary.snippet,
    receivedAt: summary.receivedAt,
  });

  return summary;
}
