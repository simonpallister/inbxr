import { NextResponse } from "next/server";
import { getDomain, setDomain } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    domain: getDomain(),
    smtpPort: Number(process.env.SMTP_PORT || 25),
  });
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { domain?: string };
    if (!body.domain || typeof body.domain !== "string") {
      return NextResponse.json(
        { error: "Domain name is required" },
        { status: 400 }
      );
    }
    const updated = setDomain(body.domain);
    return NextResponse.json({ domain: updated });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to update settings" },
      { status: 500 }
    );
  }
}
