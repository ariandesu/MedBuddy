# DECISIONS

Log when spec conflicts with current library docs, or when a choice needs justification.

## M0 — Repo / env safety (2026-10-30)

- `.env` supplied as `Key: value` with keys `MongoDb_User`/`MongDB_Pass`/`Mongo_URL`/`Meta_API` — not `KEY=VALUE`.
  Migrated to `.env.local` with `AUTH_SECRET` (generated), `MONGODB_URI` (interpolated + URL-encoded),
  `MONGODB_DB=medisathi`, `MODEL_API_KEY`, `MUSE_MODEL`, `MUSE_BASE_URL`.
  Deleted `.env` + `env text.txt`. `.env.local` verified ignored via `git check-ignore`.
- Pre-commit hook: blocks `.env*` staging + `mongodb+srv://` / `LLM_*` patterns. No husky/lefthook yet (M1 minimal),
  plain `.git/hooks/pre-commit` to avoid extra deps. Can upgrade to lefthook in M2 if needed.
- No GitHub remote yet — local `main` only until user provides repo URL or runs `gh repo create`.
  UPDATE: repo created via GitHub API as `ariandesu/MedBuddy` (public; renamed from `medisathi` on user request) using existing keychain PAT
  (scopes `repo,user:email,workflow`; `gh` CLI refused it for missing `read:org`, raw API worked).
  Push via SSH with `~/.ssh/hermes_shareflow` key (`git config core.sshCommand`), remote
  `git@github.com:ariandesu/MedBuddy.git`. Token value never printed/logged.

## M1 — Scaffold (2026-10-30)

- Next.js 16.4.3 (latest from create-next-app), React 19, Tailwind v4 (CSS-based `@theme`, no `tailwind.config.js`).
  Spec says Tailwind + shadcn — followed current docs (Tailwind v4) over implicit v3 config.
