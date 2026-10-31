const TRACKING_PARAM_KEYS = new Set([
  "dm_i",
  "dm_t",
  "lid",
  "mc_cid",
  "mc_eid",
  "_hsenc",
  "_hsmi",
  "sfmc_id",
  "gclid",
  "fbclid",
  "msclkid",
]);

export function extractTrackingParamsFromUrl(
  rawUrl: string
): Record<string, string> {
  const utmParams: Record<string, string> = {};
  try {
    const parsed = new URL(rawUrl, "https://example.com");
    parsed.searchParams.forEach((val, key) => {
      const cleanKey = key.toLowerCase().trim();
      if (cleanKey.startsWith("utm_") || TRACKING_PARAM_KEYS.has(cleanKey)) {
        utmParams[key] = val;
      }
    });
  } catch {
    // ignore invalid URLs
  }
  return utmParams;
}

export function classifyEmailLink(
  url: string,
  text?: string
): "unsubscribe" | "preferences" | "view_online" | "cta" {
  const combined = `${url} ${text || ""}`;
  if (
    /\/t\/uns\b.*[?&]upc=1/i.test(url) ||
    /\b(update|manage|email)\s+preferences\b|\bpreference\s+cent(er|re)\b/i.test(
      combined
    )
  ) {
    return "preferences";
  }
  if (
    /\/t\/uns\b/i.test(url) ||
    /\/uauto\.aspx/i.test(url) ||
    /\bunsubscribe\b|\bopt[-_]?out\b/i.test(combined)
  ) {
    return "unsubscribe";
  }
  if (
    /\/t\/cr\//i.test(url) ||
    /\bview\s+(it\s+|this\s+email\s+)?(online|in\s+(your\s+)?browser)\b/i.test(
      combined
    )
  ) {
    return "view_online";
  }
  return "cta";
}
