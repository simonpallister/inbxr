import { NextResponse } from "next/server";
import {
  bulkUpdateEmails,
  clearMailboxEmails,
  getDomain,
  listEmails,
  touchMailbox,
} from "@/lib/db";
import { emitMailboxUpdated } from "@/lib/events";
import {
  seedMailboxWithDemoEmails,
  triggerSampleMartechCampaignEmail,
} from "@/lib/seed-templates";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mailbox = (searchParams.get("mailbox") || "demo").trim();
  const folderParam = searchParams.get("folder") || "inbox";
  const search = searchParams.get("search") || "";

  if (mailbox !== "__all__") {
    touchMailbox(mailbox);
  }

  const folder = (
    ["inbox", "starred", "sent", "drafts", "trash"].includes(folderParam)
      ? folderParam
      : "inbox"
  ) as "inbox" | "starred" | "sent" | "drafts" | "trash";

  const result = listEmails({ mailbox, folder, search });
  return NextResponse.json({
    domain: getDomain(),
    mailbox,
    ...result,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action: "seed" | "test-email" | "clear" | "bulk-update";
      mailbox?: string;
      ids?: string[];
      updates?: {
        isRead?: boolean;
        isStarred?: boolean;
        folder?: "inbox" | "trash";
        deletePermanently?: boolean;
      };
    };

    const mailbox = (body.mailbox || "demo").trim();

    if (body.action === "seed") {
      seedMailboxWithDemoEmails(mailbox);
      emitMailboxUpdated(mailbox);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "test-email") {
      const created = triggerSampleMartechCampaignEmail(mailbox);
      return NextResponse.json({ ok: true, email: created });
    }

    if (body.action === "clear") {
      clearMailboxEmails(mailbox);
      emitMailboxUpdated(mailbox);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "bulk-update") {
      bulkUpdateEmails(body.ids || [], body.updates || {});
      emitMailboxUpdated(mailbox);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Operation failed" },
      { status: 500 }
    );
  }
}
