import { NextResponse } from "next/server";
import { getAttachmentBinary } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; attId: string }> }
) {
  const { id, attId } = await context.params;
  const { searchParams } = new URL(request.url);
  const download = searchParams.get("download") === "1";

  const att = getAttachmentBinary(id, attId);
  if (!att) {
    return NextResponse.json(
      { error: "Attachment not found" },
      { status: 404 }
    );
  }

  const disposition = download ? "attachment" : "inline";
  const safeFilename = att.filename.replace(/["\r\n]/g, "_");

  return new NextResponse(Buffer.from(att.data), {
    status: 200,
    headers: {
      "Content-Type": att.contentType || "application/octet-stream",
      "Content-Length": String(att.size),
      "Content-Disposition": `${disposition}; filename="${safeFilename}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
