import http from "node:http";
import { parse } from "node:url";
import next from "next";
import { SMTPServer } from "smtp-server";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const configuredSmtpPort = Number(
  process.env.SMTP_PORT || (dev ? 2525 : 25)
);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function bootstrap() {
  await app.prepare();

  const webServer = http.createServer((req, res) => {
    const parsedUrl = parse(req.url || "/", true);
    handle(req, res, parsedUrl);
  });

  webServer.listen(port, hostname, () => {
    console.log(
      `[Web] Martech Inbox UI ready on http://${hostname}:${port} (env: ${
        dev ? "development" : "production"
      })`
    );
  });

  const smtpServer = new SMTPServer({
    authOptional: true,
    disabledCommands: ["STARTTLS"],
    size: 25 * 1024 * 1024, // 25MB max email size
    onConnect(_session, callback) {
      callback();
    },
    onMailFrom(_address, _session, callback) {
      callback();
    },
    onRcptTo(_address, _session, callback) {
      // Catch-all: accept mail for any address
      callback();
    },
    onData(stream, session, callback) {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => {
        chunks.push(Buffer.from(chunk));
      });
      stream.on("end", async () => {
        try {
          const rawMime = Buffer.concat(chunks);
          const recipients = session.envelope.rcptTo
            .map((r) => r.address)
            .filter(Boolean);

          const headers: Record<string, string> = {
            "content-type": "message/rfc822",
          };
          if (recipients.length > 0) {
            headers["x-envelope-to"] = recipients.join(", ");
          }
          if (process.env.WEBHOOK_SECRET) {
            headers["x-webhook-secret"] = process.env.WEBHOOK_SECRET;
          }

          const res = await fetch(`http://127.0.0.1:${port}/api/inbound`, {
            method: "POST",
            headers,
            body: rawMime,
          });

          if (!res.ok) {
            const text = await res.text();
            console.error("[SMTP] Inbound ingestion error:", text);
          } else {
            console.log(
              `[SMTP] Delivered email (${rawMime.length} bytes) for: ${
                recipients.join(", ") || "catch-all"
              }`
            );
          }
          callback();
        } catch (err) {
          console.error("[SMTP] Failed processing incoming mail:", err);
          callback(err as Error);
        }
      });
    },
  });

  smtpServer.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EACCES" && configuredSmtpPort < 1024) {
      const fallbackPort = 2525;
      console.warn(
        `[SMTP] Port ${configuredSmtpPort} requires elevated privileges. Falling back to port ${fallbackPort}...`
      );
      smtpServer.listen(fallbackPort, hostname, () => {
        console.log(
          `[SMTP] Catch-all SMTP server listening on ${hostname}:${fallbackPort}`
        );
      });
      return;
    }
    console.error("[SMTP] Server error:", err);
  });

  smtpServer.listen(configuredSmtpPort, hostname, () => {
    console.log(
      `[SMTP] Catch-all SMTP server listening on ${hostname}:${configuredSmtpPort}`
    );
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
