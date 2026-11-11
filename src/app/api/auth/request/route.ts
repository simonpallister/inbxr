import { NextResponse } from "next/server";
import {
  ALLOWED_STAFF_DOMAIN,
  createAuthChallenge,
  normalizeStaffEmail,
} from "@/lib/auth";
import { getDomain } from "@/lib/db";
import { sendStaffLoginEmail } from "@/lib/dotdigital";

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
      nextPath?: string;
    };

    const normalizedEmail = normalizeStaffEmail(body.email || "");
    if (!normalizedEmail) {
      return NextResponse.json(
        {
          error: `Please enter a valid @${ALLOWED_STAFF_DOMAIN} email address.`,
        },
        { status: 400 }
      );
    }

    const { code, magicToken, expiresAt } =
      createAuthChallenge(normalizedEmail);

    const origin = resolvePublicOrigin(request);
    const nextPath =
      typeof body.nextPath === "string" && body.nextPath.startsWith("/")
        ? body.nextPath
        : "/";

    const magicUrl = new URL("/api/auth/verify", origin);
    magicUrl.searchParams.set("token", magicToken);
    if (nextPath !== "/") {
      magicUrl.searchParams.set("next", nextPath);
    }

    const delivery = await sendStaffLoginEmail({
      toEmail: normalizedEmail,
      code,
      magicLinkUrl: magicUrl.toString(),
    });

    return NextResponse.json({
      ok: true,
      email: normalizedEmail,
      expiresAt,
      deliveredVia: delivery.deliveredVia,
      ...(delivery.devCode ? { devCode: delivery.devCode } : {}),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          (err as Error).message || "Failed to send verification code.",
      },
      { status: 400 }
    );
  }
}
