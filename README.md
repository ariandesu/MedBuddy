# MediSathi — মেডিসাথী

> Repo: https://github.com/ariandesu/medisathi

Plain-language health record helper for low health literacy (Bangla/English).
Digitize prescriptions + lab reports, review extracted values, get simple explanations,
log daily check-ins, see timeline + trends, generate source-linked summaries, ask grounded
questions, print a doctor-ready report.

> NOT a diagnostic tool. Never prescribes, never changes doses, never says "you don't need a doctor".

## Demo (M1 scaffold)

- `pnpm install`
- `pnpm dev` → http://localhost:3000 → redirects to `/dashboard`
- Demo login (M3): `demo@medisathi.app` / `demo1234`
- Default language: Bangla (`bn`), switch in header (cookie `medisathi-locale`).

Demo banners show when `MONGODB_URI` / `MODEL_API_KEY` are absent:
"Demo mode — sample data" / "Sample AI output — Muse not connected".

## Env

See `.env.example`:

- `AUTH_SECRET` — required even in demo (generate: `openssl rand -base64 32`)
- `MONGODB_URI` — optional, absent = demo memory mode
- `MONGODB_DB=medisathi`
- `MODEL_API_KEY` — optional, absent = fixture AI
- `MUSE_MODEL=muse-spark-1.3`
- `MUSE_BASE_URL=https://api.meta.ai/v1`

Real secrets live in `.env.local` (git-ignored, never commit).
Tests force demo mode by deleting `MONGODB_URI`/`MODEL_API_KEY` in `vitest.setup.ts`.

## Checks (must pass before push)

```
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Build must also pass with only `AUTH_SECRET` set (empty env demo mode).

## Stack

Next.js App Router + TS strict + Tailwind v4 + shadcn/ui only + lucide-react + sonner.
pnpm. Vercel deploy target. No Python/Docker/Redis/vector DB.

## Docs

- `AGENTS.md` — build spec (milestones M1-M9)
- `docs/DECISIONS.md` — decision log
- `docs/ARCHITECTURE.md`, `docs/THREAT_MODEL.md` — M9

## Medical disclaimer

MediSathi explains records in simple language. It does not diagnose, prescribe, or replace a doctor.
If you have severe symptoms, call 999 (Bangladesh) or go to the nearest hospital.
