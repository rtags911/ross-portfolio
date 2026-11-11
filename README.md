# Ross Tagiobon — portfolio (classic layout, Starry Night)

> How the code is organised: [STRUCTURE.md](STRUCTURE.md). Site shows 404? See "Opening the site" there.

A 1:1 copy of the nevo.dev portfolio design (MIT, © Ahmed Abdelhafiez, see LICENSE) with the same layout, preloader, GSAP animations, cursor and starfield, in the **Cairo night** palette.
The MongoDB backend, admin panel, auth and blog are removed. **All content lives in plain files**, so there's nothing to log into and no API keys.

- Dev: `npm run dev` → http://localhost:3240 (or `npx bun run dev`)
- Production check: `npm run build` then `npm start` → http://localhost:3240

## Admin panel (local only)

Edit everything from a form instead of the files:

1. In the project folder, run `npm run dev`.
2. Open **http://localhost:3240/admin** and enter your admin password (see "Admin password" below).
3. Pick a tab (**Profile, Projects, Experience, Stack**), make changes, and press **Save changes**.

What it can do:
- **Profile:** name, alias, links, hero and about text. **Resume:** upload a PDF; it replaces `public/resume.pdf` straight away.
- **Projects:** add, edit, delete, reorder (↑ ↓), and show or hide each one. Upload a screenshot per project.
- **Experience:** add, edit, delete, reorder, show or hide jobs.
- **Stack:** groups and tools, with icon uploads (PNG, JPG or WebP).

How it works:
- **Saving:** the admin writes `src/content/*.json` and uploads files to `public/`. The site updates as soon as you save. To publish, commit and push, the same as any other edit.
- **Hand-editing still works:** you can edit the JSON files directly; the admin just reads and writes the same files.
- **Checks:** every save is validated. The URL names must be unique, links must start with `https://`, and the email must look like an email. If something is wrong, you get a message and nothing is written.
- **Only on your computer.** On the live site `/admin` returns a real 404 (a rewrite in `next.config.ts`), and the save and upload code refuses to run, because a deployed site can't write files. There's no login because there's nothing online to log in to.
- **Self-check for the validation rules:** `node --experimental-strip-types src/lib/admin-validate.check.ts`.

### Turning the login on and off
- **Currently OFF:** `.env.local` has `ADMIN_AUTH=off`, so `/admin` opens without a password (an amber "login off" badge shows in the header).
- **To turn it back ON:** change that line to `ADMIN_AUTH=on` (or delete it), save, and restart `npm run dev`. Your password is still in `.env.local`.
- **Even with the login off, the admin stays private:**
  - `npm run dev` only listens on this computer (`127.0.0.1`), so other devices on your Wi-Fi or VPN can't open it.
  - Saves and uploads are only accepted from a page on this computer. Other websites can't post to it, including the "null origin" and DNS-rebinding tricks.
  - On the live site the admin doesn't exist (404).

### Admin password
- **Where it lives:** `ADMIN_PASSWORD` in `.env.local` in the project folder. A random one was generated for you; open the file to see it.
- **To change it:** edit that line (8+ characters), save, then restart `npm run dev`. Changing it logs out every open admin session.
- `.env.local` is git-ignored, so the password is never committed. `.env.example` shows the format and is safe to commit.
- **Staying logged in:** you stay logged in for 7 days in that browser. **Log out** is in the admin header.
- **No password set:** nobody can log in, and the login page tells you what to add.
- **Every way in is checked:** the save button and the image/resume upload each check the login themselves, not just the page.

**Want an emailed code instead of a password?** That needs an email-sending service. For example:
1. Create a free account at resend.com, verify your sending email or domain, and copy an API key.
2. Install the package (`npm i resend`) and add `RESEND_API_KEY=...` and `ADMIN_EMAIL=you@example.com` to `.env.local`.
3. The login page would ask for "Send code", email a 6-digit code that expires in 10 minutes, then check it. Only a hash of the code is kept, and only 5 tries are allowed.

For an admin that only runs on your own computer, the password is enough. Email codes matter once the admin is on the live site.

Code: `src/app/admin/` (page, form, save action, `session.ts` for the login, `login/` for the login page), `src/app/api/admin/upload/route.ts` (uploads), `src/lib/admin-validate.ts` (rules).

## Edit your content

Everything is placeholder text right now. Fill in `src/content/profile.ts` first, then projects, experience and stack, and replace `public/resume.pdf`.


