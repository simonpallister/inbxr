import { getDomain } from "./db";
import {
  type StructuredEmailPayload,
  ingestStructuredEmail,
} from "./mail-ingest";

function formatDisplayName(mailbox: string): string {
  const base = mailbox.split("+")[0] || "Customer";
  return base
    .replace(/[0-9]+$/g, "")
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Alex";
}

export function seedMailboxWithDemoEmails(mailboxInput: string): void {
  const domain = getDomain();
  const targetMailbox =
    mailboxInput === "__all__" ? "jane.smith123" : mailboxInput;
  const firstName = formatDisplayName(targetMailbox).split(" ")[0] || "Jane";
  const now = Date.now();

  const templates: StructuredEmailPayload[] = [
    {
      to: `${targetMailbox}@${domain}`,
      fromName: "AETHER Studio",
      fromAddress: "concierge@mail.aetherstudio.com",
      replyTo: "support@aetherstudio.com",
      subject: `${firstName}, your Private Autumn Preview & 20% Member Reward`,
      listUnsubscribe:
        "https://mail.aetherstudio.com/preferences/unsubscribe?uid=98412",
      isRead: false,
      isStarred: true,
      receivedAt: new Date(now - 1000 * 60 * 18).toISOString(),
      headers: {
        "x-campaign-id": "camp_autumn_vip_2026",
        "x-martech-journey": "VIP_Tier_Unlock_v3",
        "x-mailer": "Martech Cloud ESP",
      },
      text: `Early access starts now. Use code AUTUMN20 at checkout for 20% off new arrivals.`,
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Private Autumn Preview</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 16px !important; }
      .hero-title { font-size: 26px !important; }
      .grid-col { display: block !important; width: 100% !important; margin-bottom: 16px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;">
    Unlocked for Gold members: 48-hour early access to the Autumn Collection + complimentary express shipping.&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f0;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid #f0f0ec;display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:15px;font-weight:700;letter-spacing:0.18em;color:#18181b;">AETHER STUDIO</span>
              <span style="float:right;font-size:11px;font-weight:600;letter-spacing:0.08em;color:#71717a;background:#f4f4f5;padding:4px 10px;border-radius:999px;">GOLD TIER</span>
            </td>
          </tr>
          <tr>
            <td style="background:linear-gradient(135deg,#18181b 0%,#27272a 100%);padding:48px 36px;text-align:center;color:#ffffff;">
              <p style="margin:0 0 12px 0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#a1a1aa;">Private Member Dispatch</p>
              <h1 class="hero-title" style="margin:0 0 16px 0;font-size:32px;font-weight:600;line-height:1.2;color:#ffffff;">The Architectural Knitwear Edit</h1>
              <p style="margin:0 auto 28px auto;max-width:440px;font-size:15px;line-height:1.6;color:#d4d4d8;">
                Hi ${firstName}, as a Gold Member your private preview window is now live. Enjoy 20% off across the entire collection before public release.
              </p>
              <a href="https://aetherstudio.example.com/collections/autumn?utm_source=martech_demo&utm_medium=email&utm_campaign=autumn_vip_preview&utm_content=hero_cta"
                 style="display:inline-block;background-color:#ffffff;color:#18181b;text-decoration:none;font-size:14px;font-weight:600;padding:14px 28px;border-radius:8px;">
                Explore the Edit &rarr;
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafaf9;border:1px dashed #d6d3d1;border-radius:10px;padding:20px;margin-bottom:24px;">
                <tr>
                  <td>
                    <p style="margin:0 0 4px 0;font-size:12px;color:#78716c;text-transform:uppercase;letter-spacing:0.08em;">Your Personal Reward Code</p>
                    <p style="margin:0;font-size:20px;font-weight:700;font-family:monospace;color:#18181b;">AUTUMN-VIP-20</p>
                  </td>
                  <td align="right">
                    <a href="https://aetherstudio.example.com/redeem?code=AUTUMN-VIP-20&utm_source=martech_demo&utm_medium=email&utm_campaign=autumn_vip_preview&utm_content=promo_box"
                       style="font-size:13px;font-weight:600;color:#2563eb;text-decoration:none;">Apply automatically</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#52525b;">
                Complimentary next-day courier delivery is automatically applied to your account (<strong style="color:#18181b;">${targetMailbox}@${domain}</strong>).
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 36px;background-color:#fafafa;border-top:1px solid #f0f0ec;font-size:12px;color:#71717a;line-height:1.5;">
              <p style="margin:0 0 8px 0;">AETHER Studio Inc. &bull; 450 Mercer St, New York, NY 10013</p>
              <p style="margin:0;">
                <a href="https://aetherstudio.example.com/preferences?utm_source=martech_demo&utm_medium=email&utm_campaign=autumn_vip_preview&utm_content=footer_prefs" style="color:#52525b;text-decoration:underline;">Manage Preferences</a>
                &nbsp;&bull;&nbsp;
                <a href="https://mail.aetherstudio.com/preferences/unsubscribe?uid=98412" style="color:#52525b;text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
        <img src="https://trk.aetherstudio.example.com/wf/open?upn=vip_open_pixel_${Date.now()}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;" />
      </td>
    </tr>
  </table>
</body>
</html>`,
    },
    {
      to: `${targetMailbox}@${domain}`,
      fromName: "Meridian Air",
      fromAddress: "itinerary@flymeridian.com",
      subject: `Confirmation: San Francisco (SFO) to London (LHR) — Ref #MR8492`,
      listUnsubscribe: "mailto:unsubscribe@flymeridian.com",
      isRead: true,
      isStarred: false,
      receivedAt: new Date(now - 1000 * 60 * 145).toISOString(),
      headers: {
        "x-campaign-id": "transactional_booking_confirm",
        "x-pnr": "MR8492",
      },
      attachments: [
        {
          filename: "Meridian_Flight_MR8492.ics",
          contentType: "text/calendar",
          content: [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Meridian Air//Flight Itinerary//EN",
            "BEGIN:VEVENT",
            "SUMMARY:Flight MR 104 - SFO to LHR",
            "DESCRIPTION:Confirmation #MR8492 - Seat 4A (Business Studio)",
            "LOCATION:San Francisco International Airport (Terminal I)",
            "END:VEVENT",
            "END:VCALENDAR",
          ].join("\r\n"),
        },
      ],
      text: `Your Meridian Air booking #MR8492 from SFO to LHR is confirmed. Seat 4A.`,
      html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Your e-ticket receipt and calendar itinerary for Flight MR 104 to London Heathrow (Seat 4A).&zwnj;&nbsp;
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px;background-color:#f8fafc;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
          <tr>
            <td style="background:#0f172a;padding:22px 28px;color:#ffffff;">
              <span style="font-size:16px;font-weight:700;letter-spacing:0.06em;">MERIDIAN AIRLINES</span>
              <span style="float:right;font-size:12px;color:#38bdf8;font-weight:600;">BOOKING #MR8492</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 6px 0;font-size:13px;color:#64748b;">Passenger</p>
              <h2 style="margin:0 0 24px 0;font-size:20px;color:#0f172a;">${formatDisplayName(targetMailbox)}</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:10px;padding:20px;margin-bottom:20px;">
                <tr>
                  <td width="40%">
                    <div style="font-size:26px;font-weight:700;color:#0f172a;">SFO</div>
                    <div style="font-size:12px;color:#475569;">San Francisco &bull; 19:40</div>
                  </td>
                  <td width="20%" align="center" style="font-size:12px;color:#64748b;">
                    10h 25m<br/>&rarr;<br/>Nonstop
                  </td>
                  <td width="40%" align="right">
                    <div style="font-size:26px;font-weight:700;color:#0f172a;">LHR</div>
                    <div style="font-size:12px;color:#475569;">London Heathrow &bull; 14:05+1</div>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 20px 0;font-size:13px;color:#475569;">
                <strong>Flight MR 104</strong> &bull; Airbus A350-1000 &bull; Cabin: Business Studio (Seat 4A)
              </p>
              <a href="https://flymeridian.example.com/manage/MR8492?utm_source=transactional&utm_medium=email&utm_campaign=booking_confirm"
                 style="display:inline-block;background:#0284c7;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:11px 20px;border-radius:6px;">
                Manage Booking / Select Meals
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    },
    {
      to: `${targetMailbox}@${domain}`,
      fromName: "Pulse Analytics",
      fromAddress: "digest@pulsecloud.io",
      subject: `Weekly Executive Summary: Conversion lift +18.4% across lifecycle flows`,
      listUnsubscribe: "https://pulsecloud.io/unsub/weekly-digest",
      isRead: true,
      isStarred: false,
      receivedAt: new Date(now - 1000 * 60 * 60 * 22).toISOString(),
      text: `Your weekly workspace metrics are ready. Triggered email journeys drove $142,800 in attributed revenue this week.`,
      html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Triggered journeys drove +18.4% conversion lift this week — view your full attribution breakdown.&zwnj;&nbsp;
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;border:1px solid #e4e4e7;padding:28px;">
          <tr>
            <td>
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:600;color:#4f46e5;text-transform:uppercase;letter-spacing:0.08em;">Pulse Weekly Digest</p>
              <h2 style="margin:0 0 16px 0;font-size:20px;color:#18181b;">Lifecycle Performance Snapshot</h2>
              <p style="margin:0 0 20px 0;font-size:14px;color:#52525b;line-height:1.6;">
                Here is how your automated customer journeys performed over the last 7 days for workspace <strong>${domain}</strong>.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td width="32%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;">
                    <div style="font-size:11px;color:#64748b;">OPEN RATE</div>
                    <div style="font-size:22px;font-weight:700;color:#0f172a;margin-top:4px;">46.8%</div>
                  </td>
                  <td width="2%"></td>
                  <td width="32%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;">
                    <div style="font-size:11px;color:#64748b;">CLICK-TO-OPEN</div>
                    <div style="font-size:22px;font-weight:700;color:#0f172a;margin-top:4px;">18.4%</div>
                  </td>
                  <td width="2%"></td>
                  <td width="32%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;">
                    <div style="font-size:11px;color:#64748b;">ATTRIBUTED REV</div>
                    <div style="font-size:22px;font-weight:700;color:#16a34a;margin-top:4px;">$142.8k</div>
                  </td>
                </tr>
              </table>
              <a href="https://pulsecloud.example.com/reports/weekly?utm_source=digest&utm_medium=email&utm_campaign=weekly_exec_summary"
                 style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:6px;">
                Open Full Dashboard
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    },
  ];

  // Insert in reverse chronological order so the newest is on top
  for (const tpl of templates.reverse()) {
    ingestStructuredEmail(tpl);
  }
}

