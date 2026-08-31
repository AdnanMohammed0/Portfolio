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

## Testing on a phone

`npm run dev` binds to the local network, so the site is reachable at
`http://<your-ip>:5183`. That is enough for everything except AR.

AR calls `getUserMedia`, which browsers only allow in a **secure context**:

| How you open it | AR works? |
| --- | --- |
| `http://localhost:5183` | Yes — localhost is always treated as secure |
| `http://192.168.x.x:5183` | No — plain HTTP on a LAN address is not secure |
| `npm run dev:https` → `https://192.168.x.x:5183` | Android Chrome yes, after accepting the certificate warning. **iOS Safari no** — it refuses the camera behind an untrusted certificate |
| `npm run tunnel` → `https://….loca.lt` | Yes, everywhere — the certificate is genuine |

So for iPhone testing, run `npm run dev` in one terminal and `npm run tunnel`
in another, and open the tunnel URL.

When AR cannot start, the hero says why rather than failing silently, and the
normal 3D hand keeps running either way.

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
| Deploy command | leave empty (Cloudflare **Workers** only: `npx wrangler deploy`) |
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
client-side routes, so every path has to fall back to `index.html`.
`public/_redirects` covers Netlify and Cloudflare Pages, `vercel.json` covers
Vercel. Without them those URLs 404 on refresh.
