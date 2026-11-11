import { getDomain } from "@/lib/db";

export interface SendStaffLoginEmailInput {
  toEmail: string;
  code: string;
  magicLinkUrl: string;
}

export interface SendStaffLoginEmailResult {
  deliveredVia: "dotdigital" | "dev-console";
  devCode?: string;
}

function buildLoginEmailHtml(input: SendStaffLoginEmailInput): string {
  const domain = getDomain();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign in to inbxr</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f1f1f;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background-color:#ffffff;border-radius:24px;border:1px solid #e1e5ea;padding:32px;">
          <tr>
            <td>
              <div style="margin-bottom:20px;">
                <span style="display:inline-block;background-color:#0b57d0;color:#ffffff;font-weight:700;font-size:16px;padding:8px 14px;border-radius:10px;letter-spacing:-0.3px;">inbxr</span>
              </div>
              <h1 style="margin:0 0 10px;font-size:22px;font-weight:600;color:#1f1f1f;">Your verification code</h1>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#444746;">
                Enter this 6-digit code in <strong>${domain}</strong> to unlock the demo webmail environment for 90 days:
              </p>
              <div style="background-color:#f8fafd;border:1px solid #d3e3fd;border-radius:16px;padding:18px;text-align:center;margin-bottom:24px;">
                <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#0b57d0;">${input.code}</span>
              </div>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#444746;">
                Or sign in immediately with one click:
              </p>
              <div style="margin-bottom:24px;">
                <a href="${input.magicLinkUrl}" style="display:inline-block;background-color:#0b57d0;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:999px;">Unlock inbxr</a>
              </div>
              <p style="margin:0;font-size:12px;line-height:1.5;color:#5f6368;border-top:1px solid #e1e5ea;padding-top:16px;">
                This code expires in 10 minutes. Requested for <strong>${input.toEmail}</strong>. If you didn't request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildLoginEmailPlainText(input: SendStaffLoginEmailInput): string {
  const domain = getDomain();
  return [
    `Your inbxr (${domain}) verification code is: ${input.code}`,
    "",
    `Or click this link to sign in immediately:`,
    input.magicLinkUrl,
    "",
    `This code expires in 10 minutes and unlocks your browser for 90 days.`,
  ].join("\n");
}

export async function sendStaffLoginEmail(
  input: SendStaffLoginEmailInput
): Promise<SendStaffLoginEmailResult> {
  const apiUser = (process.env.DOTDIGITAL_API_USER || "").trim();
  const apiPassword = (process.env.DOTDIGITAL_API_PASSWORD || "").trim();
  const apiBaseUrl = (
    process.env.DOTDIGITAL_API_BASE_URL || "https://r1-api.dotdigital.com"
  )
    .trim()
    .replace(/\/+$/, "");
  const fromAddress = (
    process.env.DOTDIGITAL_FROM_ADDRESS || `inbxr@${getDomain()}`
  ).trim();

  if (!apiUser || !apiPassword) {
    console.log(
      `\n=========================================================\n` +
        `[Auth] Dotdigital Login Code for ${input.toEmail}: ${input.code}\n` +
        `[Auth] Magic Link: ${input.magicLinkUrl}\n` +
        `=========================================================\n`
    );

    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Dotdigital transactional email API is not configured (missing DOTDIGITAL_API_USER / DOTDIGITAL_API_PASSWORD)."
      );
    }

    return {
      deliveredVia: "dev-console",
      devCode: input.code,
    };
  }

  const endpoint = `${apiBaseUrl}/v2/email`;
  const basicAuth = Buffer.from(`${apiUser}:${apiPassword}`, "utf8").toString(
    "base64"
  );

  const payload = {
    toAddresses: [input.toEmail],
    subject: `${input.code} is your inbxr verification code`,
    fromAddress,
    htmlContent: buildLoginEmailHtml(input),
    plainTextContent: buildLoginEmailPlainText(input),
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    let detail = "";
    try {
      const errBody = await response.text();
      detail = errBody.slice(0, 300);
    } catch {
      // ignore
    }
    console.error(
      `[Auth] Dotdigital /v2/email error (${response.status}):`,
      detail
    );
    throw new Error(
      `Failed to send verification email via Dotdigital API (HTTP ${response.status}).`
    );
  }

  return { deliveredVia: "dotdigital" };
}
