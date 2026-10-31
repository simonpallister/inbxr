# Inbxr (`inbxr.cloud`)

**Inbxr** is a real-time webmail client and catch-all SMTP server built for live **Martech & Email Marketing demonstrations**.

Point your domain's MX record (or webhook forwarder) at Inbxr, type any persona username on the sign-in screen (e.g., `jane.smith123`), and showcase a modern, Gmail-style split-pane inbox where triggered campaign emails arrive instantaneously.

---

## Key Features

- **Passwordless Persona Login**: Sign into any `@inbxr.cloud` mailbox on the fly (`jane.smith123`, `alex.vip`, etc.) with one-click switching between active personas or a global **Catch-All (`*@inbxr.cloud`)** view.
- **Plus (`+`) Sub-Addressing**: Emails sent to `jane.smith123+abandoned-cart@inbxr.cloud` automatically route into `jane.smith123`'s inbox with a `+abandoned-cart` badge while preserving the original `To:` header.
- **Real-Time Arrival (SSE)**: New emails stream into the inbox list immediately via Server-Sent Events (`/api/stream`) with a live toast notification—no page refresh needed during a demo.
- **Accurate HTML Rendering & Open Pixel Firing**:
  - Emails render inside an isolated `<iframe>` only when opened in the reading pane, ensuring **1x1 open-tracking pixels** fire at the exact moment you click the email during a live presentation.
  - Supports inline `cid:` images and downloadable file attachments (`.ics`, `.pdf`, etc.).
- **Martech Realism Touches**:
  - Extracts hidden marketing preheader text cleanly for the inbox list preview.
  - Detects `List-Unsubscribe` headers and displays a Gmail-style **Unsubscribe** link next to the sender address.
- **Disguised Presenter Tools**:
  - **Top-right 9-dot Apps menu (`⋮⋮⋮`)**: Trigger a realistic test campaign email, seed the inbox with background emails, clear/reset the mailbox, or change the configured `@domain` live.
  - **Message `⋮` menu (`Show original` / `Viewport`)**: Toggle between **Desktop (`100%`)** and **Mobile (`375px`)** viewports, or inspect extracted CTA links, decoded `utm_*` parameters, open-tracking pixels, MIME headers, raw HTML, and plain-text fallbacks.

---

## Quick Start (Local Development)

Requires **Node.js 22.13+** (uses built-in `node:sqlite` and native TypeScript execution).

```bash
npm install
npm run dev
```

- **Webmail UI**: [http://localhost:3000](http://localhost:3000)
- **Local SMTP Server**: `localhost:2525`
- **Inbound HTTP Webhook**: `POST http://localhost:3000/api/inbound`

---

## Testing Email Delivery

### 1. Via HTTP Webhook (`POST /api/inbound`)
Accepts JSON, `multipart/form-data` (SendGrid/Mailgun), or raw `message/rfc822` MIME payloads:

```bash
curl -X POST http://localhost:3000/api/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "to": "jane.smith123+vip@inbxr.cloud",
    "fromName": "AETHER Studio",
    "fromAddress": "concierge@aetherstudio.com",
    "subject": "Your Private Autumn Preview",
    "listUnsubscribe": "https://aetherstudio.com/unsub",
    "html": "<div style=\"display:none\">Unlocked: 20% off for Gold Members.&zwnj;&nbsp;</div><h2>Hi Jane,</h2><p>Your private preview is live.</p><a href=\"https://aetherstudio.com/shop?utm_source=demo&utm_medium=email&utm_campaign=autumn_vip\">Explore the Edit</a>"
  }'
```

### 2. Via SMTP (`port 25` in production / `port 2525` locally)
```bash
curl --url "smtp://localhost:2525" \
  --mail-from "campaigns@martech.io" \
  --mail-rcpt "jane.smith123+smtp@inbxr.cloud" \
  --upload-file - << 'EOF'
From: "Martech Cloud" <campaigns@martech.io>
To: jane.smith123+smtp@inbxr.cloud
Subject: Direct SMTP Delivery Test
List-Unsubscribe: <https://martech.io/unsub>
Content-Type: text/html; charset="UTF-8"

<html><body>
<div style="display:none">Delivered over SMTP!&zwnj;&nbsp;</div>
<h2>Hello from SMTP</h2>
<p>This message was ingested directly via the built-in catch-all SMTP server.</p>
</body></html>
EOF
```

---

## Production Deployment (Docker + Caddy)

1. Copy `.env.example` to `.env` if you want to customize environment variables:
   ```env
   MAIL_DOMAIN=inbxr.cloud
   WEBHOOK_SECRET=
   ```
2. Build and start the container:
   ```bash
   docker compose up -d --build
   ```
   - Exposes `127.0.0.1:3010->3000` for the web UI and `0.0.0.0:25->25` for inbound MX traffic.
   - Persists the SQLite database in `./data/mail.db`.
3. Reverse-proxy your domain in `/etc/caddy/Caddyfile` with streaming flush enabled for SSE:
   ```caddyfile
   inbxr.cloud {
     @sse path /api/stream*
     handle @sse {
       reverse_proxy localhost:3010 {
         flush_interval -1
       }
     }
     handle {
       reverse_proxy localhost:3010
     }
   }
   ```
