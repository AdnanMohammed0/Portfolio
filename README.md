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
- **Mobile** — the hero is re-composed rather than shrunk, and an **Enable AR**
  button offers optional hand tracking.
- **AR** — on mobile, hand tracking **starts automatically** once the hero is on
  screen (`autoStartAr` in `Hero.tsx`); it is never auto-started on desktop.
  The browser still shows its own camera permission prompt — no site can skip
  that — so this moves the prompt to page load rather than removing it. Camera
  and MediaPipe are dynamically imported and only fetched when AR actually
  starts. `Exit AR` releases the stream, the tracker and the animation loop.
  Denial or an unsupported device shows a message, offers `Retry AR`, and leaves
  the normal 3D hand running.

  To go back to tap-to-start (the more privacy-conservative default), drop the
  `autoStartAr` prop in `src/sections/Hero.tsx`.
- **Reduced motion** — the entrance and wave are skipped and tracking is damped
  down; the site stays fully usable.

The shipped GLB has no skeleton, so `roboticRig.ts` builds one from its rigid
parts at load time. See `public/assets/hand/README.md` for how to replace the
model.

Nothing about the 3D system is in the initial bundle: three.js loads on demand,
rendering pauses when the hero scrolls away or the tab is hidden, and MediaPipe
is only fetched if AR is switched on.

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

`npm run build` emits a static bundle in `dist/`. Any static host works
(Vercel, Netlify, Cloudflare Pages).

Two things to configure:

- **SPA rewrites** — `/work/:slug` and `/admin/*` are client routes, so all
  paths must fall back to `index.html`.
- **Environment variables** — set `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY` in the host's dashboard. Only ever the anon key; the
  service role key must never reach the browser.
