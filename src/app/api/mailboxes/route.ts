import { NextResponse } from "next/server";
import {
  getDomain,
  listMailboxesWithCounts,
  touchMailbox,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = listMailboxesWithCounts();
  return NextResponse.json({
    domain: getDomain(),
    ...data,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { username?: string };
    if (!body.username || typeof body.username !== "string") {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }
    const normalized = touchMailbox(body.username);
    const data = listMailboxesWithCounts();
    return NextResponse.json({
      username: normalized,
      domain: getDomain(),
      ...data,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to register mailbox" },
      { status: 500 }
    );
  }
}
