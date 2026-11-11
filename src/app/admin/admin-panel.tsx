"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Switch } from "@/src/components/ui/switch";
import { Textarea } from "@/src/components/ui/textarea";
import type { ContentKind, UploadTarget } from "@/src/lib/admin-validate";
import { safeName } from "@/src/lib/admin-validate";
import type { ExperienceResponse, Profile, ProjectResponse, StackGroup, StackItem } from "@/src/types";

import { logout, saveContent } from "./actions";

type Content = { profile: Profile; projects: ProjectResponse[]; experience: ExperienceResponse[]; stack: StackGroup[] };
const TABS = [
  { key: "profile", label: "Profile" },
  { key: "projects", label: "Projects" },
  { key: "experience", label: "Experience" },
  { key: "stack", label: "Stack" },
] as const;

// ---------- small helpers ----------
const lines = (v: string[]) => v.join("\n");
const toLines = (s: string) => s.split("\n");
const clean = (v: string[]) => v.map((s) => s.trim()).filter(Boolean);
const move = <T,>(list: T[], i: number, by: -1 | 1) => {
  const j = i + by;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};
const reindex = <T extends { sortIndex: number }>(list: T[]) => list.map((x, i) => ({ ...x, sortIndex: i + 1 }));

async function upload(target: UploadTarget, file: File, name?: string): Promise<string | null> {
  const form = new FormData();
  form.append("target", target);
  form.append("file", file);
  if (name) form.append("name", name);
  const res = await fetch("/api/admin/upload", { method: "POST", body: form });
  const body = (await res.json().catch(() => ({}))) as { path?: string; error?: string };
  if (!res.ok || !body.path) {
    toast.error(body.error ?? "Upload failed.");
    return null;
  }
  toast.success("Uploaded");
  return body.path;
}

// ---------- shared UI ----------
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-white/80">{label}</Label>
      {children}
      {hint && <p className="text-xs text-white/50">{hint}</p>}
    </div>
  );
}

function RowTools(props: { onUp: () => void; onDown: () => void; onDelete: () => void; hidden?: boolean; onHide?: (v: boolean) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {props.onHide && (
        <label className="mr-2 flex items-center gap-2 text-sm text-white/70">
          <Switch checked={!props.hidden} onCheckedChange={(v) => props.onHide?.(!v)} aria-label="Show on site" />
          {props.hidden ? "Hidden" : "Shown"}
        </label>
      )}
      <Button type="button" size="sm" variant="outline" className={outlineBtn} onClick={props.onUp} aria-label="Move up">↑</Button>
      <Button type="button" size="sm" variant="outline" className={outlineBtn} onClick={props.onDown} aria-label="Move down">↓</Button>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        onClick={() => confirm("Delete this? It's removed when you save.") && props.onDelete()}
      >
        Delete
      </Button>
    </div>
  );
}

function ImagePick({ src, target, name, onChange }: { src: string; target: UploadTarget; name: string; onChange: (p: string) => void }) {
  const [version, setVersion] = useState(0); // bumps after an upload so a replaced file with the same name re-shows
  return (
    <div className="flex items-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- plain img: next/image would cache the old file */}
      <img src={`${src}?v=${version}`} alt="" className="h-16 w-24 rounded border border-white/15 bg-white/5 object-cover" />
      <Input
        type="file"
        accept=".png,.jpg,.jpeg,.webp"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const p = await upload(target, f, name);
          if (p) {
            onChange(p);
            setVersion((v) => v + 1);
          }
          e.target.value = "";
        }}
      />
    </div>
  );
}

// The shared outline button is styled for light pages; the admin is dark.
const outlineBtn = "border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white";
const card = "space-y-4 rounded-lg border border-white/10 bg-white/[0.03] p-5";

