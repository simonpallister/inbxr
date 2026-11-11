import { NextResponse } from "next/server";
import { getStaffSessionFromRequest } from "@/lib/auth";
import { getDomain } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = getStaffSessionFromRequest(request);
  return NextResponse.json({
    authenticated: Boolean(session),
    email: session?.email || null,
    domain: getDomain(),
  });
}