export function triggerSampleMartechCampaignEmail(mailboxInput: string) {
  const domain = getDomain();
  const targetMailbox =
    mailboxInput === "__all__" ? "jane.smith123" : mailboxInput;
  const firstName = formatDisplayName(targetMailbox).split(" ")[0] || "Jane";

  return ingestStructuredEmail({
    to: `${targetMailbox}+abandoned-cart@${domain}`,
    fromName: "Lumina Audio",
    fromAddress: "concierge@lumina-audio.com",
    replyTo: "support@lumina-audio.com",
    subject: `Still thinking it over, ${firstName}? Your Studio One headphones are reserved`,
    listUnsubscribe:
      "https://lumina-audio.example.com/unsubscribe?campaign=cart_recovery_step1",
    isRead: false,
    isStarred: false,
    headers: {
      "x-martech-canvas": "Abandoned_Cart_High_Value",
      "x-martech-step": "Step_1_4hr_Delay",
      "x-esp-message-id": `lumina-${Date.now()}`,
      "feedback-id": "cart_recovery_step1:lumina:martech_demo",
    },
    text: `Hi ${firstName}, we saved your Lumina Studio One Wireless Headphones in your cart. Complete your order in the next 24 hours for complimentary engraving.`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @media only screen and (max-width: 600px) {
      .wrapper { width: 100% !important; }
      .cta-btn { display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    We've reserved your Studio One Wireless in Brushed Titanium + free custom engraving for the next 24 hours.&zwnj;&nbsp;&zwnj;&nbsp;
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;background-color:#f3f4f6;">
    <tr>
      <td align="center">
        <table role="presentation" class="wrapper" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="padding:22px 32px;background:#111827;color:#ffffff;">
              <span style="font-size:15px;font-weight:700;letter-spacing:0.15em;">LUMINA AUDIO</span>
              <span style="float:right;font-size:12px;color:#9ca3af;">RESERVED IN CART</span>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px;">
              <h1 style="margin:0 0 12px 0;font-size:26px;color:#111827;">Don't leave studio-grade sound behind, ${firstName}.</h1>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#4b5563;">
                Your <strong>Studio One Wireless</strong> in Brushed Titanium is still waiting in your bag. Because stock is limited, we've placed a 24-hour hold on your pair.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:18px;margin-bottom:28px;">
                <tr>
                  <td>
                    <div style="font-size:15px;font-weight:600;color:#111827;">Lumina Studio One — Brushed Titanium</div>
                    <div style="font-size:13px;color:#6b7280;margin-top:4px;">Qty: 1 &bull; Includes Lossless USB-C DAC &amp; Travel Case</div>
                  </td>
                  <td align="right" style="font-size:16px;font-weight:700;color:#111827;">$449.00</td>
                </tr>
              </table>
              <a class="cta-btn"
                 href="https://lumina-audio.example.com/checkout/resume?cart_id=LUM9921&utm_source=martech_journey&utm_medium=email&utm_campaign=abandoned_cart_hv&utm_term=tier_vip&utm_content=primary_resume_button"
                 style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 28px;border-radius:8px;">
                Return to Your Bag &rarr;
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;">
              Sent to ${targetMailbox}+abandoned-cart@${domain} &bull;
              <a href="https://lumina-audio.example.com/unsubscribe?campaign=cart_recovery_step1" style="color:#4b5563;">Unsubscribe</a>
            </td>
          </tr>
        </table>
        <img src="https://trk.lumina-audio.example.com/open/pixel.gif?cid=abandoned_cart_hv&recipient=${encodeURIComponent(targetMailbox)}" width="1" height="1" alt="" style="display:none;" />
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
}
