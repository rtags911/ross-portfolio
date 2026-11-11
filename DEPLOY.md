# Deploying to Vercel with MongoDB

Plan for moving `ross-classic` from "content in files, admin on your computer" to
"content in MongoDB, admin on the live site behind a password, uploads in Vercel Blob".
**Nothing here is built yet.** It needs two packages (`mongodb`, `@vercel/blob`); say the word and it gets implemented.

---

## 1. How the pieces talk

```
Visitor ──► Vercel (Next.js) ──reads──► MongoDB Atlas  (your text content)
                 │                       ▲
                 │                       └─writes── /admin  (you, logged in)
                 └──► Vercel Blob  (uploaded screenshots, icons, resume)
```

- **Vercel** runs the site. It connects to MongoDB using a connection string you paste into its settings.
- **MongoDB Atlas** stores your profile, projects, experience and stack.
- **Vercel Blob** stores files you upload from `/admin`. Vercel's own disk is read-only, so uploads can't go into `public/` on the live site.
- **Pages stay fast.** Pages are cached. When you save in `/admin`, the cache is cleared and the site shows the change within seconds, with no redeploy.

---

## 2. What to put in MongoDB

**One database, two collections.** That's all a portfolio needs.

### Database: `portfolio`

#### Collection `content`: 4 documents, one per section
Each document holds exactly what `src/content/<name>.json` holds today. The admin form and the validation rules stay the same.

```js
{ _id: "profile",    data: { name: "Ross Tagiobon", alias: "ROSS", ... }, updatedAt: ISODate() }
{ _id: "projects",   data: [ { slug: "project-1", name: "Project 1", ... } ], updatedAt: ISODate() }
{ _id: "experience", data: [ { title: "...", company: "...", ... } ], updatedAt: ISODate() }
{ _id: "stack",      data: [ { type: "frontend", items: [ ... ] } ], updatedAt: ISODate() }
```

You **don't create these by hand**. A seed script (`npm run seed`) copies your current `src/content/*.json` into them once. After that, `/admin` edits them.

> Why not one collection per thing, like the original (`projects`, `stacks`, `experiences`, `users`, `blogs`, `resumes`)? You'll have tens of items, not thousands. One document per section means a single read per page, a single atomic save, and no schema migrations.

#### Collection `login_attempts`: slows down password guessing
```js
{ _id: "<visitor IP>", count: 3, expiresAt: ISODate("+15 min") }
```
- **TTL index:** `db.login_attempts.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })` (the seed script creates it). Each record deletes itself after 15 minutes.
- **Why it's in MongoDB:** Vercel runs many short-lived copies of your site, so a counter kept in memory wouldn't be shared between them. The original had this weakness.

**No users collection.** There's one admin (you), and the password lives in Vercel's settings, not in the database. That also means no bcrypt, no JWT refresh tokens and no reset emails (the original needed Resend for those).

---

## 3. Set up MongoDB Atlas (free)

1. **Create the cluster:** sign up at mongodb.com/atlas, then **Create cluster → M0 (Free)**. Pick a region close to your Vercel function region. Vercel's default is Washington D.C. (`iad1`), so **AWS us-east-1** is a good match. You can change the Vercel region later under Settings → Functions.
2. **Add a database user:** **Security → Database Access → Add New Database User**.
   - Username: `portfolio-app`, password: **Autogenerate** (copy it now).
   - Privileges: **Specific privileges → `readWrite` on database `portfolio`**. Avoid "Atlas admin", so a leaked password can only touch this one database.
3. **Allow connections:** **Security → Network Access → Add IP Address → `0.0.0.0/0`** ("Allow access from anywhere").
   - Vercel's IP addresses change, so a fixed list won't work.
   - The database user's password becomes the lock, so keep it long and secret.
   - *Alternative:* the **MongoDB Atlas integration** on the Vercel Marketplace sets this up and adds `MONGODB_URI` for you.
4. **Get the connection string:** **Connect → Drivers → Node.js**. Copy the string and put your password into it:
   ```
   mongodb+srv://portfolio-app:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority&appName=portfolio
   ```
   If the password has symbols like `@ : / ?`, URL-encode them, or regenerate a letters-and-numbers-only password.

---

## 4. What to put in Vercel

### Import the project
**Add New → Project →** pick your GitHub repo.
- If the repo is the whole studio, set **Root Directory = `ross-classic`**.
- **Framework:** Next.js (auto-detected). Leave the build and install commands as they are.

### Create the Blob store
**Storage → Create → Blob →** name it `portfolio-uploads` **→ Connect to project**. This adds `BLOB_READ_WRITE_TOKEN` automatically.

### Environment variables
**Settings → Environment Variables:**

| Name | Value | Environments |
|---|---|---|
| `MONGODB_URI` | the connection string from step 3.4 | Production (+ Development for local) |
| `MONGODB_DB` | `portfolio` | Production, Development |
| `ADMIN_PASSWORD` | a long password only you know (20+ characters) | **Production only** |
| `SESSION_SECRET` | 64 random hex characters (see below) | Production, Development |
| `BLOB_READ_WRITE_TOKEN` | added automatically by the Blob store | (automatic) |
| `SITE_URL` | `https://your-domain` | Production |

