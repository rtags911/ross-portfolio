import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { isAdmin } from "@/src/app/admin/session";
import { fileMatchesType, isLocalRequest, safeName, UPLOAD_RULES, type UploadTarget } from "@/src/lib/admin-validate";

// A route handler rather than a server action: server actions cap request bodies at 1 MB, screenshots are bigger.
export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development") return new Response("Not found", { status: 404 });
  // Only from a page on this computer's own dev server (blocks other websites, even with the login off).
  if (!isLocalRequest(req.headers.get("origin"), req.headers.get("host")))
    return Response.json({ error: "Uploads are only accepted from this computer." }, { status: 403 });
  if (!(await isAdmin())) return Response.json({ error: "Log in to the admin first." }, { status: 401 });

  // Refuse to write anywhere but this project (cwd is the project folder under `npm run dev`).
  if (!existsSync(path.join(process.cwd(), "src", "content", "profile.json")))
    return Response.json({ error: "Start the site with npm run dev from inside the project folder." }, { status: 500 });

  const form = await req.formData();
  const target = form.get("target") as UploadTarget;
  const file = form.get("file");
  const rules = UPLOAD_RULES[target];
  if (!rules) return Response.json({ error: "Unknown upload type." }, { status: 400 });
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Choose a file." }, { status: 400 });

  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  if (!(rules.exts as readonly string[]).includes(ext))
    return Response.json({ error: `Use a ${rules.exts.join(", ")} file.` }, { status: 400 });
  if (file.size > rules.maxMb * 1024 * 1024)
    return Response.json({ error: `Keep the file under ${rules.maxMb} MB.` }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!fileMatchesType(ext, bytes.subarray(0, 16)))
    return Response.json({ error: `That file isn't a real ${ext.toUpperCase()}.` }, { status: 400 });

  // The resume always replaces the same file so every link to it keeps working.
  const name = target === "resume" ? "resume.pdf" : `${safeName(String(form.get("name") || file.name))}.${ext}`;
  const dir = path.join(process.cwd(), "public", rules.dir);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), bytes);

  return Response.json({ path: `/${[rules.dir, name].filter(Boolean).join("/")}` });
}
