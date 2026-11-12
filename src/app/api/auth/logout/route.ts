import { NextResponse } from "next/server";
import { clearAdminSessionCookie, clearSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ ok: true, authenticated: false });
  clearAdminSessionCookie(response);
  return clearSessionCookie(response);
}
