# MediSathi / MedBuddy — Fix Plan (for opencode)

This file is the work order. It comes from a full audit of the repo and the live site
(https://medbuddy-tau.vercel.app) on 2026-10-31.

---

## 0. How to use this file (read first)

### For the human (you)

1. Commit your current state first: `git add -A && git commit -m "pre-fix snapshot"`.
2. Put this file in the repo root as `FIX_PLAN.md`.
3. Add this line at the very top of `AGENTS.md`, so the agent reads it before the old spec:
   `> Active work order: FIX_PLAN.md. Where it conflicts with this file, FIX_PLAN.md wins.`
4. In opencode, select the Nemotron model and run **one task per session**. Use this prompt:

   ```
   Read FIX_PLAN.md section 0.2 (rules), then do ONLY task T<N>.
   Touch only the files listed in that task. When done, run the task's
   "Verify" commands, paste their output, and stop. Do not start the next task.
   ```

5. After each task, review the diff (`git diff`). If it's good, commit with `git commit -am "T<N>: <title>"`.
   If it's bad, run `git checkout .` and re-run the task with a note about what went wrong.
6. Mid-size models do best with small, explicit steps. If a task fails twice, split it
   (for example "do steps 1–3 of T14 only").
7. Tasks marked **[YOU]** need you in a browser or dashboard (Atlas or Vercel). The agent can't do those.

### 0.2 Rules for the agent (paste into every session if needed)

- Only edit files named in the current task, plus new files the task asks you to create.
- Keep TypeScript strict. No `any` unless the task says so. No new dependencies unless the task names them.
- UI uses shadcn/ui components from `src/components/ui/*` only. Note: `Button` has **no** `asChild`.
  For a link that looks like a button, use `<Link className={buttonVariants({...})}>`.
- Every user-visible string goes through the dictionary (`src/lib/i18n/en.json` + `bn.json`).
  Add the same key to BOTH files.
- Server-side env is read only through `src/server/env.ts` getters.
- Every repository method that touches user data takes `userId` and must scope by it.
- After every task run: `pnpm lint && pnpm typecheck && pnpm test`. Also run `pnpm build`
  when the task changes routes or config.
- Never commit `.env*` files and never print secrets.

---

## Phase 1 — Storage foundation (do this first; most bugs come from it)

**Root cause.** Production runs "demo data mode", which keeps data in server memory
(`MemoryRepository`). Vercel runs many separate server instances that don't share memory.
A patch then copied some data to the browser's localStorage. The result is three sources of
truth, and each page reads a different one. **Decision: use MongoDB in production, give each
visitor their own seeded demo account, and delete the localStorage layer.**

### T1 [YOU] — Turn on MongoDB in production

1. MongoDB Atlas → Network Access → Add IP Address → `0.0.0.0/0` (Vercel has no fixed IPs).
2. Vercel → Project `medbuddy` → Settings → Environment Variables. Add `MONGODB_URI` to
   Production and Preview (`MONGODB_DB=medisathi` is already set).
3. Locally, run `pnpm smoke:mongo`. It must print success.
4. Locally, run `pnpm init-indexes`.
5. Don't redeploy yet. Finish T2–T3 first, otherwise the demo login stops working (see T2).

### T2 — Per-visitor demo accounts + signup (fixes "nobody can log in with Mongo")

**Problem.** `MongoRepository` has no demo user and the app has no signup, so login fails as
soon as `MONGODB_URI` is set. One shared demo user would also let every judge see every
other judge's edits.

**Files:** create `src/server/demo-seed.ts`, `src/app/api/demo/start/route.ts`,
`src/app/api/auth/register/route.ts`, `src/app/(auth)/signup/page.tsx`,
`src/components/signup-form.tsx`. Edit `src/components/login-form.tsx`, `src/lib/i18n/*.json`,
`middleware.ts`.

Steps:

1. `src/server/demo-seed.ts`: export `async function seedDemoData(repo: Repository, userId: string): Promise<void>`.
   It reads the JSON files in `fixtures/` (documents, extractions, records, wellness, summary).
   Write everything **through repository methods only**, so it works for both Memory and Mongo:
   - For each fixture document: `storeFile` with the placeholder bytes, then `createDocument`,
     then `updateDocumentStatus(fixture.status)`. Keep a map `fixtureDocId → newDocId`.
   - For each extraction: `createExtraction` with `documentId` remapped through the map.
     Convert `documentDateDaysAgo` to an ISO date (the same logic as `daysAgoISODate` in `memory.ts`;
     move that helper to `src/server/dates.ts` and import it in both places).
   - For each record: `createMedicalRecord` with `documentId` remapped. Map `fixtureRecordId → newRecordId`.
     Also remap each observation's `sourceDocumentId`.
   - For each wellness entry: `upsertWellnessEntry(userId, daysAgoISODate(w.daysAgo), {...})`.
   - For the summary: `createHealthSummary` with `sourceRecordIds` and every `observedChanges[].sourceRecordIds`
     remapped through the record map, and `isSample: true`.
2. `POST /api/demo/start` (no auth required):
   - `email = demo-${randomUUID().slice(0,8)}@medisathi.app`
   - `password = randomUUID()`
   - `createUser({ email, passwordHash: await bcrypt.hash(password, 10), locale })`
   - `await seedDemoData(repo, user.id)`
   - Return `{ email, password }` with status 201.
3. Add `/api/demo/` to the public paths in `middleware.ts` (next to `/api/auth/`), and also
   `/api/auth/register`. Also make sure `/signup` is NOT in the protected list.
4. `login-form.tsx`: the "Try the demo" button calls `POST /api/demo/start`, then calls the existing
   `submit(email, password)` with the returned credentials. Remove the hard-coded
   `DEMO_EMAIL/DEMO_PASSWORD` hint text from the page (`dict.auth.demoHint`). Replace it with
   `dict.auth.demoExplain`: "Try the demo — you get your own private sample account."
5. `POST /api/auth/register`: zod `{ email: email(), password: min(8) }`. Lower-case the email,
   reject duplicates with 409, hash with bcrypt, call `createUser`. Do NOT seed sample data for
   real accounts.
6. Create `/signup` with a form like the login form (email, password, confirm password). On success,
   sign in with the same credentials-callback code as `login-form.tsx`, then go to `/dashboard`.
   Add links between `/login` ↔ `/signup`.
7. `MemoryRepository` keeps its constructor seed for unit tests, but `getRepo()` no longer
   matters in production because `MONGODB_URI` is set.
8. Optional: add `isDemo: boolean` to `CreateUserInput`/`User`, set it in demo/start, and add a
   Mongo TTL cleanup later (not required for the hackathon).

**Verify:** `pnpm test`. Add `tests/unit/demo-seed.test.ts`: seed into `new MemoryRepository({seed:false})`,
then assert 4 documents, 2 records, a summary whose `sourceRecordIds` all exist, and that a second user
sees 0 documents.

### T3 — Delete the localStorage layer

**Problem.** `src/lib/sample-storage.ts` copies every upload to localStorage, including real
documents in Mongo mode. The review page then "confirms" it only in the browser, so the record
never reaches the server. Summary, Ask and Report never see it. It also leaks real OCR text into
the browser and shares it between accounts.

**Files:** delete `src/lib/sample-storage.ts`. Edit `src/components/upload-zone.tsx`,
`src/app/(app)/documents/page.tsx`, `src/app/(app)/documents/[id]/page.tsx`,
`src/app/(app)/timeline/page.tsx`, `src/app/api/documents/route.ts`,
`src/app/api/documents/sample/route.ts`.

Steps:

1. Remove every import and call of `getSampleDocuments`, `getSampleDocument`, `saveSampleDocument`,
   `getSampleExtraction(s)`, `saveSampleExtraction`, `getSampleMedicalRecords`,
   `saveSampleMedicalRecord`, `markSampleDocumentConfirmed` and `removeSample*`.
2. Review page: delete the whole `isSampleOnly` branch in `handleConfirm`. Confirm always does
   PATCH `/api/extractions/:id`, then POST `/api/extractions/:id/confirm`.
3. Review page `load()`: if either fetch is not ok, show an error state (no localStorage fallback).
4. Documents page and timeline: use server data only.
5. API responses no longer need to return the full `document`/`extraction` for client storage.
   Return `{ id, status, fileName }` only.
6. Add a one-time cleanup in `src/app/layout.tsx` via a tiny client component
   `src/components/legacy-storage-cleanup.tsx`. In `useEffect`, remove the 3 old keys
   `medisathi_sample_documents`, `medisathi_sample_extractions` and `medisathi_sample_medical_records`.

**Verify:** `grep -rn "sample-storage\|localStorage" src` → only the cleanup component matches.
Then lint, typecheck, test and build.

### T4 [YOU] — Deploy and smoke test

Push, wait for the Vercel deploy, open the site, click "Try the demo", and check that Documents
lists 4 files. If not, check Vercel → Functions logs for a Mongo error.

---

## Phase 2 — Critical bugs

### T5 — Documents page stuck on "Loading…", rows not clickable, dead button

**File:** `src/app/(app)/documents/page.tsx`, i18n files.

1. In `load()`, after setting docs, add `if (!cancelled) setLoading(false);`. Wrap the whole
   body in `try { … } finally { if (!cancelled) setLoading(false); }`.
2. Make each row open the review page. Wrap the file name in
   `<Link href={`/documents/${d.id}`} className="underline-offset-4 hover:underline">`. Also add
   a last column with a button-styled Link labelled `dict.documents.review` (status
   `needs_review`) or `dict.documents.view` (other statuses).
3. Delete the header `<Button><Upload/>…</Button>` (it has no handler). The upload card is right below it.
4. Translate the hard-coded strings: "Loading…" → `dict.common.loading`, and the table headers
   File/Type/Size/Status → new keys `documents.colFile`, `colType`, `colSize`, `colStatus`.
   The status badge text → `dict.documents.status[status]` (these keys already exist and are used
   on the review page).
5. Re-fetch the list after an upload finishes. Give `UploadZone` an `onUploaded?: () => void`
   prop and call it before `router.push`.

**Verify:** lint, typecheck. Manual check: /documents shows the list, and clicking a row opens review.

### T6 — Every PNG upload rejected

**Files:** `src/components/upload-zone.tsx`, `src/app/api/documents/route.ts`.

1. Client: when converting an image to JPEG, also change the name:
   `const jpgName = selected.name.replace(/\.[^.]+$/, "") + ".jpg";` then
   `new File([blob], jpgName, { type: "image/jpeg" })`.
2. Server: detect the type from the **bytes**, not the extension. Replace `mimeFromExt` +
   `magicMatches` with `sniffMime(buf): "image/jpeg" | "image/png" | "application/pdf" | null`,
   which checks the three magic signatures. Reject with 400 if it returns null.
3. Client: check PDF size before OCR. `if (selected.size > MAX_BYTES) throw new Error(dict.documents.tooLarge)`.
4. Client: the OCR preview uses `<Input>` (single line). Change it to `<Textarea rows={6}>`.
5. Client: after OCR, the toast says `dict.common.save` ("Saved"), which is wrong because
   nothing is uploaded yet. Use the new key `documents.ocrReady` ("Text read — check it, then press Upload").

**Verify:** add `tests/unit/sniff-mime.test.ts` (jpeg, png and pdf headers → correct type;
random bytes → null).

### T7 — Doctor report prints blank

**File:** `src/app/(app)/report/page.tsx`.

1. Remove `no-print` from the outer `<div>` (line ~84).
2. Wrap ONLY the controls row (date inputs and buttons) in `<div className="no-print …">`.
3. The refresh button shows `dict.common.loading` all the time. Show
   `loading ? dict.common.loading : dict.report.refresh` (new key).

**Verify:** in the browser, press Ctrl/Cmd+P. The preview shows the report content.

### T8 — Summary grounding filter does nothing (safety)

**File:** `src/server/ai/grounding.ts`.

1. In `groundSummaryChanges`, return `{ changes: kept, limitationNote: note }` (it currently returns `changes`).
2. Add a test in `tests/unit/grounding.test.ts`: 3 changes, where one has an unknown id and one
   has empty `sourceRecordIds`. Expect 1 kept and the note to mention 2.

### T9 — Bangla digits never converted

**File:** `src/server/ai/crosscheck.ts`.

The current map uses U+0966–U+096F, which is **Devanagari** (Hindi). Bengali digits are
U+09E6–U+09EF (০১২৩৪৫৬৭৮৯).

1. Replace the map and regex with:
   ```ts
   export function normalizeDigits(s: string): string {
     return s.replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6));
   }
   ```
2. Move `normalizeDigits` to `src/lib/digits.ts` so client code can use it (T12 needs it), and
   re-export it from `crosscheck.ts`.
3. Update `tests/unit/crosscheck.test.ts`: `normalizeDigits("১২.৫") === "12.5"`.

### T10 — "Ask" finds nothing for Bangla questions

**File:** `src/server/ai/grounding.ts`, `src/app/api/ask/route.ts`.

1. `tokens()` strips everything except `a-z0-9`, which deletes every Bangla word. Replace it with:
   ```ts
   function tokens(text: string): Set<string> {
     return new Set(
       normalizeDigits(text).toLowerCase()
         .split(/[^\p{L}\p{N}]+/u)
         .filter((t) => t.length > 1)
     );
   }
   ```
2. In `/api/ask`: keyword matching is weak, and the question language often differs from the
   record language (Bangla question, English lab names). If `hits.length === 0`, fall back to the
   10 most recent records (`records.slice(-10)`) instead of answering "not found". Let the model
   decide what's relevant.
3. Hard-coded English answers ("I couldn't find this in your records.") → use
   `getDictionary(locale).ask.notFound`. Do the same for the limitation strings (new keys).
4. Wrap the user's question as untrusted input too: `wrapDocument("question", question)`.

**Verify:** add a test that `retrieveRecords("হিমোগ্লোবিন hemoglobin", records)` returns the CBC
record, and that a Bangla-only query tokenizes to a non-empty set.

---

## Phase 3 — Logic errors

### T11 — Review page fixes

**Files:** `src/app/(app)/documents/[id]/page.tsx`, `src/app/api/extractions/[id]/confirm/route.ts`,
`src/app/api/extractions/[id]/route.ts`, i18n.

1. Get the id with `const { id } = useParams<{ id: string }>();` (from `next/navigation`),
   not `window.location`.
2. The "Back" button pushes to the same page. Change it to `router.push("/documents")`.
3. When a value is edited, also recompute the number and clear the review flag:
   ```ts
   import { normalizeDigits } from "@/lib/digits";
   function parseNumber(raw: string): number | null {
     const m = normalizeDigits(raw).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
     return m ? Number(m[0]) : null;
   }
   // in handleChange:
   { ...f, rawValue: value, numericValue: f.numericValue === null && !/\d/.test(normalizeDigits(value)) ? null : parseNumber(value), userEdited: true, needsReview: false }
   ```
   Add a small "✓ I checked this" checkbox per row. It sets `needsReview: false` without editing,
   so the user can accept a correct value.
4. Confirm route:
   - If the document status is already `confirmed`, return 409 `{ error: "already_confirmed" }`.
   - Medication `uncertain` must be **true if ANY** of its 4 fields is uncertain. It currently
     uses the last field processed. A field is uncertain when
     `!f.userEdited && (f.agreement !== "match" || f.needsReview)`. Use `||=`-style accumulation.
5. Page: if `doc.status === "confirmed"`, hide the Confirm button and the inputs (read-only view),
   and show `dict.review.alreadyConfirmed`.
6. Block Confirm while any field still has `needsReview: true`. Show `dict.review.checkAllFirst`
   with the count. This is the "review before it becomes a record" promise in your pitch.
7. Translate the hard-coded strings: "Field", "Value (as written)", "Unit", "Ref. range",
   "Agreement", "edited", "Loading…", "Original document" (alt), and the agreement badge text
   (new keys `review.agreement.match|mismatch|single_source`).
8. The table shows the unit twice (under the value and in its own column). Remove the one under the value.

**Verify:** test in `tests/integration/repo-contract.test.ts` or a new route test: confirming
twice → second call 409, and only 1 record exists.

### T12 — Original image broken for sample docs

**Files:** `src/app/(app)/documents/[id]/page.tsx`, `src/app/api/documents/sample/route.ts`,
`src/components/upload-zone.tsx`.

1. Sample files are placeholder bytes, so `<img>` breaks. Add an `imgFailed` state with
   `onError={() => setImgFailed(true)}`. When it's set, show a muted box:
   `dict.review.noPreview` ("Sample document — no image (synthetic data)").
2. For PDFs, `<img>` can't render. If `doc.mimeType === "application/pdf"`, render
   `<a href={`/api/documents/${id}/file`} target="_blank">` + `dict.review.openPdf` instead.
3. Sample buttons: the route picks a random sample and ignores which button you clicked.
   Send `{ index: 0 | 1 }` in the POST body and read it in the route
   (`const { index } = z.object({ index: z.number().int().min(0).max(1) }).parse(await req.json())`).
4. The sample route is blocked in Mongo mode (`isDemoDataMode()` check). Change it to allow the
   call when the user is a demo account (email starts with `demo-` and ends with
   `@medisathi.app`), or remove the check entirely. Sample data is clearly watermarked.

### T13 — AI extraction: send the image, keep the independent OCR

**Files:** `src/server/ai/muse.ts`, `src/app/api/documents/route.ts`, `src/server/ai/crosscheck.ts`.

1. `extractDocument` ignores `fileBytes`, so the model only reads OCR text. For images, send the
   picture too (OpenAI-style multimodal content):
   ```ts
   const parts: ChatCompletionContentPart[] = [{ type: "text", text: `Extract all fields... ${content}` }];
   if (mimeType.startsWith("image/")) {
     parts.push({ type: "image_url", image_url: { url: `data:${mimeType};base64,${fileBytes.toString("base64")}` } });
   }
   ```
   If the Meta endpoint returns 400 for image input, catch it and retry once with text only.
   Log `console.warn("muse: image input rejected, text-only fallback")` (no document content in logs).
2. Pass the user's locale to `systemPrompt` (it currently hard-codes `"en"`). Route: `const locale = await getLocale()`.
3. Cross-check must compare the model against the **browser OCR**, not the model's own echo.
   In the route, **do not** overwrite: keep `const ocrText = clientOcrText` and ignore
   `aiResult.ocrText` for the cross-check. Store the browser OCR text in the extraction.
4. Cross-check only matches single tokens, so "1 tablet" never matches. Change `valueInOCR` to a
   substring test on normalized text: `normalizeValue(ocrText)?.includes(muse) ?? false`.
5. Unit test: multi-word value present in OCR → no review needed; Bangla-digit value
   "১২.৫" vs OCR "12.5" → match.

### T14 — Check-in fixes (incl. safety)

**Files:** `src/app/(app)/checkin/page.tsx`, `src/app/api/wellness/route.ts`, move
`src/server/safety/redflags.ts` → `src/lib/safety/redflags.ts` (pure, no server imports),
repo upsert in `memory.ts` + `mongo.ts`, i18n.

1. Delete the duplicate `RED_FLAG_SYMPTOMS`/`isRedFlag`/`URGENT_MESSAGE` from the page. Import
   from `@/lib/safety/redflags`. Use `urgentMessage(locale)` so the warning shows in Bangla.
2. **Safety:** show the urgent-care dialog when the user presses Save and `redFlag` is true,
   **before or regardless of** the network result. Order: `if (redFlag) setOpen(true);` then save.
   If the save fails, still keep the dialog open and show the error under it.
3. Make fields really optional: `energy` and `symptomLevel` start as `null` and are only sent if
   set. For sliders, add a small "Skip" checkbox per slider (checked by default). The value is
   sent only when unchecked. Show "not set" when skipped.
4. Symptoms: replace the single `<Select>` with a list of `<Checkbox>` items (multi-select). Add
   Bangla labels for each symptom in the dictionary. Keep the stored values as the English keys
   (e.g. `"chest pain"`) so red-flag matching works.
5. Date bug: the server uses UTC, so Bangladesh check-ins before 06:00 land on yesterday.
   The client sends `date` = local date:
   ```ts
   const d = new Date(); const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
   ```
   The server accepts `date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)`, rejects dates more than 1 day
   in the future, and uses it.
6. Let users edit today's check-in: on load, GET `/api/wellness?from=today&to=today` and prefill.
7. Upsert can't clear a field because of `??`. Accept `null` in the zod schema (`.nullable().optional()`).
   In both repos, treat `undefined` = keep and `null` = clear (`"key" in data ? data.key ?? undefined : existing.key`).
8. Translate the hard-coded strings: "Every field is optional…", "not set", "hrs", "glasses",
   "min", "(low)/(high)", None/Mild/Moderate/Severe, "Symptoms", "Note", "Optional note…",
   "I understand", "successful".

**Verify:** unit test for `isRedFlag` (severe → true; ["chest pain"] → true; ["cough"] → false).
Repo contract test: upsert with `{ sleepHours: null }` clears it.

### T15 — Timeline fixes

**Files:** `src/app/(app)/timeline/page.tsx`, `src/components/trend-chart.tsx`, i18n.

1. Records with `recordDate: null` are dropped by the from/to filter. Fetch `/api/medical-records`
   **without** from/to, then show undated records in a separate "Undated" group at the bottom.
2. Fill missing days so the chart shows gaps. Build one point per day from FROM to TO, with
   `null` for days with no entry. Pass `connectNulls={false}`.
3. Charts: use `ResponsiveContainer` (no fixed `width={340}`). Draw **three small charts**
   (sleep, water, activity), each with its own Y axis, instead of one chart mixing hours and
   minutes. Add `<Tooltip/>` and `<CartesianGrid strokeDasharray="3 3"/>`.
4. Lab trends: from records, collect observations with `numericValue != null`, grouped by
   `name`. For each name with ≥2 points, render a small line chart (date vs value) with the
   reference range text under it.
5. Make the entry list one merged list sorted by date (newest first), not records then check-ins.
   Translate `recordType` via new keys `recordType.lab_report|prescription|other`.
6. Compute `FROM_DATE`/`TO_DATE` inside the component (not at module load), using the local-date
   helper from T14.
7. Translate the hard-coded strings: "Averages (last 30 days)", "hrs", "glasses", "min",
   "Days with data", "Entries", "Check-in", "Sleep/Water/Activity/Energy", "Wellness trends".

### T16 — Report completeness

**File:** `src/app/(app)/report/page.tsx`, i18n.

1. Check-ins: also show `symptomLevel` and `symptoms` (most important for a doctor).
2. Include undated records in an "Undated" section (same approach as T15.1).
3. Header: show the account email, "Generated on <date>", and the disclaimer.
4. Observations: mark values outside the reference range **only if** both the value and the range
   parse as numbers (`lo-hi` pattern). Show "outside printed range". Never say "abnormal" or diagnose.
5. Translate all hard-coded strings (From/To, "Doctor Report", "Records & medications
   (as written)", "No confirmed records in range.", "no range", "uncertain", "Wellness
   check-ins", "Latest summary", "Questions for doctor", footer).

### T17 — Summary & Ask: human-readable sources

**Files:** `src/app/(app)/summary/page.tsx`, `src/app/(app)/ask/page.tsx`, `src/app/api/ask/route.ts`, i18n.

1. `/api/ask` returns citations as `{ id, label }`, where the label is
   `${recordTypeLabel} · ${recordDate ?? undated}`, or `Summary v${version}` for a summary id.
   Render them as links to `/timeline#rec-${id}`. Add `id={`rec-${r.id}`}` to the timeline list items.
2. Summary page: under each observed change, list its sources the same way (look up the records
   with `repo.getMedicalRecord`).
3. Translate the hard-coded headings: "Changes observed", "Missing information", "Questions for
   your doctor", "Limitations", "Uncertainty", "Generated", "source record(s)", "Answer",
   "Sources", "Ask a question", the intro line, and the toast "Summary generated".
4. Generate button: if the API returns 400 (no records), show `dict.summary.noRecords` with a link
   to /documents instead of a generic error.

### T18 — Language consistency + login redirect

**Files:** create `src/components/locale-provider.tsx`; edit `src/app/layout.tsx`,
`src/lib/use-dictionary.ts`, `src/components/login-form.tsx`.

1. Client pages default to English when no cookie is set, while the server defaults to Bangla.
   Language switching also doesn't update client pages until a reload. Fix both:
   - `LocaleProvider` is a client component holding `{ locale, dict }` in React context.
   - The root layout wraps children with `<LocaleProvider locale={locale}>` (the locale comes from the server).
   - `useDictionary()` becomes `useContext(LocaleContext).dict`. Delete the cookie-parsing `useEffect`.
   - Because `router.refresh()` re-renders the layout, a language switch now updates every page.
2. Login: read `callbackUrl` from `useSearchParams()`, allow only values starting with `/` and not
   `//`, and redirect there after login (default `/dashboard`).
3. Logout: `signOut({ callbackUrl: "/login" })` is fine. No change needed after T3.

### T19 — Upload error handling

**File:** `src/app/api/documents/route.ts`.

1. On AI failure, the 502 response has no `error` field, so the user sees "Upload failed". Return
   `{ id, status: "failed", error: "ai_failed" }`. The client maps it to `dict.documents.aiFailed`
   ("Could not read this document. You can try again.").
2. In the outer `catch`, `doc!` may be undefined. Guard with `if (doc) …`.
3. Add a "Retry" button on documents with status `failed`. It calls the new `POST /api/documents/[id]/retry`,
   which loads the stored file and re-runs the extraction + cross-check. Reuse the code by
   extracting it into `src/server/extract-document.ts`, used by both routes.

---

## Phase 4 — Missing features / workflow

### T20 — Navigation (desktop has none; Summary & Report are unreachable)

**Files:** `src/components/header.tsx`, `src/components/bottom-nav.tsx`, create `src/components/nav-items.ts`, i18n.

1. `nav-items.ts`: one array of `{ href, key, Icon }` for Dashboard, Documents, Check-in,
   Timeline, Summary (`FileText`), Ask, Report (`Printer`).
2. Header: when `user` is set, render a desktop nav (`hidden md:flex`) with these links.
   Highlight the active one using a tiny client component (it needs `usePathname`).
3. Bottom nav (mobile): keep 5 slots (Dashboard, Documents, Check-in, Timeline, More).
   "More" opens a `Sheet` with Summary, Ask and Report.
4. Hide both navs when logged out (pass `user` to `BottomNav`, return null if not set). The login page
   currently shows app nav to logged-out users.

### T21 — Plain-language explanations (main pitch feature, not wired)

**Files:** create `src/app/api/medical-records/[id]/explain/route.ts`; edit the timeline record card
(or create `src/app/(app)/records/[id]/page.tsx`), i18n.

1. Route `POST`: auth, `repo.getMedicalRecord(user.id, id)` → 404 if missing.
   Then `getAI().explainRecord(record, locale)`. Return `{ plainLanguage, keyPoints, questionsForDoctor, limitations }`.
2. UI: each record in Timeline gets an "Explain in simple words" button (`dict.explain.button`).
   It shows the result in a `Card` with the disclaimer, and a "Sample (demo)" badge in fixture mode.
3. Optional caching: store the explanation on the record (`explanations: { [locale]: … }`) to
   avoid paying for repeat calls. Skip this if it's hard.

### T22 — Dashboard with real data

**File:** `src/app/(app)/dashboard/page.tsx`, i18n.

It's a server component. Get `getSessionUser()` and the repo, then show:
- count of documents with `needs_review`, with a button to the first one
- whether today's check-in exists; if not, a button to /checkin
- the last 3 documents with status badges
- the latest summary date, with a link to /summary
- quick links: Ask, Report

### T23 — Delete documents + duplicate detection

**Files:** `src/server/repo/types.ts`, `memory.ts`, `mongo.ts`, create `src/app/api/documents/[id]/route.ts` DELETE,
`src/app/api/documents/route.ts`, documents page, contract tests.

1. Add `deleteDocument(userId, id): Promise<boolean>` to the Repository. It deletes the document,
   its file (GridFS `delete` by filename/fileRef), its extraction(s) and any medical records with
   that `documentId`. It must be scoped by `userId`.
2. Add `findDocumentByChecksum(userId, checksum): Promise<Document | null>`. In POST upload, if it
   finds one, return 409 `{ error: "duplicate", id }`. The client shows `dict.documents.duplicate`
   with a link to the existing document.
3. Documents page: add a delete button per row with a shadcn `AlertDialog` confirm (not `window.confirm`).
4. Contract test (runs for both Memory and Mongo): delete cascades; another user can't delete.

### T24 — Translation sweep

Run `grep -rnE '>[A-Z][a-z]+[^<{]*<' src/app src/components` and
`grep -rn '"[A-Z][a-z].*"' src/app src/components`. Move every user-visible English literal into
`en.json`/`bn.json`. Add a unit test that both dictionaries have exactly the same key set.

### T25 — AI abuse limits (cheap version)

**Files:** create `src/server/rate-limit.ts`; use it in `/api/ask`, `/api/summaries/generate`,
`/api/documents` POST, and `/api/medical-records/[id]/explain`.

Use Mongo collection `rate_limits` with documents `{ key: `${userId}:${route}:${yyyy-mm-dd-hh}`, count, expiresAt }`.
Add a TTL index on `expiresAt` (in `ensureIndexes`). Increment with `findOneAndUpdate({key},{$inc:{count:1}, $setOnInsert:{expiresAt}},{upsert:true, returnDocument:"after"})`.
Limit: 20/hour per route per user, otherwise return 429. In Memory mode, use a Map (fine for local dev).

### T26 — Account & data deletion (optional, good for a health app)

Add `deleteUserData(userId)` to the repo (all collections + GridFS files), a `DELETE /api/account`,
and a button on the dashboard (or a settings page) behind an `AlertDialog`.

---

## Phase 5 — Tests & docs

### T27 — Fix the end-to-end test so it catches real bugs

**File:** `tests/e2e/demo.flow.spec.ts`.

The current test opens pages by typing URLs, so it never noticed the missing navigation or the
unclickable rows. Rewrite it to:
- click "Try the demo" (T2)
- navigate **only by clicking nav links**
- on Documents, wait for a row (catches the T5 loading bug), click a `needs_review` doc, tick
  every "I checked this" box, Confirm, then expect the status to become confirmed
- upload a real PNG fixture (`fixtures/files/test-lab.png`; make one with Playwright
  `page.screenshot` of a simple HTML table) to catch the T6 bug
- check-in with "chest pain" → expect the urgent dialog
- Summary → Generate → expect at least 1 source link
- Report → `page.emulateMedia({ media: "print" })` → expect "Doctor" text visible (catches T7)
- run once with the `en` cookie and once with `bn`

### T28 — Update docs

Update `README.md`, `docs/ARCHITECTURE.md` and `docs/DECISIONS.md`:
- production = Mongo; demo = per-visitor seeded account; localStorage removed
- runtime-modes table
- new routes
- remove the "demo1234" credentials from the README

---

## Suggested order and rough size

| Order | Tasks | Why |
|---|---|---|
| 1 | T1 → T2 → T3 → T4 | Storage foundation; fixes the hidden cause of many bugs |
| 2 | T5, T6, T7 | Visible breakages in the demo |
| 3 | T8, T9, T10 | Safety and Bangla correctness (your core users) |
| 4 | T11, T14 | Review & check-in workflow correctness |
| 5 | T20, T21, T22 | Judges need to find and see the features |
| 6 | T12, T13, T15–T19 | Polish & accuracy |
| 7 | T23–T28 | Completeness, tests, docs |

Small tasks (one opencode session each): T5–T10, T12, T16–T19, T22, T24, T28.
Large tasks (split into steps if the model struggles): T2, T3, T11, T13, T14, T15, T20, T21, T23, T27.
