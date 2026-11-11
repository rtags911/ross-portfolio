"use server";

import { access, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { CONTENT_KINDS, type ContentKind, isLocalRequest, validateContent } from "@/src/lib/admin-validate";

import { checkPassword, endSession, isAdmin, passwordConfigured, startSession } from "./session";

export type SaveResult = { ok: true } | { ok: false; error: string };
export type LoginState = { error: string | null };

/** Login form. On the right password: start a 7-day session and open the admin. */
export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  if (process.env.NODE_ENV !== "development") return { error: "The admin only works with npm run dev." };
  if (!passwordConfigured())
    return { error: "Set ADMIN_PASSWORD (8+ characters) in .env.local, then restart npm run dev." };
  const input = form.get("password");
  if (typeof input !== "string" || !checkPassword(input)) {
    await new Promise((r) => setTimeout(r, 600)); // slows down guessing
    return { error: "Wrong password." };
  }
  await startSession();
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}

/** Writes one content file. Only runs under `npm run dev`; the live site can't write files and must not try. */
export async function saveContent(kind: ContentKind, data: unknown): Promise<SaveResult> {
  if (process.env.NODE_ENV !== "development") return { ok: false, error: "The admin only works with npm run dev." };
  // Only from a page on this computer's own dev server (blocks other websites, even with the login off).
  const h = await headers();
  if (!isLocalRequest(h.get("origin"), h.get("host"))) return { ok: false, error: "Saves are only accepted from this computer." };
  // Checked here too, not only on the page: server actions can be called directly.
  if (!(await isAdmin())) return { ok: false, error: "Your login has expired. Reload the page and log in again." };
  if (!CONTENT_KINDS.includes(kind)) return { ok: false, error: "Unknown content type." };
  const error = validateContent(kind, data);
  if (error) return { ok: false, error };
  // process.cwd() is the project folder when started with `npm run dev` from inside it.
  const file = path.join(process.cwd(), "src", "content", `${kind}.json`);
  try {
    await access(file); // must already exist: never create a stray file if the server runs from the wrong folder
    // Plain writeFile replaces the whole file. (Flag "r+" was used before and left the old file's tail behind
    // whenever the new JSON was shorter, which corrupted stack.json.)
    await writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf8");
  } catch (e) {
    console.error("Admin save failed:", e);
    return { ok: false, error: `Couldn't write ${kind}.json. Start the site with npm run dev from inside the project folder.` };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