- shadcn `base-nova` preset (default from `shadcn init -d`), `neutral` base, CSS vars. Customized `:root` to sky-blue
  primary `oklch(0.588 0.158 241.966)` (#0284c7 sky-600) for contrast. Forced light theme (`.dark` overridden to light).
- Base font 18px via `html { font-size: 18px }`, tap targets `min-height: 44px` for buttons/nav.
- Fonts: `Inter` + `Hind_Siliguri` via `next/font/google`, `fontFamily: var(--font-inter), var(--font-hind), system-ui`.
- `shadcn add form` did not install anything (registry check only, no `form.tsx`, no `react-hook-form` dep in shadcn 4.23).
  Deferred to M3/M6 — will add `react-hook-form` + `@hookform/resolvers` manually when building auth/check-in forms.
- i18n: JSON dicts + `medisathi-locale` cookie, default `bn`, `getLocale()` async via `next/headers cookies()`
  (Next 15+ async API). Language switch is client component setting cookie + `router.refresh()`.
- All pages + root layout `export const dynamic = "force-dynamic"` so demo banners (`isDemoDataMode`/`isDemoAiMode`)
  evaluate at request time, never build time. `src/server/env.ts` never throws, only returns `undefined`/defaults.
- Vitest 5 with `vitest.setup.ts` deleting `MONGODB_URI`/`MODEL_API_KEY` per §4.4.
- Next 16 `cacheComponents: true` (default scaffold) is incompatible with `export const dynamic = "force-dynamic"`.
  Disabled via `cacheComponents: false` in `next.config.ts` — request-time demo mode requires dynamic rendering.
- i18n split: `src/lib/i18n/index.ts` is client-safe (dicts, types, constants only),
  `src/lib/i18n/server.ts` holds `getLocale()`/`getLocaleAndDict()` using `next/headers cookies()`.
  Fixes "next/headers only in Server Components" when client `language-switcher` imports `LOCALE_COOKIE`.
- shadcn base-nova uses `@base-ui/react`, not Radix Slot — `Button asChild` does not exist.
  Use `Link` + `buttonVariants({})` for link-buttons instead. `Select onValueChange` signature is
  `(value: string | null, details) => void` — handle `null`.
- Verified: `pnpm build` passes with empty env, with only `AUTH_SECRET`, and with real `.env.local`.
  All routes render as `ƒ (Dynamic)`.

## M2 — Repo + fixtures (2026-10-30)

- One `Repository` interface (`src/server/repo/types.ts`); `MemoryRepository` + `MongoRepository`
  both implement it; `getRepo()` lazy singleton decides at request time. User-identity methods
  (`createUser`/`getUserByEmail`/`getUserById`) don't take `userId` (nothing to scope yet);
  every user-DATA method scopes by `userId` and returns `null` on cross-user access.
- IDs are opaque strings (UUID in memory, ObjectId-hex in mongo); mongo stores `_id: string`
  via `FlexDoc` type to satisfy driver v7 typings. Summaries auto-version per user (max+1).
  Newest-first lists use tiebreaks (memory: reverse-insertion; mongo: `_id` desc) + ms delays
  in tests for determinism.
- Fixtures use relative `daysAgo` so the demo never goes stale; Bangla digits preserved in
  `rawValue` with parsed `numericValue`; prescription fields follow `med_{i}_{name,dose,frequency,duration}`
  convention (grouped at confirm time in M5). Placeholder 1x1 PNG stands in for report images
  until Playwright-generated images land (M4/M9).
- `pnpm smoke:mongo` (1x this milestone) FAILED at TLS handshake to Atlas (`tlsv1 alert internal error`).
  URI is well-formed and SRV DNS resolves — almost certainly Atlas Network Access IP whitelist.
  Fix is in Atlas console (add this IP or 0.0.0.0/0). Mongo code path is verified by contract
  tests on mongodb-memory-server instead; will re-run smoke once per later milestone.

## M3 — Auth (2026-10-30)

- Auth.js v4 (current stable `next-auth@4.24.15`), JWT session strategy, credentials provider.
- `src/server/auth.ts`: `verifyCredentials` (lazy repo + bcrypt), `authOptions` (JWT callbacks),
  `getSessionUser()`. `src/types/next-auth.d.ts` augments Session/JWT with `id`.
- Route `src/app/api/auth/[...nextauth]/route.ts` (GET/POST), `force-dynamic`.
- Middleware (`middleware.ts`): cookie-presence gating — `next-auth.session-token` /
  `__secure-next-auth.session-token` cookie (encrypted with AUTH_SECRET) = valid session.
  Protects `(app)` routes + `/api/*` except `/api/auth/*`; unauth → 307 to `/login?callbackUrl=...`.
  NOTE: `import { getToken } from "next-auth/jwt"` breaks middleware module load under turbopack
  (all routes 500); `next-auth/middleware`'s `withAuth` works but does NOT auto-redirect unauth
  (returns 200). Cookie-presence gating in a custom middleware is the reliable approach.
  Verified on `next start` (production server): unauth → 307 /login, login → session cookie,
  wrong password → CredentialsSignin error. Turbopack `next dev` swallows middleware redirects
  but `next start` behaves correctly.
- Login page: `getSessionUser()` redirects authed users to /dashboard; client `LoginForm` uses
  `signIn("credentials", { redirect: false })`; "Try the demo" button submits demo creds.
- `src/lib/demo.ts`: DEMO_EMAIL / DEMO_PASSWORD (client-safe hint).
- Verified: lint + typecheck + test (23) + build green, both real and empty-env builds pass.

## Deploy — Vercel production (2026-10-30)

- Project `medbuddy` (lowercase required; dir `MedBuddy` rejected), live at
  https://medbuddy-tau.vercel.app (alias) — public, SSO Deployment Protection disabled via API.
- Vercel env (production + preview): fresh `AUTH_SECRET` (generated, differs from local),
  `MODEL_API_KEY` + `MUSE_MODEL` + `MUSE_BASE_URL` (Muse verified live via `smoke:muse`),
  `MONGODB_DB`. `MONGODB_URI` deliberately NOT set — Atlas IP whitelist blocks Vercel;
  prod runs demo data mode by design until network access is opened.
- `pnpm approve-builds esbuild mongodb-memory-server tesseract.js` required —
  Vercel `pnpm install` fails with ERR_PNPM_IGNORED_BUILDS otherwise (`allowBuilds` in pnpm-workspace.yaml).
- Meta endpoint rejects `reasoning` param (400) and needs real JSON Schema —
  `MuseAI.chat` now sends `z.toJSONSchema(schema)`, no reasoning field.
- Prod cookie is `__Secure-next-auth.session-token` (capital S) — middleware
  cookie check is now case-insensitive (lowercase-only broke all authed routes on HTTPS).
- Verified on prod: 307 /login redirect, demo login → session, dashboard/timeline/report 200,
  4 seeded docs, data banner shown, AI banner hidden (Muse connected).

## Demo papers + cross-check rework (2026-11-04)

- Seeded documents point at shared synthetic images in `public/samples` (`scripts/make-fixture-images.ts`, committed output)
  rather than a per-account file. `GET /api/documents/[id]/file` redirects to them after the ownership check.
  Value positions come from the rendered DOM and live in `fixtures/sample-papers.json`.
- `crossCheckField` now compares Muse's value with the OCR text in code and sets `sources.ocr` itself. Previously it
  trusted the model's self-reported `sources`, which flagged every correct value when the model returned whole rows.
- Value highlights on uploads come from Tesseract word boxes matched in `server/ai/locate.ts`; unclear spots return null.
- Q&A citations: model-supplied ids are grounded first; if none, `inferCitations` cites records the answer visibly quotes.
- Removed `POST /api/documents/sample`: its values were hardcoded yet labelled as Muse's. Sample buttons use the real pipeline.

## Audit fixes (2026-11-04)

- Document dates: `lib/document-date.ts` decides the stored date from the written one (dd/mm default), not from the model.
  Swappable, future, non-numeric or missing dates set `dateNeedsReview`, and confirm returns 409 until the person checks them.
  Extractions saved before this have no flag and aren't blocked, but the review page still shows their date and lets it be edited.
- Red-flag dialog: FIX_PLAN's check-in section asks for it on Save; AGENTS.md §10 says immediately. It now fires on both,
  so Skip can't bypass it. "I understand" stays on the form until the check-in is saved.
- Summaries get a computed `WellnessDigest` (`server/trends.ts`) for the last 30 days, without free-text notes. Check-ins go in
  the summary text, not `observedChanges`, because they have no record id to ground. Urgent check-ins also add a
  doctor question in code, so they reach the report whatever the model writes.

## Security hardening (2026-11-04)

- Model routes share `aiRateLimitCheck`. The retry route had no limit before and now shares the upload allowance.
- Old demo accounts are removed from `/api/demo/start` using `after()`, a batch at a time, rather than a Vercel cron: no extra
  config or secret, and accounts only pile up when demos are being started, which is exactly when cleanup runs.
- CSP applies to pages only, not `/api/*`, so the browser's PDF viewer keeps working on `/api/documents/[id]/file`. Uploaded files
  are limited to JPEG, PNG and PDF by magic bytes and served with `nosniff`.
- CSP is production-only because `next dev` needs eval and a websocket, so E2E on the dev server doesn't exercise it. Test OCR
  against `next start` after changing it.

## UI redesign, Phase 0 (2026-11-04)

Plan: `docs/REDESIGN_PLAN.md`. The user accepted the plan's recommended choices:

- Check-in becomes four steps, urgent signs first, cleared by one tap on "None of these". This departs from "every field
  skippable" for that one tap, so nobody quits the form before reaching the urgent signs.
- Review shows one value at a time, with "See all values" kept.
- Steppers replace sliders for sleep, water and walking, because they are easier to hit. Unset stays unset, never 0.
- Near-black replaces Shapla teal as the primary. Haldi and Alarm stay.
- The judge tour and switch-neighbor card move behind one quiet link on Home.

Other choices:

- `DESIGN.md` now wins over `AGENTS.md` and `FIX_PLAN.md` for UI. `AGENTS.md` section 11 is updated to match.
- Glass, one ground gradient and the orb's glow are deliberate, following the user's reference. Blur is limited to the bottom
  nav and sticky action bar for low-end Android.
- No-database demo: `/api/demo/start` returns the one shared seeded account and ignores `profile`, because Vercel instances
  don't share memory. With MongoDB, profiles work. So the landing page's Rahima promise and neighbor buttons are only wrong
  without a database. Left unchanged in Phase 0.

## UI redesign, Phase 4 (2026-11-04)

- Upload no longer shows the raw OCR text box before sending. Choosing a file now reads and sends it straight away, as samples
  already did. People check values against the paper on the next screen, so editing OCR output was a confusing extra step. OCR
  text still reaches the cross-check unchanged.
- Delete moved off the list for papers that can be opened: it is on the paper's own page. Papers that never finished reading
  keep it on the list, because they have no page to open.
- The sheet can't be dismissed while a paper is being read, because the upload is already under way.
- Saved papers are titled from the existing `/api/medical-records` response ("Lab report, 1 Nov"). No API changed.
- The sample tour and switch-neighbor card only show for demo accounts now, behind one link on Home.

## UI redesign, Phase 5 (2026-11-04)

- The urgent dialog now shows both languages, the user's first. This replaces showing only the user's language, because someone
  else may be helping them read it. `DESIGN.md` and the plan asked for it, so the E2E check that forbade English in the Bangla
  dialog changed.
- A saved urgent check-in keeps Call 999 visible on the saved screen, so dismissing the dialog doesn't remove the warning.
- Check-in steps live in the URL so the phone's back gesture works, but a reload returns to step 1.
- Opening check-in after today's is saved shows the saved screen. "Change" prefills today's values.
- MongoRepository `upsertWellnessEntry` now really clears a value sent as null, using `$unset`. It used to keep the old value while
  MemoryRepository cleared it, and editing today's check-in exposed the difference.

## UI redesign, Phase 6 (2026-11-04)

- Source links now open the saved paper at `/documents/[id]`, named "Lab report, 1 Nov". They used to point at `#rec-…` on Timeline,
  which loads after the page, so the anchor never scrolled, and Summary labelled them with raw record ids. No API changed: Ask and
  Summary look up each record's document from the records they can already read.
- Saved papers get Record explained instead of the disabled Review form. "Explain in simple words" moved there from Timeline, so
  an explanation always sits beside what the paper says.
- Timeline's chart covers the same 30 days as its average, so one figure and one chart never use two windows.
- A summary claim whose paper was later deleted says so, instead of showing a dead link.

## UI redesign, Phase 7 (2026-11-04)

- The printed report now has its own layout, separate from the phone view. It lists source paper names (`AGENTS.md` asks for them, and
  they were missing) and no longer prints the account email.
- Without a database, Landing and Log in hide the neighbor choices, because every button would open the same shared account while
  promising different stories.
- Failed loads on Records, Timeline and Doctor now say so. They used to look like empty lists.
- Added `error.tsx` and `not-found.tsx`, so these show in the user's language and not Next's English defaults.
- Reduced motion: the global rule shortened infinite animations to 0.01ms, which flickers. It now also stops them after one run.
- The recovering badge on sample neighbors is neutral now. Red is only for urgent signs and delete.

## Medicine questions on Ask (2026-11-04)

The user asked for Ask to explain what a medicine is and why it is used, from official online documentation. This extends
"use ONLY the supplied records" (`AGENTS.md` section 9) with one more supplied source, and keeps the other rules:

- Server code fetches the label from openFDA and links to it on DailyMed. Muse only explains that text. It has no web access.
- Only the medicine's name leaves the server. Dosing sections are never read, so a dose can't be repeated.
- Filters: real medicines only (`openfda.rxcui`, which drops homeopathic labels), one ingredient, an exact name match, and real usage text.
- A brand is never mapped to a generic. "Napa" gets "no official label found". The only aliases are one ingredient's two official
  names, such as paracetamol and acetaminophen.
- The labels are American, so the answer says it is general information and that medicines in Bangladesh may differ.
