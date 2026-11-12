import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ ok: true, authenticated: false });
  return clearAdminSessionCookie(response);
}