| You want to change… | Edit |
|---|---|
| Projects | `src/content/projects.json` |
| Tech stack (groups + icons) | `src/content/stack.json` (+ icons in `public/images/stack/`) |
| Experience | `src/content/experience.json` |
| Project screenshots | `public/images/projects/` |
| Resume | replace `public/resume.pdf` (same name) |
| **Your name, alias, hero text, about text, email, links, domain** | **`src/content/profile.json`**, or the admin panel (start here) |
| Colours | `src/styles/globals.css` → the `@theme` block at the top |

**Add a project:** copy a `{ … },` block in `projects.ts`, give it a new `_id` and `slug` (the same text works for both, e.g. `"my-app"`, which becomes the URL `/projects/my-app`), set `sortIndex` for its position (lower = earlier), put the screenshot in `public/images/projects/`, and point `thumbnail` at it.
**Hide something** without deleting it: set `hide: true`.
**Reorder:** change the `sortIndex` numbers.
**Add a stack item:** add `{ _id, name, icon: "/images/stack/x.webp", type, sortIndex, hide: false }` to a group's `items`. A new group is `{ type: "design", items: [...] }`.

If the build fails after an edit, it's usually a missing comma or quote. `npx tsc --noEmit` points to the line.

## Change the palette
The whole site reads four values in `src/styles/globals.css`:
```css
--color-primary: #e3a33a;      /* accent: headings, buttons, links */
--color-primary-dark: #4a3412; /* preloader wipe */
--color-black: #0d1014;        /* page background */
--color-white: #e9e5da;        /* text */
```
Every `text-white/80`, `bg-black`, `bg-primary` class in the components follows them.

## Starry Night background
- `src/components/starry-sky.tsx` paints the sky once onto a canvas: short brushstrokes that follow swirling currents (`VORTICES`), halo stars (`STARS`) and a crescent moon (`MOON`). All positions are fractions of the screen (0 to 1), so you can move a swirl or a star by changing its `x`/`y`. `BLUES`/`GOLDS` are the paint colours; the "veil" at the end of `paint()` darkens it for readable text.
- The small twinkling stars on top are still `particle-background.tsx`.
- The canvas texture over the whole site is `body::after` at the bottom of `globals.css`. Raise or lower its `opacity` (0.16) to taste.
- With "reduce motion" on, the glow pulse and scroll drift switch off; the painting stays.

## Security
What's in place:
- **Security headers on every page:**
  - a Content Security Policy (only this site's own scripts, styles, images and fonts)
  - no framing by other sites (`X-Frame-Options`)
  - no type-guessing (`nosniff`)
  - HTTPS-only (`Strict-Transport-Security`)
  - a strict referrer policy and window isolation (`Cross-Origin-Opener-Policy`)
  - camera, microphone and location turned off
- **Admin:** it's local-only, optionally password-protected (see above), and limited to this computer. Every save is validated. Uploads must really be PNG, JPG, WebP or PDF (checked by the file's first bytes, not just its name), with size limits and cleaned file names.
- **Secrets:** they live only in `.env.local`, which is git-ignored.
- **Self-check for the admin's rules:** `node --experimental-strip-types src/lib/admin-validate.check.ts`.

Check regularly:
- **Dependencies:** `npx bun audit` lists known vulnerabilities. Next.js 16.0.10 has published fixes up to **16.2.11+**; upgrade before going live.
- **Before deploying:** make sure `.env.local` isn't committed (`git status` shouldn't list it).

## Deploy

Planning to use MongoDB with a live, password-protected admin? See [DEPLOY.md](DEPLOY.md).

Push to GitHub → import on Vercel → Deploy. Optionally set the `SITE_URL` env var to your domain for the sitemap. Add your domain under Settings → Domains.

The link-preview image (`src/app/opengraph-image.tsx`) is generated from `profile.ts`, so there is nothing to redraw.

## What changed from the original
- `src/hooks/use-content.ts` replaces the API hooks: same TanStack Query interface, so the components and their animations are unchanged.
- Removed: `app/(admin)`, `app/(blog)`, `app/(embed)`, `app/api`, `app/auth`, `features/`, `models/`, `definitions/`, plus the DB, JWT, Cloudinary and email code and their packages.
- The "My Blog" hero button now opens the resume; the menu's Blog link is gone; Resume links to `/resume.pdf`.

## Credit (keep this)
The design and most of the component code come from [nevo.dev](https://github.com/iknevo/nevo.dev) by Ahmed Abdelhafiez, under the MIT licence. Keep the `LICENSE` file. The footer also carries a one-line credit; the licence only requires the LICENSE file, but keeping the credit is the honest choice for a portfolio.
