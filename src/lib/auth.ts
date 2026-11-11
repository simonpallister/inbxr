import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const SESSION_COOKIE_NAME = "inbxr_session";
export const SESSION_MAX_AGE_SECONDS = 90 * 24 * 60 * 60; // 90 days
export const CHALLENGE_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const MAX_VERIFY_ATTEMPTS = 5;
export const ALLOWED_STAFF_DOMAIN = "dotdigital.com";

export interface StaffSession {
  email: string;
  iat: number;
  exp: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __inbxrAuthSecret: string | undefined;
  // eslint-disable-next-line no-var
  var __inbxrInternalInboundSecret: string | undefined;
}

function getAuthSecret(): string {
  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.trim().length >= 16) {
    return process.env.AUTH_SECRET.trim();
  }
  if (globalThis.__inbxrAuthSecret) {
    return globalThis.__inbxrAuthSecret;
  }

  const dbPath =
    process.env.DATABASE_PATH || path.join(process.cwd(), "data", "mail.db");
  const secretPath = path.join(path.dirname(dbPath), ".auth_secret");

  try {
    if (fs.existsSync(secretPath)) {
      const existing = fs.readFileSync(secretPath, "utf8").trim();
      if (existing.length >= 32) {
        globalThis.__inbxrAuthSecret = existing;
        return existing;
      }
    }
    const dir = path.dirname(secretPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const generated = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(secretPath, generated, { mode: 0o600 });
    globalThis.__inbxrAuthSecret = generated;
    return generated;
  } catch {
    const fallback = crypto.randomBytes(32).toString("hex");
    globalThis.__inbxrAuthSecret = fallback;
    return fallback;
  }
}

export function getInternalInboundSecret(): string {
  if (process.env.WEBHOOK_SECRET && process.env.WEBHOOK_SECRET.trim()) {
    return process.env.WEBHOOK_SECRET.trim();
  }
  if (!globalThis.__inbxrInternalInboundSecret) {
    globalThis.__inbxrInternalInboundSecret = crypto
      .randomBytes(24)
      .toString("hex");
  }
  return globalThis.__inbxrInternalInboundSecret;
}

export function normalizeStaffEmail(input: string): string | null {
  const raw = input.trim().toLowerCase();
  if (!raw) return null;

  let email = raw;
  if (!email.includes("@")) {
    email = `${email}@${ALLOWED_STAFF_DOMAIN}`;
  }

  const parts = email.split("@");
  if (parts.length !== 2) return null;

  const [localPart, domainPart] = parts;
  if (domainPart !== ALLOWED_STAFF_DOMAIN) {
    return null;
  }

  if (!/^[a-z0-9._+-]{1,64}$/.test(localPart)) {
    return null;
  }

  return `${localPart}@${ALLOWED_STAFF_DOMAIN}`;
}

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function signPayload(payloadB64: string): string {
  return crypto
    .createHmac("sha256", getAuthSecret())
    .update(payloadB64)
    .digest("base64url");
}

export function createSessionToken(email: string): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const payload: StaffSession = {
    email: email.toLowerCase(),
    iat: nowSec,
    exp: nowSec + SESSION_MAX_AGE_SECONDS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const signature = signPayload(payloadB64);
  return `${payloadB64}.${signature}`;
}

export function verifySessionToken(
  token: string | undefined | null
): StaffSession | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, providedSig] = parts;
  if (!payloadB64 || !providedSig) return null;

  const expectedSig = signPayload(payloadB64);
  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    ) as StaffSession;

    const nowSec = Math.floor(Date.now() / 1000);
    if (!decoded.email || typeof decoded.exp !== "number" || decoded.exp < nowSec) {
      return null;
    }
    if (!decoded.email.endsWith(`@${ALLOWED_STAFF_DOMAIN}`)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function parseCookieHeader(
  cookieHeader: string | null
): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;

  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    try {
      result[key] = decodeURIComponent(val);
    } catch {
      result[key] = val;
    }
  }
  return result;
}

export function getStaffSessionFromRequest(
  request: Request
): StaffSession | null {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  return verifySessionToken(cookies[SESSION_COOKIE_NAME]);
}

export function requireStaffAuth(
  request: Request
): { session: StaffSession; errorResponse?: undefined } | { session?: undefined; errorResponse: NextResponse } {
  const session = getStaffSessionFromRequest(request);
  if (!session) {
    return {
      errorResponse: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
    };
  }
  return { session };
}

