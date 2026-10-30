# ARCHITECTURE — MediSathi

## Overview

MediSathi is a Bangla/English Next.js (App Router) web app that helps people with low health literacy
digitize prescriptions and lab reports, review extracted values, log daily wellness check-ins, and generate
source-linked health summaries. It is NOT a diagnostic tool.

## Stack

- Next.js 16 App Router, TypeScript (strict), Tailwind CSS v4
- shadcn/ui only (base-nova preset) + lucide-react + sonner + recharts
- pnpm, deployed on Vercel
- Auth.js v4 (credentials + JWT session, bcryptjs)
- MongoDB (GridFS `files` bucket) or in-memory `MemoryRepository` (demo mode)
- OpenAI SDK against Muse Spark (Meta Model API) or `FixtureAI` (demo mode)
- Vitest + Playwright (E2E)

## Runtime modes (decided at request time)

| Env | Data layer | AI layer |
|-----|-----------|----------|
| no `MONGODB_URI` | `MemoryRepository` seeded from `fixtures/` | — |
| `MONGODB_URI` set | `MongoRepository` (GridFS) | — |
| no `MODEL_API_KEY` | — | `FixtureAI` (canned, `isSample`) |
| `MODEL_API_KEY` set | — | `MuseAI` |

Both layers implement a single interface (`src/server/repo/types.ts`, `src/server/ai/types.ts`)
obtained via lazy singletons (`getRepo()`, `getAI()`). Never read env/DB at import or build time.

## Folder layout

```
src/
  app/(app)/…          protected app pages (dashboard, documents, checkin, timeline, summary, ask, report)
  app/(auth)/login     login page
  app/api/…            route handlers (documents, extractions, wellness, summaries, ask, auth)
  components/          app components (shadcn/ui only)
  lib/i18n/{en,bn}.json, use-dictionary.ts
  lib/schemas/         Zod schemas (all models)
  server/
    env.ts             lazy runtime env getters (never throws)
    auth.ts            Auth.js config + verifyCredentials
    repo/{types,memory,mongo,index}.ts
    ai/{types,muse,fixture,index,prompts,grounding}.ts
    safety/redflags.ts
    trends.ts          deterministic weekly averages, deltas, missing days
fixtures/              synthetic records + AI fixture outputs
scripts/               init-indexes.ts, smoke-mongo.ts
tests/{unit,integration,e2e}/
```

## Data flow

1. Upload: client compresses image (≤2 MB, side ≤2000 px), OCR via tesseract.js (eng+ben), PDF via pdfjs-dist (≤5 pages).
   Server validates MIME + magic bytes + size (≤4 MB), stores file (GridFS / memory), runs AI extraction.
2. Cross-check: deterministic Muse-vs-OCR token comparison → `agreement` + `needsReview`. Status = `needs_review`.
3. Review/Confirm: user edits fields, then Confirm creates `MedicalRecord` (nothing becomes a record until user confirms).
4. Check-in: skippable fields, red-flag rules → urgent-care dialog (999 Bangladesh).
5. Timeline: merged records + check-ins; trends in `server/trends.ts` (never treats missing as 0).
6. Summary: AI generate + grounding filter drops unsourced claims.
7. Ask: keyword retrieval over confirmed records + latest summary; grounded citations.
8. Report: print-optimized (`@media print`, `window.print()`).

## Safety

- `server/safety/redflags.ts`: severe symptomLevel or red-flag symptoms → urgent-care alert.
- Static disclaimer in footer and on summary/report pages.
- Never diagnose, prescribe, or change doses.

## Key design constraints

- Demo mode builds with only `AUTH_SECRET` (no Mongo/Muse credentials).
- All pages/routes `export const dynamic = "force-dynamic"`.
- Every repo method scopes by `userId`; cross-user access returns 404.
- No Python, Docker, Redis, vector DB, or client-side encryption.
