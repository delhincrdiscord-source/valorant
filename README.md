# Valorant 2v2 Skirmish — Tournament Site

A full-stack Next.js site for running a community **2v2 Valorant TDM skirmish**.
Players **register as a duo** through a public form (both players' details in
one submission); teams are seeded into a **double-elimination** bracket and
organizers report scores as matches finish. No player login — just a duo
registration form and a password-protected organizer dashboard.

- **Register with your duo** — one form, both players; duplicate re-registration
  is blocked by Riot ID / Discord ID
- **Double-elimination bracket** (winners + losers + grand final with reset)
- **Live public pages** for players, teams, and the bracket — each gated by a
  publish toggle the organizer controls
- **One admin password**, no player accounts
- **Rate-limited registration** (DB-backed) to stop spam

---

## Tech stack

| Concern        | Choice                                              |
| -------------- | --------------------------------------------------- |
| Framework      | Next.js 15 (App Router) + React 19 + TypeScript     |
| Styling        | Tailwind CSS v4 (dark, Valorant-themed)             |
| Database       | PostgreSQL — [Neon](https://neon.tech) (free tier)  |
| ORM            | Prisma 6                                            |
| Validation     | Zod + React Hook Form                               |
| Admin auth     | iron-session (signed, httpOnly cookie)              |
| Bracket engine | `brackets-manager` (logic) + `brackets-viewer` (UI) |
| Tests          | Vitest (pairing + bracket logic)                    |

---

## Local development

### 1. Prerequisites

- Node.js 18.18+ (20+ recommended)
- A free Postgres database. Create one at **[neon.tech](https://neon.tech)** and
  copy the **pooled** connection string.

### 2. Install

```bash
npm install
```

> `postinstall` copies the `brackets-viewer` browser bundle into
> `public/vendor/` — that dir is generated, don't commit it.

### 3. Configure environment

Copy the example and fill in real values:

```bash
cp .env.example .env
```

| Variable         | What it is                                                          |
| ---------------- | ------------------------------------------------------------------- |
| `DATABASE_URL`   | Neon **pooled** connection string (`...-pooler...`, `sslmode=require`) |
| `ADMIN_PASSWORD` | Password for `/admin`. **Change it — don't ship the placeholder.**  |
| `SESSION_SECRET` | ≥32-char random hex for cookie encryption                           |
| `DISCORD_REGISTRATION_WEBHOOK_URL` | Webhook for new-registration pings (optional) |
| `DISCORD_BRACKET_WEBHOOK_URL` | Webhook that receives a PNG of the generated bracket (optional) |

Generate a strong session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Create the database schema + seed

For a fresh, single-event database the simplest path is `db push` (creates the
tables directly from `schema.prisma`, no migration history needed):

```bash
npm run db:push     # create tables
npm run db:seed     # create the singleton Setting + Tournament rows
```

<details>
<summary>Prefer versioned migrations? (production-grade alternative)</summary>

```bash
npm run db:migrate -- --name init   # generates prisma/migrations/ and applies it
npm run db:seed
```

Commit the generated `prisma/migrations/` folder, then have Vercel run
`prisma migrate deploy` on deploy (see the note in the deploy section).
</details>

### 5. Run

```bash
npm run dev
```

Open <http://localhost:3000>. The organizer dashboard is at `/admin`.

### Useful scripts

| Command              | Purpose                                        |
| -------------------- | ---------------------------------------------- |
| `npm run dev`        | Start the dev server                           |
| `npm run build`      | Production build                               |
| `npm test`           | Run the Vitest suite (pairing + bracket logic) |
| `npm run db:studio`  | Open Prisma Studio to inspect/edit data        |
| `npm run db:push`    | Sync schema → database                         |
| `npm run db:seed`    | Seed the singleton settings + tournament rows  |
| `npm run db:seed:players` | Insert 12 sample players to try pairing/bracket |
| `npm run db:reset`   | Wipe players/teams/bracket back to a clean slate |

---

## Running an event (organizer runbook)

1. **Open registration** — the `Registration open` toggle on `/admin`. Duos
   sign up at `/` (both players fill in their own details; a team is created
   immediately).
2. **Close registration** when you're ready to lock the field.
3. **Publish pairings** (optional) so teams show on the public `/players` page.
4. **Generate bracket** — seeds the teams into a double-elimination bracket.
   This **locks the teams**.
5. **Publish bracket** so it appears on the public `/bracket` page.
6. **Report scores** as matches finish — winners advance, losers drop to the
   losers bracket, and the grand final (with reset) resolves automatically.
   Matches are **BO3** (first to 2 games) and the grand final is **BO5** (first
   to 3). Mistyped a score? Use **Undo** on that match.
7. The **champion** is shown at the top of `/bracket` once the final resolves.

---

## Deploying to Vercel

1. Push this repo to GitHub/GitLab and **import it into Vercel**. Next.js is
   auto-detected — no config needed.
2. Create your production database at **[neon.tech](https://neon.tech)**.
3. In **Vercel → Project → Settings → Environment Variables**, add (for all
   environments):
   - `DATABASE_URL` — Neon **pooled** string
   - `ADMIN_PASSWORD` — a strong password
   - `SESSION_SECRET` — a fresh ≥32-char hex secret (see command above)
4. **Initialize the production database once.** With your `.env` pointed at the
   **production** `DATABASE_URL`, run locally:

   ```bash
   npm run db:push
   npm run db:seed
   ```

5. **Deploy.** Vercel runs `npm install` (which vendors the bracket viewer via
   `postinstall`) then `npm run build`. Done.

> **Using migrations instead of `db push`?** Commit `prisma/migrations/` and set
> the Vercel **Build Command** to
> `prisma generate && prisma migrate deploy && next build` so schema changes
> apply on each deploy.

### Security checklist before going live

- [ ] `ADMIN_PASSWORD` is strong and **not** the placeholder
- [ ] `SESSION_SECRET` is freshly generated (don't reuse the example)
- [ ] `.env` is **not** committed (it's already gitignored)
- [ ] `DATABASE_URL` uses the **pooled** Neon endpoint (serverless-friendly)

---

## Project structure

```
src/
  app/
    page.tsx              # landing + duo registration form
    players/page.tsx      # public roster / published teams
    bracket/page.tsx      # public double-elim bracket (gated by publish toggle)
    admin/                # organizer dashboard (auth-gated) + login
    api/                  # register, players, and /api/admin/* route handlers
  components/
    RegistrationForm.tsx
    BracketView.tsx       # loads the vendored brackets-viewer bundle
    admin/                # dashboard controls, player table, score reporter
  lib/
    validation.ts         # Zod duo-registration schema (client + server)  ← unit-tested
    bracket.ts            # brackets-manager wrapper + JSON persistence  ← unit-tested
    rate-limit.ts         # DB-backed rate limiter (registration spam protection)
    prisma.ts, settings.ts, session.ts, constants.ts
  middleware.ts           # guards /admin and /api/admin
prisma/
  schema.prisma           # Player, Team, Setting, Tournament, RateLimit
  seed.ts                 # seeds the singleton Setting + Tournament rows
scripts/
  vendor-brackets-viewer.mjs   # copies the viewer bundle into public/vendor
```

## Anti-spam & security notes

- **Rate limiting** — `/api/register` is limited per IP (**3 teams / 15 min**)
  and per Discord ID / Riot ID (**1 / hour**), enforced with a DB-backed
  sliding window (`lib/rate-limit.ts`, `RateLimit` table) so it works across
  serverless instances.
- **Case-insensitive duplicate blocking** — Valorant IDs are case-insensitive,
  but Postgres `@unique` isn't. Players store a lowercased `riotIdKey` so
  re-registering `Phoenix#NA1` as `phoenix#na1` is still caught.
- **Honeypot field** — a hidden `website` input; bots that fill it get a fake
  success response.
- **Validation is server-side** (Zod) — the form is just UX; the API re-checks
  everything, including that player1 ≠ player2.
- **Known limitation** — the form can't cryptographically prove player 2 is who
  they claim to be (that would need Discord OAuth). Duplicates are blocked, but
  a malicious submitter could enter someone else's ID once.

---

## How the bracket is stored

`brackets-manager` runs against an in-memory database; after each change the
full dataset is dumped to the `Tournament.data` JSONB column. Every mutation is:
**load JSON → hydrate → apply update → dump → save**. This keeps the well-tested
bracket engine and Postgres cleanly separated, with no custom storage adapter.

---

_Not affiliated with or endorsed by Riot Games._
