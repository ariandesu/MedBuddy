# THREAT MODEL — MediSathi

## Trust boundaries

- User browser ↔ Next.js (HTTPS in production via Vercel)
- Next.js ↔ MongoDB Atlas (TLS, at-rest encryption)
- Next.js ↔ Muse Spark / Meta Model API (TLS; documents ARE sent to the model)
- Browser OCR (tesseract.js) runs on-device; document bytes never leave the device for OCR.

## Data classification

| Data | Sensitivity | Protection |
|------|-------------|------------|
| Auth credentials | High | bcryptjs hash, JWT session, AUTH_SECRET |
| Uploaded documents | High | TLS in transit, GridFS / memory, userId-scoped access |
| Extracted values | High | userId-scoped, never shared across users |
| Wellness check-ins | High | userId-scoped, unique per user/date |
| AI inputs/outputs | High | Sent to Meta Model API (not E2EE) |

## Identified threats & mitigations

| Threat | Impact | Mitigation |
|--------|--------|------------|
| Secret committed to git | Critical | `.gitignore` blocks `.env*`; pre-commit hook scans for `mongodb+srv://`/`LLM_*`; `.env.local` never staged |
| Cross-user data access | High | Every repo method filters by `userId`; returns 404 on mismatch |
| Missing secrets at runtime | Medium | `src/server/env.ts` never throws; returns `undefined`/defaults; demo mode |
| Build fails without credentials | High | Verified: `pnpm build` passes with empty env / only `AUTH_SECRET` |
| AI prompt injection | Medium | `<document>` tags wrap untrusted content; system prompt forbids instruction-following from documents |
| AI hallucination / wrong values | Medium | Deterministic cross-check (Muse vs OCR); `needsReview` on mismatch/low confidence; user must Confirm |
| Unsourced summary claims | High | Grounding filter drops claims whose `sourceRecordIds` weren't sent / don't belong to user |
| Missing treated as zero | Medium | `trends.ts` never treats missing days as 0; gaps shown explicitly |
| No red-flag escalation | High | `redflags.ts` triggers urgent-care dialog (999 Bangladesh) for severe symptoms |

## Residual risks (accepted / documented)

- Demo mode uses in-memory memory (not shared across Vercel instances) — acceptable for demonstration.
- Documents are sent to Meta Model API for interpretation — disclosed in privacy statement; not E2EE.
- Atlas TLS handshake may fail if IP not whitelisted — operator must add network access (documented in DECISIONS.md).

## Not in scope

- No client-side encryption (per spec constraints).
- No vector DB / semantic search — keyword retrieval only.
- No diagnostic claims — explicit disclaimer everywhere.
