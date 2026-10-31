import { NextResponse } from "next/server";
import { getDomain } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    domain: getDomain(),
    smtpPort: Number(process.env.SMTP_PORT || 25),
  });
}
