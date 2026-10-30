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
  UPDATE: repo created via GitHub API as `ariandesu/medisathi` (public) using existing keychain PAT
  (scopes `repo,user:email,workflow`; `gh` CLI refused it for missing `read:org`, raw API worked).
  Push via SSH with `~/.ssh/hermes_shareflow` key (`git config core.sshCommand`), remote
  `git@github.com:ariandesu/medisathi.git`. Token value never printed/logged.

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
