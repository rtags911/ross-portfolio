# How the code is structured

A map of `ross-classic`: what each folder does, how a page is put together, and where to make common changes.
For running and editing content see [README.md](README.md); for going live with MongoDB see [DEPLOY.md](DEPLOY.md).

---

## Opening the site

This is a **Next.js app**. There's no `index.html` to double-click, because a server has to build each page.
Opening `src/app/page.tsx`, or a file path in the browser, gives **404**.

```bash
cd D:\Ai-Web\ross-classic
npm run dev
```

Then open **http://localhost:3240/**. The admin panel is at **http://localhost:3240/admin**.

| You see | Why | Fix |
|---|---|---|
| 404 on `localhost:3240/index.html` or a file path | Opened a file, not a page | Go to `http://localhost:3240/` |
| "This site can't be reached" | Server isn't running | Run `npm run dev` from inside `ross-classic` |
| `npm` error: no package.json | Ran it from `D:\Ai-Web` | `cd ross-classic` first |
| 404 on Vercel for every page | Repo root is the studio folder | Vercel → Settings → General → **Root Directory = `ross-classic`** |
| 404 on `/admin` after `npm run build` + `npm start` | On purpose: admin is local-only | Use `npm run dev` for the admin |

---

## The big picture

```
src/content/*.json   ──►  src/content/*.ts  ──►  src/hooks/use-content.ts  ──►  components  ──►  pages
 (your data)              (typed wrappers)       (filter hidden, sort)          (look + motion)    (routes)
        ▲
        └──  /admin writes here  (src/app/admin + src/app/api/admin/upload)
```

- **Data** lives in four JSON files.
- **Looks and motion** live in `components/`.
- **Which components appear on which URL** is decided in `app/`.

---

## Folder by folder

```
ross-classic/
├─ src/
│  ├─ app/            Routes: every folder here is a URL (except (groups) and api/)
│  ├─ components/     Everything you see: sections, animations, background
│  ├─ content/        YOUR DATA: profile, projects, experience, stack
│  ├─ hooks/          Reading content into components
│  ├─ lib/            Small helpers and the admin's validation rules
│  ├─ providers/      App-wide wrappers (data cache, tooltips, toasts)
│  ├─ styles/         globals.css: colours, fonts, keyframes, texture
│  └─ types/          The shape of each content item (TypeScript checks your edits)
├─ public/            Files served as-is: images/, resume.pdf
├─ README.md          How to run and edit
├─ STRUCTURE.md       This file
└─ DEPLOY.md          Plan for Vercel + MongoDB
```

### `src/app/`: routes

Next.js "App Router": **the folder path is the URL**.
- **Brackets:** a folder in `(brackets)` is a *route group*. It shares a layout but adds nothing to the URL.
- **Square brackets:** `[id]` is a value filled in from the URL.

| File | URL / role |
|---|---|
| `layout.tsx` | **Root shell for every page:** fonts, smooth scrolling (Lenis), providers, page title and link previews (built from `profile.json`) |
| `template.tsx` | Pass-through (re-runs on each navigation) |
| `(home)/layout.tsx` | **Shared by the home page:** navbar, footer, preloader, custom cursor, Starry Night sky, small stars, sticky email, scroll bar |
| `(home)/template.tsx` | **Page-wipe transition**, replayed on every page change |
| `(home)/page.tsx` | **`/`** — the home page: Banner → About → Stack → Experience → Projects |
| `(project)/layout.tsx` | Same shell for project pages, with a quieter sky |
| `(project)/projects/[id]/page.tsx` | **`/projects/<slug>`**: one page per project. Built ahead of time for every project in `projects.json` |
| `admin/page.tsx` | **`/admin`** (local only): loads your content into the form |
| `admin/admin-panel.tsx` | The admin UI: Profile / Projects / Experience / Stack tabs |
| `admin/actions.ts` | **Save button:** checks the data, writes `src/content/<name>.json` |
| `api/admin/upload/route.ts` | **Image and resume uploads** into `public/` (local only) |
| `opengraph-image.tsx` | The picture shown when your link is shared (generated from `profile.json`) |
| `not-found.tsx`, `error.tsx` | 404 and error pages |

### `src/components/`: what you see

**Home page sections, top to bottom**

| File | Section |
|---|---|
| `banner.tsx` | **Hero:** "FRONTEND DEVELOPER", intro, resume button, code block |
| `about-me.tsx` | **About:** statement, "I'm …", paragraphs, tagline |
| `stack.tsx` | **"My Stack":** groups of tools with icons |
| `experiences.tsx` | **"My Experience":** jobs |
| `project-list.tsx` | **"Projects":** the list with a hover preview |
| ↳ `project.tsx` | One row in that list (desktop) |
| ↳ `project-mobile.tsx` | One card in that list (phones) |
| ↳ `project-image-preview.tsx` | The sticky screenshot that crossfades on hover |
| `footer.tsx` | **Footer:** email, "built by", design credit |

**Project page**

| File | Part |
|---|---|
| `project-details.tsx` | Title, links, year, tech, description, features, screenshot |
| `image-lightbox.tsx` | Click a screenshot to view it full size |
| `related-projects.tsx` | Previous / next project links |

**Around every page**

