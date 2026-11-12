import { NextResponse } from "next/server";
import {
  attachAdminSessionCookie,
  verifyAdminPassword,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

declare global {
  // eslint-disable-next-line no-var
  var __inbxrAdminLoginAttempts: number[] | undefined;
}

export async function POST(request: Request) {
  try {
    const now = Date.now();
    const windowMs = 15 * 60 * 1000;
    const recent = (globalThis.__inbxrAdminLoginAttempts || []).filter(
      (ts) => now - ts < windowMs
    );
    globalThis.__inbxrAdminLoginAttempts = recent;

    if (recent.length >= 10) {
      return NextResponse.json(
        {
          error:
            "Too many failed admin login attempts. Please wait 15 minutes.",
        },
        { status: 429 }
      );
    }

    if (!(process.env.ADMIN_PASSWORD || "").trim()) {
      return NextResponse.json(
        {
          error:
            "ADMIN_PASSWORD is not configured in the server environment (.env).",
        },
        { status: 500 }
      );
    }

    const body = (await request.json()) as { password?: string };
    const password = (body.password || "").trim();

    if (!verifyAdminPassword(password)) {
      recent.push(now);
      globalThis.__inbxrAdminLoginAttempts = recent;
      return NextResponse.json(
        { error: "Invalid admin password." },
        { status: 401 }
      );
    }

    // Clear failed attempts on success
    globalThis.__inbxrAdminLoginAttempts = [];

    const response = NextResponse.json({
      ok: true,
      authenticated: true,
    });

    return attachAdminSessionCookie(response);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Admin login failed" },
      { status: 400 }
    );
  }
}
