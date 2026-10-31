const RESERVED_PATHS = new Set([
  "api",
  "_next",
  "favicon.ico",
  "icon.svg",
  "apple-icon.png",
  "apple-touch-icon.png",
  "apple-touch-icon-precomposed.png",
  "robots.txt",
  "sitemap.xml",
  "manifest.json",
  "manifest.webmanifest",
  "site.webmanifest",
]);

/**
 * Parses a URL path segment or query value into a normalized mailbox identifier.
 * Returns "__all__" for catch-all aliases ("all", "__all__", "*", "all@domain", "*@domain"),
 * a cleaned lowercase username (e.g. "jane.smith123"), or null if invalid/reserved.
 */
export function parseMailboxSegment(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // ignore malformed URI encoding
  }

  const trimmed = decoded.trim().toLowerCase().replace(/^\/+|\/+$/g, "");
  if (!trimmed || RESERVED_PATHS.has(trimmed)) {
    return null;
  }

  if (
    trimmed === "all" ||
    trimmed === "__all__" ||
    trimmed === "*" ||
    trimmed === "catch-all" ||
    trimmed === "catchall" ||
    trimmed.startsWith("all@") ||
    trimmed.startsWith("*@") ||
    trimmed.startsWith("__all__@")
  ) {
    return "__all__";
  }

  const withoutLeadingAt = trimmed.replace(/^@+/, "");
  const [localPart = ""] = withoutLeadingAt.split("@");
  const [baseMailbox = ""] = localPart.split("+");
  const cleaned = baseMailbox.replace(/[^a-z0-9._-]/g, "");

  if (!cleaned || RESERVED_PATHS.has(cleaned)) {
    return null;
  }

  return cleaned;
}

/**
 * Returns the canonical URL path for a given mailbox.
 */
export function getMailboxPath(mailbox: string): string {
  if (mailbox === "__all__" || mailbox === "all") {
    return "/all";
  }
  return `/${encodeURIComponent(mailbox.toLowerCase())}`;
}

/**
 * Formats the browser tab title with the mailbox username first and Gmail-style unread count.
 */
export function formatMailboxTitle(
  mailbox: string | null | undefined,
  unreadCount = 0
): string {
  if (!mailbox) {
    return "inbxr";
  }
  const displayName = mailbox === "__all__" ? "all" : mailbox;
  if (unreadCount > 0) {
    return `${displayName} (${unreadCount}) - inbxr`;
  }
  return `${displayName} - inbxr`;
}