| File | What it does |
|---|---|
| `navbar.tsx` | Hamburger menu: sliding panel, section links, **Resume download** |
| `preloader.tsx` | Intro: your alias letters rise, then the columns wipe away (~3.5 s) |
| `page-transition.tsx` + `transition-link.tsx` | Covering wipe when moving between pages |
| `starry-sky.tsx` | **The Van Gogh sky:** brushstrokes along swirling currents, halo stars, moon (painted once on a canvas) |
| `particle-background.tsx` | Small twinkling stars on top of the sky |
| `cursor.tsx` | Custom cursor (mouse devices only) |
| `magnet.tsx` | Button that follows the mouse a little |
| `shiny-text.tsx` | Text with a moving shine |
| `sticky-email.tsx` | Email set vertically, bottom-left, on wide screens |
| `scroll-progress-indicator.tsx` | Thin progress bar on the right edge |
| `section-title.tsx` | The "✱ MY STACK"-style headings |
| `loader-small.tsx` | Small loading dots while content loads |
| `me/signature.tsx` | Styled message in the browser console |
| `button.tsx` | The site's button style |
| `ui/` | shadcn building blocks (input, label, switch, textarea, tooltip, dialog…) used by the admin and lightbox |

### `src/content/`: your data

| File | Holds |
|---|---|
| `profile.json` | Name, alias, links, hero and about text, resume path |
| `projects.json` | Projects (order = `sortIndex`, `hide: true` keeps one off the site) |
| `experience.json` | Jobs |
| `stack.json` | Tool groups and items |
| `*.ts` (same names) | **Don't edit these.** One-line typed wrappers so the rest of the code gets checked types |

Edit the JSON by hand or through `/admin`; both change the same files.

### `src/hooks/`, `src/lib/`, `src/providers/`, `src/types/`, `src/styles/`

| File | Purpose |
|---|---|
| `hooks/use-content.ts` | **How content reaches components:** `useGetProjects`, `useGetProject`, `useGetExperience`, `useGetStack` drop hidden items and sort them |
| `lib/admin-validate.ts` | Rules every admin save must pass (unique URL names, `https://` links, safe file names) |
| `lib/admin-validate.check.ts` | Self-test for those rules: `node --experimental-strip-types src/lib/admin-validate.check.ts` |
| `lib/data.ts` | Email, resume path and social links, pulled from `profile.json` for older components |
| `lib/utils.ts` | `cn()` (joins CSS classes), `getAge()` |
| `lib/dotmatrix-*.tsx` | Animation for the small loader |
| `providers/providers.tsx` | Wraps every page: data cache, tooltips, toast messages, console signature |
| `providers/query-provider.tsx` | Sets up TanStack Query (the data cache the hooks use) |
| `types/index.ts` | `Profile`, `ProjectResponse`, `ExperienceResponse`, `StackGroup`: the shape of the content |
| `config/constants.ts` | Names of the stack groups |
| `styles/globals.css` | **Look of the whole site:** the 4 palette colours (`@theme`), fonts, shine animation, star styles, the canvas texture overlay (`body::after`), admin page fixes |

### Leftovers (safe to delete later)

These came from the original's admin and blog. Nothing on the site uses them:
- `hooks/use-codemirror.tsx`, `hooks/use-confirm.tsx`, `hooks/useSyncedState.ts`
- `components/scroll-button.tsx`
- In `components/ui/`: `dropdown-menu`, `field`, `form`, `input-group`, `input-password`, `select`, `sheet`, `skeleton`, `tags-input`, `alert-dialog`
- `public/pdf.worker.min.mjs`
- The `.editor-container` and `.markdown-body` rules in `globals.css`

---

## How a visit plays out

1. **Request:** the browser asks for `/`.
2. **Shell:** Next.js builds the page from the root layout (`app/layout.tsx`), then `(home)/layout.tsx`, then `(home)/page.tsx`.
3. **Intro:** the preloader covers the screen and spells your alias, while `starry-sky.tsx` paints the sky behind it.
4. **Data:** each section asks its hook for data (`useGetProjects()` …), and the hook reads the JSON.
5. **Motion:** GSAP + ScrollTrigger animate each section in and out as you scroll. Lenis makes the scrolling smooth.
6. **Project click:** `transition-link.tsx` plays the cover wipe, then loads `/projects/<slug>`.

## Where to change things

| I want to… | Go to |
|---|---|
| Change my name, text, links | `/admin` → Profile, or `content/profile.json` |
| Add or reorder projects | `/admin` → Projects, or `content/projects.json` |
| Change the colours | `styles/globals.css` → `--color-*` at the top |
| Shorten the intro animation | `components/preloader.tsx` (the `delay` / `duration` values) |
| Move a swirl or star in the sky | `components/starry-sky.tsx` → `VORTICES`, `STARS` |
| Change the texture strength | `styles/globals.css` → `body::after` `opacity` |
| Change the section order on the home page | `app/(home)/page.tsx` |
| Change the menu links | `components/navbar.tsx` → `MENU_LINKS` |
| Change the fonts | `app/layout.tsx` (Josefin Sans, Anton, JetBrains Mono) |

## Commands

Run all of these from inside `ross-classic`:

| Command | What it does |
|---|---|
| `npm run dev` | Development server at http://localhost:3240, updates as you save, admin enabled |
| `npx tsc --noEmit` | Type check: points to the line if an edit broke something |
| `npm run lint` | Code style checks |
| `npm run build` then `npm start` | Production build, as Vercel will run it (admin disabled) |
