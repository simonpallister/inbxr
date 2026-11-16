import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";
import {
  deleteMailboxCompletely,
  emptyTrashEmails,
  getDomain,
  listAdminMailboxesPaginated,
} from "@/lib/db";
import { emitMailboxUpdated } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = requireAdminAuth(request);
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("pageSize") || 20);
  const search = searchParams.get("search") || "";
  const sortParam = searchParams.get("sort") || "recent";
  const includeEmpty = searchParams.get("includeEmpty") === "1";

  const sort = (
    ["recent", "total", "unread", "alpha"].includes(sortParam)
      ? sortParam
      : "recent"
  ) as "recent" | "total" | "unread" | "alpha";

  const result = listAdminMailboxesPaginated({
    page,
    pageSize,
    search,
    sort,
    includeEmpty,
  });

  return NextResponse.json({
    domain: getDomain(),
    ...result,
  });
}

export async function DELETE(request: Request) {
  const auth = requireAdminAuth(request);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const mailbox = (searchParams.get("mailbox") || "").trim();

    if (!mailbox || mailbox === "__all__") {
      return NextResponse.json(
        { error: "Valid mailbox name is required" },
        { status: 400 }
      );
    }

    deleteMailboxCompletely(mailbox);
    emitMailboxUpdated(mailbox);

    return NextResponse.json({ ok: true, deletedMailbox: mailbox });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to delete mailbox" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = requireAdminAuth(request);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = (await request.json()) as {
      action?: "empty-trash";
      olderThanHours?: number;
    };

    if (body.action === "empty-trash") {
      const deletedCount = emptyTrashEmails({
        olderThanHours: body.olderThanHours,
      });
      emitMailboxUpdated("__all__");
      return NextResponse.json({ ok: true, deletedCount });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Operation failed" },
      { status: 500 }
    );
  }
}