To make a `SESSION_SECRET`, run this once and paste the output:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Keep previews away from your real data.** Vercel builds a *preview* site for every branch push. If previews get `MONGODB_URI` and `ADMIN_PASSWORD`, anyone with a preview link could reach a login screen for your real data. Set `ADMIN_PASSWORD` for **Production only**. Without it, the admin login refuses everyone.

### For your computer
**Pull the same values into `.env.local`.** It's already git-ignored, so it never gets committed. Run these from inside `ross-classic`:
```bash
npm i -g vercel
```
```bash
vercel link
```
```bash
vercel env pull .env.local
```
Then add `ADMIN_PASSWORD=...` to `.env.local` by hand, since it's production-only on Vercel.

---

## 5. The code changes (when you approve the packages)

| File | Change |
|---|---|
| `package.json` | **Add packages:** `mongodb`, `@vercel/blob`. **Add script:** `"seed": "node --env-file=.env.local scripts/seed.mjs"`. |
| `src/lib/db.ts` *(new)* | **One shared MongoDB connection.** Cached on `globalThis` so hot reload and warm serverless functions reuse it. Throws a clear error if `MONGODB_URI` is missing. Adapted from the original's `lib/db.ts`, with the driver instead of mongoose. |
| `src/lib/content-store.ts` *(new)* | **`getContent(kind)`** reads the `content` document, cached with tag `content`. If the document is missing, it falls back to the JSON file, so a fresh deploy never shows a blank site. **`saveContent(kind, data)`** writes it, then `revalidateTag("content")`. |
| `src/lib/session.ts` *(new)* | **Signed login cookie.** HMAC-SHA256 with `SESSION_SECRET`, using Node's built-in `crypto` (no package). 7-day expiry, `httpOnly`, `secure`, `sameSite: strict`. **Password check:** `timingSafeEqual` on SHA-256 digests, so guessing timing reveals nothing. |
| `src/app/admin/login/` *(new)* | **The login page and its server action.** Checks `login_attempts`: after 5 failures from one IP in 15 minutes, it locks that IP out. |
| `src/proxy.ts` *(new; Next 16's middleware)* | **Guards `/admin/*` and `/api/admin/*`.** No valid cookie sends you to `/admin/login`. |
| `src/app/admin/actions.ts` | **Writes to MongoDB instead of files.** The "dev only" check becomes "must be logged in". It checks the session again itself, because server actions shouldn't rely on the proxy alone. Validation stays as it is. |
| `src/app/api/admin/upload/route.ts` | **Uploads go to Blob,** via `put("projects/<name>.png", file, { access: "public", addRandomSuffix: true })`, and the route returns the Blob URL. It requires a login. Type and size checks stay. |
| `src/lib/admin-validate.ts` | **Accepts Blob URLs.** Image and resume fields may be a local `/images/...` path *or* `https://<id>.public.blob.vercel-storage.com/...`. Nothing else. |
| `src/app/resume.pdf/route.ts` *(new)* | **Same-origin resume link.** It streams the resume from its Blob URL with `Content-Disposition: attachment`. A `download` link only works for same-origin files, so this keeps the menu's Resume link downloading. **Delete** `public/resume.pdf` so this route takes over. |
| Content readers | **Load content on the server and pass it down.** `(home)/layout.tsx` and `(project)/layout.tsx` load all four sections with `getContent` and pass them into a small `ContentProvider` (React context). The hooks in `use-content.ts` and `useProfile()` read that context, so `banner`, `about-me`, `footer`, `preloader` and `signature` change one import line each. The root layout metadata and `opengraph-image.tsx` call `getContent("profile")` directly. This also puts your projects into the HTML that Google sees, which the current client-only hooks don't. |
| `next.config.ts` | **Remove** the production `/admin` → 404 rewrite (the admin is meant to be live now). **Add** `*.public.blob.vercel-storage.com` to `images.remotePatterns`. |
| `scripts/seed.mjs` *(new)* | **One-time import.** Upserts each `src/content/*.json` into `content` and creates the TTL index. Run it once: `npm run seed`. It's safe to re-run, but it **overwrites** the database with the files. |

**Unchanged:** the admin form and tabs, the Starry Night sky, and every page's look. Images already in `public/images/` keep working; only *new* uploads go to Blob.

---

## 6. Order to go live

1. Atlas: cluster, user, network access, connection string (section 3).
2. Code changes from section 5, then test locally with `.env.local` filled in.
3. `npm run seed` copies your content into MongoDB.
4. Push to GitHub, then on Vercel: import, create the Blob store, add the env vars, deploy (section 4).
5. Visit `https://your-domain/admin`, log in, edit something, and check that it appears on the site.
6. Add your domain under **Settings → Domains** and set `SITE_URL` to it.

## 7. Keep it safe
- **Never commit `.env.local`** (it's already in `.gitignore`), and never paste the connection string into code.
- **If a secret leaks:**
  - **Atlas password:** reset it in Atlas, then update `MONGODB_URI` in Vercel and redeploy.
  - **`SESSION_SECRET`:** change it in Vercel and redeploy. That logs out every session.
  - **`ADMIN_PASSWORD`:** change it in Vercel and redeploy.
- **Back up occasionally.** Free M0 clusters have no automatic backups. Export the `content` collection from Atlas (**Collections → Export**), or keep the JSON files up to date as your backup.

## 8. Cost
Atlas M0, Vercel Hobby and Vercel Blob all have free tiers that cover a personal portfolio. Vercel Hobby is for non-commercial use, so check the current limits on each pricing page before relying on them.
