import { getMailEventBus, type NewEmailEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mailboxFilter = (searchParams.get("mailbox") || "__all__").toLowerCase();

  const encoder = new TextEncoder();
  const bus = getMailEventBus();

  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // stream closed
        }
      };

      sendEvent("connected", { mailbox: mailboxFilter, ts: Date.now() });

      const onNewEmail = (payload: NewEmailEvent) => {
        if (
          mailboxFilter === "__all__" ||
          payload.mailbox.toLowerCase() === mailboxFilter
        ) {
          sendEvent("email:new", payload);
        } else {
          // Notify switcher badge count for other personas
          sendEvent("persona:activity", {
            mailbox: payload.mailbox,
            subject: payload.subject,
          });
        }
      };

      const onMailboxUpdated = (payload: { mailbox: string }) => {
        sendEvent("mailbox:updated", payload);
      };

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive ${Date.now()}\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 20000);

      bus.on("email:new", onNewEmail);
      bus.on("mailbox:updated", onMailboxUpdated);

      cleanup = () => {
        clearInterval(heartbeat);
        bus.off("email:new", onNewEmail);
        bus.off("mailbox:updated", onMailboxUpdated);
      };

      request.signal.addEventListener("abort", () => {
        if (cleanup) cleanup();
      });
    },
    cancel() {
      if (cleanup) cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