// ---------- editors ----------
function ProfileEditor({ value, set }: { value: Profile; set: (p: Profile) => void }) {
  const f = <K extends keyof Profile>(k: K, v: Profile[K]) => set({ ...value, [k]: v });
  const text = (k: keyof Profile, label: string, hint?: string) => (
    <Field label={label} hint={hint}>
      <Input value={value[k] as string} onChange={(e) => f(k, e.target.value as never)} />
    </Field>
  );
  return (
    <div className="space-y-6">
      <div className={card}>
        <h3 className="text-lg">Identity</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {text("name", "Full name")}
          {text("firstName", "First name", "Shown as \"I'm ___.\"")}
          {text("alias", "Alias", "Preloader letters and tab title. 2–6 letters looks best.")}
          {text("role", "Role", "e.g. Front-End Developer")}
          {text("birthDate", "Birth date", "YYYY-MM-DD, or empty to hide your age")}
          {text("location", "Location")}
          {text("email", "Email")}
          {text("siteUrl", "Site URL", "Your live domain, starting with https://")}
        </div>
        <Field label="Short description" hint="Used for search results and link previews.">
          <Textarea value={value.description} onChange={(e) => f("description", e.target.value)} />
        </Field>
      </div>

      <div className={card}>
        <h3 className="text-lg">Social links</h3>
        {value.socials.map((s, i) => (
          <div key={i} className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
            <Input placeholder="github" value={s.name} onChange={(e) => f("socials", value.socials.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <Input placeholder="https://github.com/you" value={s.url} onChange={(e) => f("socials", value.socials.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
            <Button type="button" variant="destructive" onClick={() => f("socials", value.socials.filter((_, j) => j !== i))}>Remove</Button>
          </div>
        ))}
        <Button type="button" variant="outline" className={outlineBtn} onClick={() => f("socials", [...value.socials, { name: "", url: "" }])}>+ Add link</Button>
      </div>

      <div className={card}>
        <h3 className="text-lg">Hero (top of the page)</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Title line 1 (accent colour)">
            <Input value={value.heroTitle[0] ?? ""} onChange={(e) => f("heroTitle", [e.target.value, value.heroTitle[1] ?? ""])} />
          </Field>
          <Field label="Title line 2">
            <Input value={value.heroTitle[1] ?? ""} onChange={(e) => f("heroTitle", [value.heroTitle[0] ?? "", e.target.value])} />
          </Field>
        </div>
        <Field label="Intro">
          <Textarea value={value.heroIntro} onChange={(e) => f("heroIntro", e.target.value)} />
        </Field>
        {text("heroButton", "Button text")}
        <Field label="Code block" hint="One line per row.">
          <Textarea rows={4} value={lines(value.heroCode)} onChange={(e) => f("heroCode", toLines(e.target.value))} />
        </Field>
      </div>

      <div className={card}>
        <h3 className="text-lg">About</h3>
        <Field label="Big statement">
          <Textarea value={value.aboutStatement} onChange={(e) => f("aboutStatement", e.target.value)} />
        </Field>
        <Field label="Lead (under your name)">
          <Textarea value={value.aboutLead} onChange={(e) => f("aboutLead", e.target.value)} />
        </Field>
        <Field label="Paragraphs" hint="One paragraph per line.">
          <Textarea rows={5} value={lines(value.aboutBody)} onChange={(e) => f("aboutBody", toLines(e.target.value))} />
        </Field>
        {text("aboutTagline", "Tagline (big accent line)")}
      </div>

      <div className={card}>
        <h3 className="text-lg">Resume</h3>
        <p className="text-sm text-white/60">
          Replaces <code>public/resume.pdf</code> right away. Pressing Resume in the menu downloads it.{" "}
          <a href="/resume.pdf" target="_blank" rel="noopener" className="underline">Open current</a>
        </p>
        <Input
          type="file"
          accept=".pdf"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) await upload("resume", file);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

function ProjectsEditor({ value, set }: { value: ProjectResponse[]; set: (p: ProjectResponse[]) => void }) {
  const up = (i: number, patch: Partial<ProjectResponse>) => set(value.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  return (
    <div className="space-y-6">
      {value.map((p, i) => (
        <div key={i} className={card}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg">{String(i + 1).padStart(2, "0")} · {p.name || "Untitled"}</h3>
            <RowTools
              hidden={p.hide}
              onHide={(hide) => up(i, { hide })}
              onUp={() => set(move(value, i, -1))}
              onDown={() => set(move(value, i, 1))}
              onDelete={() => set(value.filter((_, j) => j !== i))}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Name">
              <Input value={p.name} onChange={(e) => up(i, { name: e.target.value })} />
            </Field>
            <Field label="URL name" hint={`/projects/${p.slug || "…"}`}>
              <Input value={p.slug} onChange={(e) => up(i, { slug: e.target.value })} onBlur={() => up(i, { slug: safeName(p.slug || p.name) })} />
            </Field>
            <Field label="Year">
              <Input type="number" value={p.year} onChange={(e) => up(i, { year: Number(e.target.value) })} />
            </Field>
          </div>
          <Field label="Description">
            <Textarea value={p.description} onChange={(e) => up(i, { description: e.target.value })} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Features" hint="One per line.">
              <Textarea rows={5} value={lines(p.features)} onChange={(e) => up(i, { features: toLines(e.target.value) })} />
            </Field>
            <Field label="Tech" hint="One per line.">
              <Textarea rows={5} value={lines(p.techStack)} onChange={(e) => up(i, { techStack: toLines(e.target.value) })} />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Live link" hint="Leave empty if there isn't one.">
              <Input value={p.liveUrl ?? ""} onChange={(e) => up(i, { liveUrl: e.target.value || undefined })} />
            </Field>
            <Field label="Source code link" hint="Leave empty if the repo is private.">
              <Input value={p.sourceCode ?? ""} onChange={(e) => up(i, { sourceCode: e.target.value || undefined })} />
            </Field>
          </div>
          <Field label="Screenshot" hint="About 1200×750. PNG, JPG or WebP, up to 5 MB.">
            <ImagePick src={p.thumbnail} target="project" name={p.slug || p.name} onChange={(thumbnail) => up(i, { thumbnail })} />
          </Field>
        </div>
      ))}
      <Button
        type="button"
        variant="outline" className={outlineBtn}
        onClick={() =>
          set([
            ...value,
            {
              _id: "",
              slug: "",
              name: "",
              year: new Date().getFullYear(),
              description: "",
              features: [],
              techStack: [],
              thumbnail: "/images/projects/placeholder.png",
              sortIndex: value.length + 1,
              hide: false,
            },
          ])
        }
      >
        + Add project
      </Button>
    </div>
  );
}

function ExperienceEditor({ value, set }: { value: ExperienceResponse[]; set: (e: ExperienceResponse[]) => void }) {
  const up = (i: number, patch: Partial<ExperienceResponse>) => set(value.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div className="space-y-6">
      {value.map((x, i) => (
        <div key={i} className={card}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg">{x.title || "New job"}</h3>
            <RowTools
              hidden={x.hide}
              onHide={(hide) => up(i, { hide })}
              onUp={() => set(move(value, i, -1))}
              onDown={() => set(move(value, i, 1))}
              onDelete={() => set(value.filter((_, j) => j !== i))}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Job title">
              <Input value={x.title} onChange={(e) => up(i, { title: e.target.value })} />
            </Field>
            <Field label="Company">
              <Input value={x.company} onChange={(e) => up(i, { company: e.target.value })} />
            </Field>
            <Field label="Start" hint="MM/YYYY">
              <Input value={x.startDate} onChange={(e) => up(i, { startDate: e.target.value })} />
            </Field>
            <Field label="End" hint='MM/YYYY or "Present"'>
              <Input value={x.endDate} onChange={(e) => up(i, { endDate: e.target.value })} />
            </Field>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline" className={outlineBtn}
        onClick={() =>
          set([...value, { _id: `job-${Date.now()}`, title: "", company: "", startDate: "", endDate: "Present", sortIndex: value.length + 1, hide: false }])
        }
      >
        + Add job
      </Button>
    </div>
  );
}

function StackEditor({ value, set }: { value: StackGroup[]; set: (s: StackGroup[]) => void }) {
  const upGroup = (g: number, patch: Partial<StackGroup>) => set(value.map((x, j) => (j === g ? { ...x, ...patch } : x)));
  const upItem = (g: number, i: number, patch: Partial<StackItem>) =>
    upGroup(g, { items: value[g].items.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  return (
    <div className="space-y-6">
      {value.map((group, g) => (
        <div key={g} className={card}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <Field label="Group name">
              <Input value={group.type} onChange={(e) => upGroup(g, { type: e.target.value })} />
            </Field>
            <RowTools onUp={() => set(move(value, g, -1))} onDown={() => set(move(value, g, 1))} onDelete={() => set(value.filter((_, j) => j !== g))} />
          </div>
          <div className="space-y-3">
            {group.items.map((it, i) => (
              <div key={i} className="flex flex-wrap items-center gap-3 rounded border border-white/10 p-3">
                <Input className="max-w-48" value={it.name} placeholder="Tool name" onChange={(e) => upItem(g, i, { name: e.target.value })} />
                <ImagePick src={it.icon} target="stack" name={it.name} onChange={(icon) => upItem(g, i, { icon })} />
                <RowTools
                  hidden={it.hide}
                  onHide={(hide) => upItem(g, i, { hide })}
                  onUp={() => upGroup(g, { items: move(group.items, i, -1) })}
                  onDown={() => upGroup(g, { items: move(group.items, i, 1) })}
                  onDelete={() => upGroup(g, { items: group.items.filter((_, j) => j !== i) })}
                />
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline" className={outlineBtn}
            onClick={() =>
              upGroup(g, {
                items: [...group.items, { _id: `tool-${Date.now()}`, name: "", icon: "/images/stack/react.webp", type: group.type, sortIndex: group.items.length + 1, hide: false }],
              })
            }
          >
            + Add tool
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" className={outlineBtn} onClick={() => set([...value, { type: "new group", items: [] }])}>
        + Add group
      </Button>
    </div>
  );
}

// ---------- tidy before saving ----------
function prepare(kind: ContentKind, c: Content): unknown {
  switch (kind) {
    case "profile":
      return { ...c.profile, heroCode: clean(c.profile.heroCode), aboutBody: clean(c.profile.aboutBody) };
    case "projects":
      return reindex(
        c.projects.map((p) => {
          const slug = safeName(p.slug || p.name);
          return { ...p, slug, _id: slug, features: clean(p.features), techStack: clean(p.techStack) };
        })
      );
    case "experience":
      return reindex(c.experience);
    case "stack":
      return c.stack.map((g) => ({ ...g, items: reindex(g.items.map((it) => ({ ...it, type: g.type, _id: it._id || safeName(it.name) }))) }));
  }
}

// ---------- page ----------
export default function AdminPanel({ initial, loginOff }: { initial: Content; loginOff: boolean }) {
  const [tab, setTab] = useState<ContentKind>("profile");
  const [content, setContent] = useState<Content>(initial);
  const [dirty, setDirty] = useState<Partial<Record<ContentKind, boolean>>>({});
  const [saving, startSave] = useTransition();

  const update = <K extends ContentKind>(k: K) => (v: Content[K]) => {
    setContent((c) => ({ ...c, [k]: v }));
    setDirty((d) => ({ ...d, [k]: true }));
  };

  const save = () =>
    startSave(async () => {
      const data = prepare(tab, content);
      const res = await saveContent(tab, data);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setContent((c) => ({ ...c, [tab]: data }));
      setDirty((d) => ({ ...d, [tab]: false }));
      toast.success("Saved. The site has updated.");
    });

  return (
    <div className="admin-root min-h-svh bg-black text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-black/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="font-anton text-xl tracking-wide">{content.profile.alias} · Admin</span>
            <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/60">local only</span>
            {loginOff && (
              <span className="rounded bg-amber-400/15 px-2 py-0.5 text-xs text-amber-200" title="ADMIN_AUTH=off in .env.local">
                login off
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a href="/" target="_blank" rel="noopener" className="text-sm text-white/70 underline">
              View site
            </a>
            <Button onClick={save} disabled={saving || !dirty[tab]}>
              {saving ? "Saving…" : dirty[tab] ? "Save changes" : "Saved"}
            </Button>
            {!loginOff && (
              <form
                action={logout}
                onSubmit={(e) => {
                  if (Object.values(dirty).some(Boolean) && !confirm("You have unsaved changes. Log out anyway?")) e.preventDefault();
                }}
              >
                <Button type="submit" variant="outline" className={outlineBtn}>
                  Log out
                </Button>
              </form>
            )}
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4" aria-label="Sections">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-current={tab === t.key ? "page" : undefined}
              className={`min-h-11 border-b-2 px-4 text-sm ${tab === t.key ? "border-primary text-primary" : "border-transparent text-white/60"}`}
            >
              {t.label}
              {dirty[t.key] ? " •" : ""}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {tab === "profile" && <ProfileEditor value={content.profile} set={update("profile")} />}
        {tab === "projects" && <ProjectsEditor value={content.projects} set={update("projects")} />}
        {tab === "experience" && <ExperienceEditor value={content.experience} set={update("experience")} />}
        {tab === "stack" && <StackEditor value={content.stack} set={update("stack")} />}
      </main>
    </div>
  );
}
