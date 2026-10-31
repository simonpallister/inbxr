import { NextResponse } from "next/server";
import {
  deleteEmailById,
  getEmailById,
  updateEmailFlags,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const email = getEmailById(id);
  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }
  return NextResponse.json({ email });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    isRead?: boolean;
    isStarred?: boolean;
    folder?: "inbox" | "trash";
  };
  const updated = updateEmailFlags(id, body);
  if (!updated) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }
  return NextResponse.json({ email: updated });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  deleteEmailById(id);
  return NextResponse.json({ ok: true });
}