export function attachSessionCookie(
  response: NextResponse,
  email: string
): NextResponse {
  const token = createSessionToken(email);
  const isProd = process.env.NODE_ENV === "production";
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  const isProd = process.env.NODE_ENV === "production";
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 0,
  });
  return response;
}

export function createAuthChallenge(email: string): {
  code: string;
  magicToken: string;
  expiresAt: number;
} {
  const db = getDb();
  const now = Date.now();

  // Clean up expired challenges older than 1 hour
  db.prepare(`DELETE FROM auth_challenges WHERE expires_at < ?`).run(
    now - 60 * 60 * 1000
  );

  // Rate limit: max 6 requests for the same email in the last 15 minutes
  const windowStart = now - 15 * 60 * 1000;
  const recentCountRow = db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM auth_challenges WHERE email = ? AND created_at > ?`
    )
    .get(email, windowStart) as { cnt: number } | undefined;

  if (Number(recentCountRow?.cnt || 0) >= 6) {
    throw new Error(
      "Too many login codes requested recently. Please wait a few minutes or use your most recent code."
    );
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const magicToken = crypto.randomBytes(24).toString("hex");
  const expiresAt = now + CHALLENGE_TTL_MS;
  const id = crypto.randomUUID();

  db.prepare(
    `INSERT INTO auth_challenges (
      id, email, code_hash, token_hash, attempts, used, expires_at, created_at
    ) VALUES (?, ?, ?, ?, 0, 0, ?, ?)`
  ).run(
    id,
    email.toLowerCase(),
    sha256Hex(`${email.toLowerCase()}:${code}`),
    sha256Hex(magicToken),
    expiresAt,
    now
  );

  return { code, magicToken, expiresAt };
}

export function verifyOtpChallenge(
  rawEmail: string,
  rawCode: string
): { ok: true; email: string } | { ok: false; error: string } {
  const email = normalizeStaffEmail(rawEmail);
  const code = rawCode.replace(/\s+/g, "").trim();

  if (!email) {
    return { ok: false, error: "Invalid @dotdigital.com email address" };
  }
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: "Enter a valid 6-digit verification code" };
  }

  const db = getDb();
  const now = Date.now();

  const challenges = db
    .prepare(
      `SELECT id, code_hash, attempts, used, expires_at
       FROM auth_challenges
       WHERE email = ? AND used = 0 AND expires_at > ?
       ORDER BY created_at DESC
       LIMIT 3`
    )
    .all(email, now) as Array<{
    id: string;
    code_hash: string;
    attempts: number;
    used: number;
    expires_at: number;
  }>;

  if (challenges.length === 0) {
    return {
      ok: false,
      error: "Verification code expired or not found. Please request a new code.",
    };
  }

  const expectedHash = sha256Hex(`${email}:${code}`);

  for (const ch of challenges) {
    if (ch.attempts >= MAX_VERIFY_ATTEMPTS) {
      continue;
    }
    const a = Buffer.from(ch.code_hash);
    const b = Buffer.from(expectedHash);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      db.prepare(
        `UPDATE auth_challenges SET used = 1 WHERE email = ? AND used = 0`
      ).run(email);
      return { ok: true, email };
    }
  }

  // Increment attempts on the latest active challenge
  const latest = challenges[0];
  db.prepare(
    `UPDATE auth_challenges SET attempts = attempts + 1 WHERE id = ?`
  ).run(latest.id);

  if (latest.attempts + 1 >= MAX_VERIFY_ATTEMPTS) {
    return {
      ok: false,
      error: "Too many incorrect attempts. Please request a new code.",
    };
  }

  return { ok: false, error: "Invalid 6-digit verification code" };
}

export function verifyMagicTokenChallenge(
  rawToken: string
): { ok: true; email: string } | { ok: false; error: string } {
  const token = rawToken.trim();
  if (!token || token.length < 32) {
    return { ok: false, error: "Invalid login link" };
  }

  const db = getDb();
  const now = Date.now();
  const tokenHash = sha256Hex(token);

  const row = db
    .prepare(
      `SELECT id, email, used, expires_at
       FROM auth_challenges
       WHERE token_hash = ?
       LIMIT 1`
    )
    .get(tokenHash) as
    | { id: string; email: string; used: number; expires_at: number }
    | undefined;

  if (!row || row.used || row.expires_at < now) {
    return {
      ok: false,
      error: "This login link has expired or has already been used.",
    };
  }

  db.prepare(
    `UPDATE auth_challenges SET used = 1 WHERE email = ? AND used = 0`
  ).run(row.email);

  return { ok: true, email: row.email };
}
