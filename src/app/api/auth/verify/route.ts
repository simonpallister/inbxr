import { NextResponse } from "next/server";
import {
  attachSessionCookie,
  verifyMagicTokenChallenge,
  verifyOtpChallenge,
} from "@/lib/auth";
import { getDomain } from "@/lib/db";

export const dynamic = "force-dynamic";

function resolvePublicOrigin(request: Request): string {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost =
    request.headers.get("x-forwarded-host") || request.headers.get("host");

  if (forwardedHost) {
    const proto =
      forwardedProto ||
      (forwardedHost.startsWith("localhost") ||
      forwardedHost.startsWith("127.0.0.1")
        ? "http"
        : "https");
    return `${proto}://${forwardedHost}`;
  }

  try {
    return new URL(request.url).origin;
  } catch {
    return `https://${getDomain()}`;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      code?: string;
    };

    const result = verifyOtpChallenge(body.email || "", body.code || "");
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const response = NextResponse.json({
      ok: true,
      authenticated: true,
      email: result.email,
    });

    return attachSessionCookie(response, result.email);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Verification failed" },
      { status: 400 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") || "";
  const nextParam = searchParams.get("next") || "/";
  const safeNext =
    nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  const origin = resolvePublicOrigin(request);
  const result = verifyMagicTokenChallenge(token);

  if (!result.ok) {
    const failUrl = new URL("/", origin);
    failUrl.searchParams.set("auth_error", result.error);
    return NextResponse.redirect(failUrl);
  }

  const redirectUrl = new URL(safeNext, origin);
  const response = NextResponse.redirect(redirectUrl);
  return attachSessionCookie(response, result.email);
}
