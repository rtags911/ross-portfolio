// Admin login: one password from .env.local (ADMIN_PASSWORD), and a signed cookie that lasts 7 days.
// Server-only (Node crypto + Next cookies). Used by the admin page, the save action and the upload route.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "admin_session";
const WEEK_SECONDS = 7 * 24 * 60 * 60;

const password = () => process.env.ADMIN_PASSWORD ?? "";

// The cookie is "<expiry>.<signature>", signed with the password itself: changing the password logs everyone out.
const sign = (expiry: string) => createHmac("sha256", password()).update(`admin:${expiry}`).digest("hex");

// Compare without leaking how many characters matched (hash first so lengths are always equal).
const same = (a: string, b: string) =>
  timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

/**
 * ADMIN_AUTH=off in .env.local switches the login off, so /admin opens straight away. It only ever applies
 * under `npm run dev` (the live site has no admin at all). Anything else, or no line, keeps the login on.
 */
export function authDisabled() {
  return process.env.NODE_ENV === "development" && process.env.ADMIN_AUTH === "off";
}

/** False until ADMIN_PASSWORD (8+ characters) is set, and then nobody can log in. Fails closed. */
export function passwordConfigured() {
  return password().length >= 8;
}

export function checkPassword(input: string) {
  return passwordConfigured() && same(input, password());
}

export async function isAdmin() {
  if (authDisabled()) return true;
  if (!passwordConfigured()) return false;
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const [expiry, signature] = value.split(".");
  if (!expiry || !signature || Number(expiry) < Date.now()) return false;
  return same(signature, sign(expiry));
}

export async function startSession() {
  const expiry = String(Date.now() + WEEK_SECONDS * 1000);
  (await cookies()).set(COOKIE, `${expiry}.${sign(expiry)}`, {
    httpOnly: true, // page scripts can't read it
    sameSite: "strict", // other sites can't send it
    secure: process.env.NODE_ENV === "production",
    path: "/", // also sent to /api/admin/upload
    maxAge: WEEK_SECONDS,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}
