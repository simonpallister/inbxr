import { NextResponse } from "next/server";
import {
  ingestRawMime,
  ingestStructuredEmail,
} from "@/lib/mail-ingest";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret) {
      const provided =
        request.headers.get("x-webhook-secret") ||
        new URL(request.url).searchParams.get("secret");
      if (provided !== webhookSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const contentType = (
      request.headers.get("content-type") || ""
    ).toLowerCase();

    // 1. Raw MIME payload (message/rfc822, text/plain, or application/octet-stream)
    if (
      contentType.includes("message/rfc822") ||
      contentType.includes("text/plain") ||
      contentType.includes("application/octet-stream")
    ) {
      const rawBuffer = Buffer.from(await request.arrayBuffer());
      const recipientHeader = request.headers.get("x-envelope-to");
      const summaries = await ingestRawMime(
        rawBuffer,
        recipientHeader ? [recipientHeader] : undefined
      );
      return NextResponse.json({ ok: true, delivered: summaries.length, emails: summaries });
    }

    // 2. Multipart form-data (SendGrid Inbound Parse / Mailgun MIME)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const rawEmail = formData.get("email") || formData.get("body-mime");
      const to = String(formData.get("to") || formData.get("recipient") || "");

      if (rawEmail) {
        const mimeText =
          typeof rawEmail === "string" ? rawEmail : await rawEmail.text();
        const summaries = await ingestRawMime(
          mimeText,
          to ? [to] : undefined
        );
        return NextResponse.json({ ok: true, delivered: summaries.length, emails: summaries });
      }

      const fromField = String(formData.get("from") || "sender@example.com");
      const subject = String(formData.get("subject") || "(no subject)");
      const html = formData.get("html") ? String(formData.get("html")) : null;
      const text = formData.get("text") ? String(formData.get("text")) : null;
      const summary = ingestStructuredEmail({
        to: to || "demo",
        fromName: fromField.replace(/<[^>]+>/, "").trim() || fromField,
        fromAddress: (fromField.match(/<([^>]+)>/)?.[1] || fromField).trim(),
        subject,
        html,
        text,
      });
      return NextResponse.json({ ok: true, delivered: 1, emails: [summary] });
    }

    // 3. JSON webhook payload (Cloudflare Email Worker, Postmark, or custom JSON)
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.rawMime === "string" || typeof body.raw === "string") {
      const raw = String(body.rawMime || body.raw);
      const recipients = Array.isArray(body.recipients)
        ? body.recipients.map(String)
        : body.to
          ? [String(body.to)]
          : undefined;
      const summaries = await ingestRawMime(raw, recipients);
      return NextResponse.json({ ok: true, delivered: summaries.length, emails: summaries });
    }

    const fromRaw = String(body.from || body.fromAddress || "sender@example.com");
    const fromName = String(
      body.fromName ||
        fromRaw.replace(/<[^>]+>/, "").replace(/"/g, "").trim() ||
        "Sender"
    );
    const fromAddress = (
      String(body.fromAddress || "") ||
      fromRaw.match(/<([^>]+)>/)?.[1] ||
      fromRaw
    ).trim();

    const summary = ingestStructuredEmail({
      to: String(body.to || body.recipient || "demo"),
      fromName,
      fromAddress,
      replyTo: body.replyTo ? String(body.replyTo) : null,
      subject: String(body.subject || "(no subject)"),
      html: body.html ? String(body.html) : null,
      text: body.text ? String(body.text) : null,
      listUnsubscribe: body.listUnsubscribe
        ? String(body.listUnsubscribe)
        : null,
      headers:
        body.headers && typeof body.headers === "object"
          ? (body.headers as Record<string, string>)
          : undefined,
    });

    return NextResponse.json({ ok: true, delivered: 1, emails: [summary] });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to ingest inbound email" },
      { status: 500 }
    );
  }
}
