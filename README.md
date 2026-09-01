# Premium Portfolio

A personal portfolio for an AI engineer: a dark editorial public site with an
interactive 3D hand in the hero, and a protected admin dashboard that manages
every piece of content on it.

Nothing on the public site is hard-coded. Projects, media, copy, skills,
experience, contact details and SEO all come from the database and are edited
from `/admin`.

---

## Quick start

```bash
npm install
```

```bash
npm run dev
```

The site runs immediately on a **local demo content store** so you can look at
it before connecting a backend. The dashboard shows a persistent warning while
that store is active — it keeps content in the browser only, and uploads do not
persist. Connect Supabase for real persistence.

---

## Connecting Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env.local` and fill in:

   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. In the Supabase SQL editor, run `supabase/schema.sql`, then
   `supabase/seed.sql`.
4. Create your account under **Authentication → Users → Add user**.
5. Grant it admin rights — the commented statement at the bottom of `seed.sql`:

   ```sql
   insert into public.admin_users (user_id, email)
   select id, email from auth.users where email = 'you@example.com';
   ```

6. Restart the dev server. `/admin` now requires a real sign-in.

### Security model

Authorisation lives in the database, not the client. Membership of
`admin_users` is what grants write access, and every table's row-level security
policy checks it through the `is_admin()` function. The route guard in
`RequireAdmin.tsx` is a UX gate on top of that — bypassing it in the browser
still gets every write rejected by Postgres.

Public visitors can read published projects and site content, and insert a
contact message. Nothing else.

---

## The hero hand

The hand's lifecycle is `LOAD → HELLO/WAVE → SMOOTH TRANSITION → INTERACTION`,
run by `handController.ts`. The greeting never hard-stops: the pose it ends on
is captured and interpolated into pointer tracking, so there is no jump.

- **Desktop** — the hand follows the pointer with damped, spring-like motion,
  normalised against the hero rather than the window so it stays composed at
  screen edges.
- **Mobile** — the hero is re-composed rather than shrunk, and the hand follows
  **how the phone is tilted**, via `DeviceOrientationEvent`. Tilt is normalised
  to the same `[-1, 1]` range the mouse produces, so it feeds the identical code
  path and inherits the springs, banking and finger ripple.

  There is **no camera and no permission prompt** on Android — the hand simply
  responds to the device. iOS gates motion access behind a user gesture, so
  there a single "Move with my phone" button appears; everywhere else nothing is
  shown. The first reading becomes the neutral position, so the hand is centred
  however the visitor happens to be holding the phone, and the neutral point
  drifts slowly to follow a change of posture.
- **Reduced motion** — the entrance and wave are skipped and tracking is damped
  down; the site stays fully usable.

The shipped GLB has no skeleton, so `roboticRig.ts` builds one from its rigid
parts at load time. See `public/assets/hand/README.md` for how to replace the
model.

Nothing about the 3D system is in the initial bundle: three.js loads on demand,
and rendering pauses when the hero scrolls away or the tab is hidden.

---

## Project structure

```
src/
  components/       Navbar, Footer, SEO, shared primitives
    hand/           InteractiveHand, scene, controller, rigs, AR
  sections/         Hero, About, Works, Skills, Experience, Contact
  pages/            Home, project detail
  admin/            Dashboard, editors, media manager, auth guard
  hooks/            Content store, auth, reveal, media queries
  services/         Content providers (Supabase + local) behind one interface
  lib/              Supabase client, utilities
  types/            Shared domain types
supabase/           schema.sql, seed.sql
public/assets/hand/ The hand model
```

### Content layer

`services/content.ts` picks a provider at startup — Supabase when credentials
exist, the local demo store otherwise — and both satisfy the same
`ContentProvider` interface. The public site and the dashboard read and write
through it, so they can never disagree about what the content is.

---

## Testing on a phone

`npm run dev` binds to the local network, so the site is reachable at
`http://<your-ip>:5183` — no certificate needed. The hand's tilt control uses
`DeviceOrientationEvent`, which plain HTTP serves fine on Android.

iOS restricts motion access to secure origins, so for iPhone testing run
`npm run dev` in one terminal and `npm run tunnel` in another, and open the
`https://….loca.lt` URL it prints. `npm run dev:https` is also available, but a
self-signed certificate is not enough for iOS.

## Scripts

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm run lint
```

---

## Deploying

`npm run build` emits a static bundle in `dist/`. Any static host works.

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Output directory | `dist` |
| Deploy command | leave empty on Pages/Vercel/Netlify. Cloudflare **Workers Builds**: `npx wrangler deploy --keep-vars` |
| Install command | `npm ci` (or leave the default) |
| Node version | 20 or newer |

**Environment variables** — set these in the host's dashboard, or the deployed
site silently falls back to the in-browser demo store:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon / publishable key>
```

Only ever the anon key. The service-role key must never reach the browser — it
bypasses row-level security entirely.

**SPA rewrites** are already configured: `/work/:slug` and `/admin/*` are
client-side routes, so every path has to fall back to `index.html`. Without
this, those URLs 404 on refresh or when opened directly.

| Host | Handled by |
| --- | --- |
| Cloudflare Workers | `wrangler.jsonc` → `assets.not_found_handling` |
| Vercel | `vercel.json` |
| Cloudflare Pages, Netlify | needs a `public/_redirects` file — see below |

**Do not add `public/_redirects` while deploying to Workers.** Workers reads
that file as well and rejects the SPA rule, because `not_found_handling`
already covers it:

```
Invalid _redirects configuration:
Line 1: Infinite loop detected in this rule. [code: 100324]
```

If you move to Netlify or Cloudflare Pages, create it then:

```
/*    /index.html   200
```

### Cloudflare Workers

`wrangler.jsonc` declares a static site with no Worker script. Its presence
also stops `wrangler deploy` from running framework auto-detection, which
requires Vite 6+ and otherwise fails the build with:

```
The version of Vite used in the project ("5.4.21") cannot be automatically
configured. Please update the Vite version to at least "6.0.0".
```

`--keep-vars` matters: without it `wrangler deploy` overwrites the Worker's
remote configuration with the local file, which deletes every environment
variable set in the dashboard. The build itself still succeeds — Vite bakes
`VITE_*` values in at build time — so the loss is silent until something later
needs them.

Validate a deploy without shipping it:

```bash
npx wrangler deploy --dry-run
```
