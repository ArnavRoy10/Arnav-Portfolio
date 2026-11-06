import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const COOKIE = "portfolio_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // one week

let secret = process.env.SESSION_SECRET ?? "";
if (!secret) {
  secret = crypto.randomBytes(32).toString("hex");
  console.warn(
    "[auth] SESSION_SECRET is not set. A temporary one is used, so you will be logged out each time the server restarts.",
  );
}

const b64 = (s: string) => Buffer.from(s).toString("base64url");
const sign = (data: string) => crypto.createHmac("sha256", secret).update(data).digest("base64url");

function safeEqual(a: string, b: string) {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function readCookie(req: Request, name: string) {
  const header = req.headers.cookie ?? "";
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function credentialsConfigured() {
  return Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);
}

export function checkCredentials(email: string, password: string) {
  if (!credentialsConfigured()) return false;
  const okEmail = safeEqual(email.trim().toLowerCase(), process.env.ADMIN_EMAIL!.trim().toLowerCase());
  const okPass = safeEqual(password, process.env.ADMIN_PASSWORD!);
  return okEmail && okPass;
}

export function startSession(req: Request, res: Response) {
  const payload = b64(JSON.stringify({ exp: Date.now() + MAX_AGE_SECONDS * 1000 }));
  const token = `${payload}.${sign(payload)}`;
  const secure = req.secure || req.headers["x-forwarded-proto"] === "https";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${MAX_AGE_SECONDS}${secure ? "; Secure" : ""}`,
  );
}

export function endSession(res: Response) {
  res.setHeader("Set-Cookie", `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

export function isLoggedIn(req: Request) {
  const token = readCookie(req, COOKIE);
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp: number };
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

/** Express middleware: only the logged-in owner gets through. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!isLoggedIn(req)) {
    res.status(401).json({ error: "Please log in." });
    return;
  }
  next();
}

// Login throttling: 5 wrong attempts per IP, then a 15 minute wait.
const attempts = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 15 * 60 * 1000;

export function loginBlocked(ip: string) {
  const a = attempts.get(ip);
  if (!a) return false;
  if (Date.now() - a.first > WINDOW_MS) {
    attempts.delete(ip);
    return false;
  }
  return a.count >= 5;
}

export function recordLoginFailure(ip: string) {
  const a = attempts.get(ip);
  if (!a || Date.now() - a.first > WINDOW_MS) attempts.set(ip, { count: 1, first: Date.now() });
  else a.count += 1;
}

export function clearLoginFailures(ip: string) {
  attempts.delete(ip);
}
