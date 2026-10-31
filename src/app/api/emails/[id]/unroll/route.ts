import { NextRequest, NextResponse } from "next/server";
import {
  type ExtractedLink,
  type LinkRedirectHop,
  type LinkUnrollResult,
  getEmailById,
  updateEmailExtractedLinks,
} from "@/lib/db";
import {
  type LinkCategory,
  classifyEmailLink,
  extractTrackingParamsFromUrl,
} from "@/lib/link-utils";

const MAX_HOPS = 8;
const HOP_TIMEOUT_MS = 8000;

function isSafePublicUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "0.0.0.0" ||
      host === "[::1]" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function unrollSingleUrl(
  startUrl: string,
  options: {
    listUnsubscribeUrl?: string | null;
    abortOnProtectedRedirect: boolean;
  }
): Promise<{
  unrolled: LinkUnrollResult;
  discoveredUtms: Record<string, string>;
  discoveredCategory: LinkCategory | null;
}> {
  const startedAt = Date.now();
  const hops: LinkRedirectHop[] = [];
  const discoveredUtms: Record<string, string> = {
    ...extractTrackingParamsFromUrl(startUrl),
  };

  if (!isSafePublicUrl(startUrl)) {
    return {
      unrolled: {
        finalUrl: startUrl,
        finalStatus: null,
        hops: [],
        durationMs: 0,
        checkedAt: new Date().toISOString(),
        error: "Skipped non-public or unsupported URL scheme",
      },
      discoveredUtms,
      discoveredCategory: null,
    };
  }

  let currentUrl = startUrl;
  let finalStatus: number | null = null;
  let errorMsg: string | null = null;
  let abortedProtectedRedirect = false;
  let discoveredCategory: LinkCategory | null = null;

  for (let hopIndex = 0; hopIndex < MAX_HOPS; hopIndex++) {
    if (!isSafePublicUrl(currentUrl)) {
      errorMsg = "Redirected to non-public address";
      break;
    }

    try {
      const response = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(HOP_TIMEOUT_MS),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      // Immediately cancel body stream — we only need headers and status
      try {
        await response.body?.cancel();
      } catch {
        // ignore stream cancel error
      }

      const status = response.status;
      hops.push({ url: currentUrl, status });
      finalStatus = status;

      const isRedirect =
        status === 301 ||
        status === 302 ||
        status === 303 ||
        status === 307 ||
        status === 308;

      const locationHeader = response.headers.get("location");
      if (isRedirect && locationHeader) {
        const nextUrl = new URL(locationHeader, currentUrl).toString();
        Object.assign(discoveredUtms, extractTrackingParamsFromUrl(nextUrl));

        // Hop-by-hop guard: check if the redirect destination is an unsubscribe/preferences URL
        const hopCategory = classifyEmailLink({
          url: nextUrl,
          listUnsubscribeUrl: options.listUnsubscribeUrl,
        });
        if (
          hopCategory === "unsubscribe" ||
          hopCategory === "preferences"
        ) {
          discoveredCategory = hopCategory;
          if (options.abortOnProtectedRedirect) {
            currentUrl = nextUrl;
            abortedProtectedRedirect = true;
            break;
          }
        }

        currentUrl = nextUrl;
        continue;
      }

      // Reached final destination
      break;
    } catch (err) {
      errorMsg =
        err instanceof Error ? err.message : "Failed to reach destination";
      break;
    }
  }

  return {
    unrolled: {
      finalUrl: currentUrl,
      finalStatus,
      hops,
      durationMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
      error: errorMsg,
      abortedProtectedRedirect,
    },
    discoveredUtms,
    discoveredCategory,
  };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const email = getEmailById(id);

  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  let body: { linkIndex?: number; url?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const links: ExtractedLink[] = email.extractedLinks.map((l) => ({
    ...l,
    utmParams: { ...(l.utmParams || {}) },
  }));

  const isExplicitSingleRequest =
    typeof body.url === "string" || typeof body.linkIndex === "number";

  // Determine which unique URLs to unroll
  const urlsToUnroll = new Set<string>();

  if (typeof body.url === "string" && body.url.trim()) {
    urlsToUnroll.add(body.url.trim());
  } else if (
    typeof body.linkIndex === "number" &&
    body.linkIndex >= 0 &&
    body.linkIndex < links.length
  ) {
    urlsToUnroll.add(links[body.linkIndex].url);
  } else {
    // Bulk unroll: include all regular non-unsubscribe/non-preferences links
    for (const link of links) {
      if (link.isTrackingPixel) continue;
      const category =
        link.category ||
        classifyEmailLink({
          url: link.url,
          text: link.text,
          listUnsubscribeUrl: email.listUnsubscribe,
        });
      if (category === "unsubscribe" || category === "preferences") {
        continue;
      }
      urlsToUnroll.add(link.url);
    }
  }

  const uniqueUrls = Array.from(urlsToUnroll);
  const resultsByUrl = new Map<
    string,
    {
      unrolled: LinkUnrollResult;
      discoveredUtms: Record<string, string>;
      discoveredCategory: LinkCategory | null;
    }
  >();

  // Process in batches of 4 concurrent requests
  const CONCURRENCY = 4;
  for (let i = 0; i < uniqueUrls.length; i += CONCURRENCY) {
    const batch = uniqueUrls.slice(i, i + CONCURRENCY);
    const settled = await Promise.all(
      batch.map(async (u) => ({
        url: u,
        result: await unrollSingleUrl(u, {
          listUnsubscribeUrl: email.listUnsubscribe,
          abortOnProtectedRedirect: !isExplicitSingleRequest,
        }),
      }))
    );
    for (const item of settled) {
      resultsByUrl.set(item.url, item.result);
    }
  }

  // Merge unrolled results back into extractedLinks
  const updatedLinks = links.map((link) => {
    const match = resultsByUrl.get(link.url);
    if (!match) return link;
    return {
      ...link,
      category: match.discoveredCategory || link.category,
      utmParams: {
        ...link.utmParams,
        ...match.discoveredUtms,
      },
      unrolled: match.unrolled,
    };
  });

  const updatedEmail = updateEmailExtractedLinks(id, updatedLinks);

  return NextResponse.json({
    email: updatedEmail,
    unrolledCount: resultsByUrl.size,
  });
}
