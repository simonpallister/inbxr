# Inbxr (`inbxr.cloud`)

**Inbxr** is a real-time webmail client and catch-all SMTP server built for live **Martech & Email Marketing demonstrations**.

Point your domain's MX record (or webhook forwarder) at Inbxr, type any persona username on the sign-in screen (e.g., `jane.smith123`), and showcase a modern, Gmail-style split-pane inbox where triggered campaign emails arrive instantaneously.

---

## Key Features

- **Passwordless Persona Login & Direct URL Routing**:
  - Sign into any `@inbxr.cloud` mailbox on the fly (`jane.smith123`, `alex.vip`, etc.) or navigate directly to `https://inbxr.cloud/<username>` (or `https://inbxr.cloud/all` for the global **Catch-All (`*@inbxr.cloud`)** view).
  - Recent mailbox history is stored locally per browser (`localStorage`) and paired with live unread counts from `/api/mailboxes`.
  - Automatically ignores web crawler and static asset paths (`ads.txt`, `sellers.json`, `security.txt`, `favicon.png`, etc.).
- **Side-by-Side Persona Comparison (Dynamic Content Demos)**:
  - Launch **Compare Mode** from the email reader header (`Compare`), by hovering over any second email in the list, or by checking two emails in the inbox list.
  - Auto-collapses the inbox list and folder rail so both email variants render side-by-side at full screen width.
  - **Cross-Mailbox Variant Picker**: Compare emails across different personas on the domain without leaving the view.
  - **Synchronized Scrolling**: Scroll both variants in lockstep (with a lock/unlock toggle) to compare hero banners, personalized product grids, and footers.
  - **Subject & Preheader Diff Badges**: Automatically highlights differences in recipient (`+tag`), subject line, preheader snippet, and body content.
- **Plus (`+`) Sub-Addressing**: Emails sent to `jane.smith123+abandoned-cart@inbxr.cloud` automatically route into `jane.smith123`'s inbox with a `+abandoned-cart` badge while preserving the original `To:` header.
- **Real-Time Arrival (SSE)**: New emails stream into the inbox list immediately via Server-Sent Events (`/api/stream`) with a live toast notification—no page refresh needed during a demo.
- **Accurate HTML Rendering & Open Pixel Firing**:
  - Emails render inside an isolated `<iframe>` only when opened in the reading pane, ensuring **1x1 open-tracking pixels** fire at the exact moment you click the email during a live presentation.
  - Distinguishes true 1x1 / hidden tracking beacons from responsive content images and supports inline `cid:` images and downloadable file attachments (`.ics`, `.pdf`, etc.).
- **Martech Realism Touches**:
  - Extracts hidden marketing preheader text cleanly for the inbox list preview.
  - Detects `List-Unsubscribe` headers and displays a Gmail-style **Unsubscribe** link next to the sender address.
- **Tracking Link Unroller & Redirect Audit (`Show original` → `Links & UTMs`)**:
  - **One-Click Unroll & Audit (`POST /api/emails/[id]/unroll`)**: Follows opaque ESP click-tracking wrappers (`301`/`302`/`303`/`307`/`308`, up to 8 hops) to reveal the final landing page URL, HTTP status code, latency (`ms`), and full redirect chain.
  - **Multi-ESP Parameter Extraction**: Automatically extracts `utm_*` tags and ESP/ad tracking parameters (`gclid`, `fbclid`, `msclkid`, Klaviyo `_kx`, Mailchimp `mc_cid`/`mc_eid`, HubSpot `_hsenc`/`_hsmi`, Salesforce `sfmc_id`, Marketo `mkt_tok`, Dotdigital `dm_i`/`dm_t`, and `lid`) from both the initial wrapper and the unrolled destination URL.
  - **ESP-Agnostic Unsubscribe Protection**: Automatically detects and skips unsubscribe and preference-center links during bulk unrolling using five signals:
    1. Exact match against the email's `List-Unsubscribe` header URL.
    2. Common unsubscribe and preference center URL path/query patterns (`/unsub`, `/optout`, `/preferences`, `/t/uns`, `uauto.aspx`, `upc=1`, etc.).
    3. Anchor text and HTML attribute inspection (`alt`, `title`, `aria-label` on `<a>` and nested `<img>` buttons).
    4. Surrounding sentence context (`±160` characters) when anchor text is generic (e.g., *"To stop receiving these emails, click **here**"*).
    5. **Mid-Redirect Hop Guard**: Inspects the `Location` header at each redirect hop and aborts *before* requesting the destination if an opaque tracking link redirects to an unsubscribe or preference URL.
- **Disguised Presenter Tools**:
  - **Top-right 9-dot Apps menu (`⋮⋮⋮`)**: Trigger a realistic test campaign email, seed the inbox with background emails, clear/reset the mailbox, or copy a ready-to-run webhook `curl` snippet.
  - **Message `⋮` menu (`Show original` / `Viewport`)**: Toggle between **Desktop (`100%`)** and **Mobile (`375px`)** viewports, or open the **Martech Inspector** to audit links, UTMs, open-tracking pixels, MIME headers, raw HTML, and plain-text fallbacks.

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

---

## Future Ideas (Backlog)

- **Deliverability, Gmail Clipping & Compliance Scorecard**: Surface HTML byte size vs. Gmail's `102 KB` clipping threshold, RFC 8058 One-Click `List-Unsubscribe-Post` validation, and parsed DKIM signing domains (`d=`) / `Feedback-ID` in the Inspector and `to me ▾` popover.
- **Dark Mode & "Images Blocked" Preview Toggles**: Simulate email client dark-mode inversion and images-off (`alt`-text fallback) rendering directly in the reading pane.
- **Pre-Send QA & Accessibility Checklist**: Automated checks for missing image `alt` attributes, placeholder/broken links, subject/preheader mobile truncation length, and plain-text fallback coverage.
- **Direct Email Permalinks & `.eml` Export**: Shareable URL query parameter (`?msg=<id>`) to link directly to a specific email, plus one-click `.eml` file download.
