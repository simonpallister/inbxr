export type LinkCategory =
  | "cta"
  | "unsubscribe"
  | "preferences"
  | "view_online";

const TRACKING_PARAM_KEYS = new Set([
  // Ad & analytics click IDs
  "gclid",
  "fbclid",
  "msclkid",
  "twclid",
  "ttclid",
  // Klaviyo
  "_kx",
  // Mailchimp
  "mc_cid",
  "mc_eid",
  // HubSpot
  "_hsenc",
  "_hsmi",
  // Salesforce Marketing Cloud
  "sfmc_id",
  "sfmc_activityid",
  // Marketo
  "mkt_tok",
  // Dotdigital
  "dm_i",
  "dm_t",
  // Generic ESP link ID
  "lid",
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

const GENERIC_ANCHOR_TEXT_REGEX =
  /^(?:here|click\s+here|this\s+link|link|\(image\s*\/\s*button\s*link\))$/i;

const PREFERENCES_URL_REGEX =
  /(?:\/t\/uns\b.*[?&]upc=1|[/?&_-](?:preferences|manage[-_]?preferences|subscription[-_]?cent(?:er|re)|profile[-_]?cent(?:er|re)|email[-_]?settings|communication[-_]?preferences)\b)/i;

const UNSUBSCRIBE_URL_REGEX =
  /(?:\/t\/uns\b|\/uauto\.aspx\b|[/?&_-](?:unsub(?:scribe)?|opt[-_]?out|remove[-_]?me|email[-_]?optout|list[-_]?unsubscribe)\b)/i;

const VIEW_ONLINE_URL_REGEX =
  /(?:\/t\/cr\/|[/?&_-](?:view[-_]?online|webversion|view[-_]?in[-_]?browser|email[-_]?preview)\b)/i;

const PREFERENCES_TEXT_REGEX =
  /\b(?:(?:update|manage|change|edit|email|communication|notification)\s+(?:your\s+)?(?:preferences|subscriptions|settings)|preference\s+cent(?:er|re)|subscription\s+cent(?:er|re))\b/i;

const UNSUBSCRIBE_TEXT_REGEX =
  /\b(?:unsubscribe|opt[-_\s]?out|stop\s+receiving|no\s+longer\s+wish\s+to\s+receive|remove\s+me|cancel\s+(?:my\s+)?subscription|leave\s+this\s+list)\b/i;

const VIEW_ONLINE_TEXT_REGEX =
  /\b(?:view\s+(?:it\s+|this\s+email\s+|as\s+a\s+web\s*page\s+)?(?:online|in\s+(?:your\s+|a\s+)?browser)|web\s+version)\b/i;

export interface ClassifyLinkInput {
  url: string;
  text?: string | null;
  contextText?: string | null;
  attrHint?: string | null;
  listUnsubscribeUrl?: string | null;
}

export function classifyEmailLink(
  urlOrInput: string | ClassifyLinkInput,
  textArg?: string
): LinkCategory {
  const input: ClassifyLinkInput =
    typeof urlOrInput === "string"
      ? { url: urlOrInput, text: textArg }
      : urlOrInput;

  const url = (input.url || "").trim();
  const text = (input.text || "").trim();
  const attrHint = (input.attrHint || "").trim();
  const contextText = (input.contextText || "").trim();
  const listUnsubUrl = (input.listUnsubscribeUrl || "").trim();

  // 1. Direct match against the email's List-Unsubscribe header URL
  if (listUnsubUrl && url && url.toLowerCase() === listUnsubUrl.toLowerCase()) {
    return "unsubscribe";
  }

  // 2. Check URL path / query patterns directly
  if (PREFERENCES_URL_REGEX.test(url)) {
    return "preferences";
  }
  if (UNSUBSCRIBE_URL_REGEX.test(url)) {
    return "unsubscribe";
  }
  if (VIEW_ONLINE_URL_REGEX.test(url)) {
    return "view_online";
  }

  // 3. Check explicit anchor text and HTML attribute hints (alt, title, aria-label, class, id)
  const directTextAndAttrs = `${text} ${attrHint}`;
  if (PREFERENCES_TEXT_REGEX.test(directTextAndAttrs)) {
    return "preferences";
  }
  if (UNSUBSCRIBE_TEXT_REGEX.test(directTextAndAttrs)) {
    return "unsubscribe";
  }
  if (VIEW_ONLINE_TEXT_REGEX.test(directTextAndAttrs)) {
    return "view_online";
  }

  // 4. If anchor text is vague ("here", "click here", image button), check surrounding sentence context
  if (
    contextText &&
    (!text || GENERIC_ANCHOR_TEXT_REGEX.test(text) || text.length <= 12)
  ) {
    if (UNSUBSCRIBE_TEXT_REGEX.test(contextText)) {
      return "unsubscribe";
    }
    if (PREFERENCES_TEXT_REGEX.test(contextText)) {
      return "preferences";
    }
    if (VIEW_ONLINE_TEXT_REGEX.test(contextText)) {
      return "view_online";
    }
  }

  return "cta";
}
