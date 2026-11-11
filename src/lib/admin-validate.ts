// Checks what the /admin page sends before it is written to src/content/*.json. Pure TS, no Node or DOM.
// Returns the first problem as a sentence the admin can show, or null when the data is fine.

export type ContentKind = "profile" | "projects" | "experience" | "stack";
export const CONTENT_KINDS: ContentKind[] = ["profile", "projects", "experience", "stack"];

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown) => typeof v === "string";
const filled = (v: unknown) => str(v) && (v as string).trim().length > 0;
const strList = (v: unknown) => Array.isArray(v) && v.every(str);
const url = (v: unknown) => str(v) && /^https?:\/\/\S+$/.test(v as string);
const localPath = (v: unknown) => str(v) && /^\/[\w\-./]+$/.test(v as string) && !(v as string).includes("..");
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validateProjects(v: unknown): string | null {
  if (!Array.isArray(v)) return "Projects must be a list.";
  const slugs = new Set<string>();
  for (const [i, p] of v.entries()) {
    const at = `Project ${i + 1}`;
    if (!isObj(p)) return `${at} is not valid.`;
    if (!filled(p.name)) return `${at} needs a name.`;
    if (!str(p.slug) || !SLUG.test(p.slug as string)) return `${at}: the URL name may only use a-z, 0-9 and dashes.`;
    if (slugs.has(p.slug as string)) return `${at}: another project already uses the URL name "${p.slug}".`;
    slugs.add(p.slug as string);
    if (!Number.isInteger(p.year) || (p.year as number) < 1990 || (p.year as number) > 2100) return `${at}: enter a year like 2026.`;
    if (!str(p.description)) return `${at}: the description is missing.`;
    if (!strList(p.features) || !strList(p.techStack)) return `${at}: features and tech must be lists of text.`;
    if (p.liveUrl !== undefined && !url(p.liveUrl)) return `${at}: the live link must start with https://.`;
    if (p.sourceCode !== undefined && !url(p.sourceCode)) return `${at}: the source link must start with https://.`;
    if (!localPath(p.thumbnail)) return `${at}: upload a screenshot.`;
    if (typeof p.sortIndex !== "number" || typeof p.hide !== "boolean") return `${at} is not valid.`;
  }
  return null;
}

function validateExperience(v: unknown): string | null {
  if (!Array.isArray(v)) return "Experience must be a list.";
  for (const [i, e] of v.entries()) {
    const at = `Job ${i + 1}`;
    if (!isObj(e)) return `${at} is not valid.`;
    if (!filled(e.title)) return `${at} needs a job title.`;
    if (!filled(e.company)) return `${at} needs a company.`;
    if (!filled(e.startDate) || !filled(e.endDate)) return `${at} needs a start and end date.`;
    if (!filled(e._id) || typeof e.sortIndex !== "number" || typeof e.hide !== "boolean") return `${at} is not valid.`;
  }
  return null;
}

function validateStack(v: unknown): string | null {
  if (!Array.isArray(v)) return "Stack must be a list of groups.";
  for (const [i, g] of v.entries()) {
    if (!isObj(g) || !filled(g.type) || !Array.isArray(g.items)) return `Group ${i + 1} needs a name.`;
    for (const [j, it] of g.items.entries()) {
      const at = `${g.type} item ${j + 1}`;
      if (!isObj(it) || !filled(it.name)) return `${at} needs a name.`;
      if (!localPath(it.icon)) return `${at}: upload an icon.`;
      if (!filled(it._id) || typeof it.sortIndex !== "number" || typeof it.hide !== "boolean") return `${at} is not valid.`;
    }
  }
  return null;
}

function validateProfile(v: unknown): string | null {
  if (!isObj(v)) return "Profile is not valid.";
  for (const k of ["name", "firstName", "alias", "location", "email", "heroIntro", "heroButton", "role", "description"]) {
    if (!filled(v[k])) return `Fill in "${k}".`;
  }
  for (const k of ["aboutStatement", "aboutLead", "aboutTagline"]) if (!str(v[k])) return `"${k}" is not valid.`;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email as string)) return "Enter an email like you@example.com.";
  if (!url(v.siteUrl)) return "The site URL must start with https://.";
  if (v.resume !== "/resume.pdf") return "The resume path must stay /resume.pdf.";
  if (!str(v.birthDate) || ((v.birthDate as string) !== "" && Number.isNaN(Date.parse(v.birthDate as string))))
    return "Birth date must be YYYY-MM-DD, or empty to hide your age.";
  if (!strList(v.heroTitle) || (v.heroTitle as string[]).length !== 2) return "The hero title needs exactly two lines.";
  if (!strList(v.heroCode) || !strList(v.aboutBody)) return "Hero code and About paragraphs must be lists of text.";
  if (!Array.isArray(v.socials) || !v.socials.every((s) => isObj(s) && filled(s.name) && url(s.url)))
    return "Each social link needs a name and a URL starting with https://.";
  return null;
}

export function validateContent(kind: ContentKind, data: unknown): string | null {
  switch (kind) {
    case "projects":
      return validateProjects(data);
    case "experience":
      return validateExperience(data);
    case "stack":
      return validateStack(data);
    case "profile":
      return validateProfile(data);
    default:
      return "Unknown content type.";
  }
}

/** Upload rules per target: allowed extensions and size cap. */
export const UPLOAD_RULES = {
  project: { exts: ["png", "jpg", "jpeg", "webp"], maxMb: 5, dir: "images/projects" },
  stack: { exts: ["png", "jpg", "jpeg", "webp"], maxMb: 1, dir: "images/stack" }, // no SVG: next/image won't render it
  resume: { exts: ["pdf"], maxMb: 10, dir: "" },
} as const;
export type UploadTarget = keyof typeof UPLOAD_RULES;

/**
 * Does the file really start like the type its extension claims? Checks the first bytes ("magic numbers"),
 * so a renamed script or HTML file can't be uploaded as a .png or .pdf.
 */
export function fileMatchesType(ext: string, head: Uint8Array): boolean {
  const starts = (...bytes: number[]) => bytes.every((b, i) => head[i] === b);
  const ascii = (s: string, at = 0) => [...s].every((c, i) => head[at + i] === c.charCodeAt(0));
  switch (ext) {
    case "png":
      return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case "jpg":
    case "jpeg":
      return starts(0xff, 0xd8, 0xff);
    case "webp":
      return ascii("RIFF") && ascii("WEBP", 8);
    case "pdf":
      return ascii("%PDF-");
    default:
      return false;
  }
}

/**
 * Only accept admin writes sent from a page on this computer's own dev server. Blocks other websites from
 * posting to http://127.0.0.1:3240 behind your back (CSRF), including the "null origin" trick and DNS
 * rebinding (an attacker's domain pointed at your machine, which would carry their hostname, not localhost).
 */
export function isLocalRequest(origin: string | null, host: string | null): boolean {
  if (!origin || !host) return false;
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) return false;
  return origin === `http://${host}`;
}

/** Safe file name for an upload: lowercase a-z, 0-9 and dashes, no path parts. */
export function safeName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/\.[^.]*$/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "file"
  );
}
