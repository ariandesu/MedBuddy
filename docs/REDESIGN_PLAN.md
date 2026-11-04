# MediSathi UI redesign plan: "Mist"

Mobile-first redesign of every page, based on the frosted slate-blue reference.
Mockups of every page: https://claude.ai/artifact/BcNELU6uFLUss7zhufTuRX

Status: All phases done in code. Not yet committed. Results and what still needs a person are in section 10.

## 1. Direction

**Morning light on a doctor's paper.** A calm mist ground, frosted cards, black actions, and one lit value. On every screen the first thing read is the one thing to do next.

### Taken from the reference

- Mist-blue ground with translucent cards
- Near-black pills and tiles for actions
- Round back button with a centred title
- One question per screen, with a progress bar
- Large radio cards
- Black bars with pale tracks
- A glowing orb

### Changed from the reference, on purpose

| Reference | MediSathi | Why |
| --- | --- | --- |
| Grey body text on mist | Text is at least 4.5:1 on every surface | People with low health literacy, often on cheap screens in sunlight |
| "Symptom checker", "assess urgency", "View guidance" | A daily check-in plus fixed urgent-care rules | The app must never diagnose |
| "A 10-minute walk could help" | Only what the record says, then "ask your doctor" | No advice |
| "+8%" style scores | Real values, with gaps left empty | Missing days never count as zero |
| A pill inside the orb | A paper being read, with one line lit in Haldi | The app does not prescribe, and reading paper is what it does |
| Icon-only composer actions | Labelled nav, and an accessible name on every icon | Low literacy |
| Blur on every card | Translucent fill on cards, blur only on the nav and sticky action bar | Performance on low-end Android |

### Kept from the current app

- The range bar, the app's signature element
- The Haldi highlight on the paper
- Haldi meaning "needs checking"
- Alarm red reserved for urgent signs and delete
- The five nav places
- Bangla-first copy
- Anek Bangla and Noto Sans Bengali
- Values kept exactly as written

## 2. Design tokens

| Token | Value | shadcn role |
| --- | --- | --- |
| Mist | `#D5DDE0` to `#A9BEC8`, vertical | `--background` plus a body background image |
| Frost | white at 46%, `white / 62%` edge | `--card`, `--border` |
| Ink | `#0B1012` | `--foreground`, `--primary` |
| Ink 2 / Ink 3 | `#26363E` / `#3A4C55` | `--muted-foreground` |
| Lagoon | `#0B5F7C` | `--chart-1`: normal range, today's bar |
| Haldi | `#E3A72F`, text `#573A00` | `--warning`, `--warning-foreground` |
| Alarm | `#A92C1E`; `#6E180E` for text on bare Mist | `--destructive` |

Type:

- Page title 30/1.2, or 30/1.3 in Bangla
- Section 21, card title 18, body 17, meta 15, floor 14
- Bangla body line height 1.65
- Never apply negative tracking to Bangla, because it breaks the matra
- Add Anek Latin so English headings match the Bangla ones

Shape and touch:

- Cards 24px, tiles 18px, controls are full pills
- Primary buttons 56px tall, everything else at least 48px

Contrast computed on the darkest ground, `#A9BEC8`, and on a Frost card over it:

| Colour | On ground | On Frost card |
| --- | --- | --- |
| Ink | 9.9:1 | 13.7:1 |
| Ink 2 | 6.5:1 | 9.0:1 |
| Ink 3 | 4.6:1 | 6.4:1 |
| Haldi text | 5.4:1 | 7.5:1 |
| Alarm | 3.6:1, so text uses `#6E180E` | 4.9:1 |

## 3. Page by page

Each row has a matching board on the canvas. Files are relative to `src/`.

| Page | The one question | What changes | Main files |
| --- | --- | --- | --- |
| Landing `/` | What is this and how do I try it? | The paper and its lit value move into the first screen (now below 1,200px). The primary button follows the page language. Steps become one card. | `app/page.tsx`, `components/landing-cta.tsx` |
| Log in | How do I get in? | Form first, then one demo card with the neighbours as a single list. | `components/login-form.tsx` |
| Sign up | How do I start? | Round back button, plus the honest privacy line. | `components/signup-form.tsx` |
| Home | What should I do now? | One next-step card. The second teal card and the judge tour move behind one quiet link. The latest result shows the change in words. Sleep chart added, with gaps. | `app/(app)/dashboard/page.tsx` |
| Home, first run | Where do I begin? | Keeps its frames with honest empty states. | same |
| Records, Papers | What needs me? | "To check" comes first. Upload moves into a sheet, so the list starts near the top. Papers are named by type and date, with the filename second. Delete moves to the record page. | `components/views/documents-view.tsx`, `components/upload-zone.tsx`, `components/page-tabs.tsx` |
| Add a paper | How do I add one? | Bottom sheet with two large choices, samples, and the privacy line. | `components/upload-zone.tsx`, `components/ui/sheet.tsx` |
| Reading | Is it working? | The orb, with the two real stages stated plainly. | `components/upload-zone.tsx` |
| Records, Timeline | How am I changing? | Hemoglobin leads with old and new marks. One chart with a Sleep, Water or Walking switch. Entries become compact chips. | `components/views/timeline-view.tsx`, `components/trend-chart.tsx`, `components/range-bar.tsx` |
| Record explained | What does this mean? | Separates "What the paper says" from "In simple words", with read aloud and the paper below. | `components/views/records-client.tsx` |
| Review `/documents/[id]` | Is this value right? | One value at a time beside the lit paper, with progress. "See all values" stays for people who prefer a list. The labels say who read the value. | `app/(app)/documents/[id]/page.tsx` |
| Review, readings differ | Which one is right? | Two large choices plus "Neither is right, type it". | same |
| Check-in | How are you today? | Four short steps. Urgent signs come first, cleared by one tap on "None of these". | `app/(app)/checkin/page.tsx` |
| Urgent dialog | What do I do now? | A large Call 999 button, Bangla first, then English. Safety rules unchanged. | same, `lib/safety/redflags.ts` untouched |
| Check-in saved | Did it save? | Confirms exactly what was saved. | same |
| Ask | What can I ask? | The orb, example questions, and a composer with voice. | `app/(app)/ask/page.tsx` |
| Ask, answer | Where did this come from? | Answer first, sources as tappable rows, limits in plain words. | same |
| Doctor, Report | What do I show? | Dates and Print first. Mobile shows averages. Unchecked papers are called out. | `components/views/report-view.tsx`, `components/range-bar.tsx` |
| Doctor, Summary | What changed, and what do I ask? | Source chips on each claim, and questions come before limits. | `components/views/summary-view.tsx` |
| Printed report | Can the doctor read it fast? | White page with no mist, full table, values as written, lab ranges and source names. | `globals.css` print rules |
| States | What if it's loading or fails? | Loading keeps the layout with flat bars. Errors stay inside their block. Delete says what will go. | `app/loading.tsx`, each view |
| Desktop | Same app, wider | Centred pill nav on a 12-column grid. Review becomes paper and value list side by side. | `components/header.tsx` |

## 4. Build phases

Each phase ends with `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, and the build must also pass with only `AUTH_SECRET` set.

| Phase | Work | Done when |
| --- | --- | --- |
| 0. Prepare | Decide the questions in section 7. Install the skills you want. Rewrite `DESIGN.md` as the new source of truth. Find out why the demo showed non-Rahima data (section 8). | `DESIGN.md` approved |
| 1. Foundation | Tokens in `globals.css`, fonts in `layout.tsx`. Glass and pill variants on `Card`, `Button` and `Badge`, and the active pill on `page-tabs` (`ui/tabs` is unused). Print rules reset to white. | Every page already looks right in colour with no layout changes |
| 2. Shell | Bottom nav active pill and 13px labels. `header`, `bottom-nav`, `demo-banners`, `page-tabs`, a shared page title and back button, a sticky action bar. | Nav correct at 390, 768 and 1280 |
| 3. Signature parts | Tile component (not added in Phase 1 because nothing uses it yet). Replace or delete the unused `trend-chart.tsx`, which still has rainbow colours. Range bar with old and new marks. Bars with gaps. CSS orb with a reduced-motion version. Stepper. Option card. | Unit tests still pass, no new chart logic |
| 4. Core flows | Home, Records, Upload, Review. | Upload, check and save works on a phone |
| 5. Check-in | Steps, urgent first. Dialog restyled. | Red-flag tests pass, and the dialog fires on any urgent sign or Severe |
| 6. Understanding | Timeline, Record explained, Ask, Summary. | Every claim still links to its source |
| 7. Doctor and edges | Report, print, Landing (fix the hydration mismatch in `landing-cta.tsx`, which reads `document` during render), auth, empty, loading and error states. | Prints cleanly in Bangla and English |
| 8. Proof | Update E2E selectors. Run the checks in section 6. Compare before and after at every width. | All checks green |

No new dependencies. All UI stays shadcn, with `lucide-react` icons. The API, repository, AI and safety code does not change. Phases 1 to 3 touch shared files, so they go first and in order. Phases 4 to 7 can run in parallel.

## 5. Skills

You asked for every page to use all ten. **Only two were actually run.** The others are not installed here. I read what was publicly available and applied those principles by hand, which is not the same as running them.

| Skill | Status | What it contributed |
| --- | --- | --- |
| Frontend Design | Loaded and used | The direction and its idea |
| Taste Skill | Loaded and used | App-screen rules; style chosen from the options it dealt: achromatic ledger. Its inspector still needs to run on the real build. |
| Impeccable | Not installed, read the start of its SKILL.md | Modes: Landing is Persuade, the app is Operate, the report is Read. "The brief wins". |
| UI UX Pro Max | Not installed, read the start of its SKILL.md | Priority order: contrast, touch, then style. Its palette and font search was not run. |
| shadcn/ui | Not installed, read the start of its SKILL.md | Semantic tokens, variants before custom styles. Its CLI was not run. |
| Interface Design | Not installed, read the start of its SKILL.md | Token names from the product's world, and one signature element. |
| Hallmark | Not installed, read its README only | The idea of a hard quality floor. Its themes and checks were not run. |
| Hue | Not installed, read its README only | Treating a screenshot as a design language. Done by hand here. |
| Extract DESIGN.md | Not found | Not used. `DESIGN.md` is rewritten by hand in Phase 0. |
| Better Typography | Not found | Not used. Type rules come from Taste Skill and Bangla needs. |

**One conflict.** Taste Skill bans glass, gradients and glows, and your reference uses all three. The reference wins, within limits: frost on cards, one soft ground gradient, and the glow only on the orb.

## 6. Acceptance checks

- `inspect.mjs --app` from Taste Skill at 390, 768 and 1280, with `--allow` only for the glass decision above
- Text at least 4.5:1 and targets at least 48px on every screen, in Bangla and English
- Full E2E flow on a mid-range Android phone, watching scroll smoothness with blur on
- Check-in finishes in under a minute, and every field can be skipped except the one tap on step 1
- `prefers-reduced-motion` and `prefers-reduced-transparency` both respected
- Printed page checked in Bangla, using `window.print()`

## 7. Decisions made

All accepted as recommended on 2026-11-04, and logged in `docs/DECISIONS.md`:

1. **Check-in as steps.** Urgent signs come first, so nobody abandons the form before reaching them. The cost is one required tap every day.
2. **Review one value at a time**, with "See all values" kept.
3. **Steppers instead of sliders** for sleep, water and walking, because they are easier to hit.
4. **Black primary replaces Shapla teal.**
5. **Judge tour behind a link.**

`AGENTS.md` section 11 now matches `DESIGN.md`, and `DESIGN.md` wins for UI.

## 8. Found along the way

- **Demo data mismatch, cause found.** With no database, `/api/demo/start` deliberately returns one shared seeded account and ignores the chosen profile, because Vercel instances don't share memory. So without MongoDB, every neighbor button opens the same generic data while the page promises Rahima's records. With MongoDB, profiles work. Not fixed yet.
- **Report header shows the account email.** The redesign removes it from the printed page. Tell me if doctors need a name there, because the data model has none.
- **"2 document(s) to check" wording.** Replaced with proper singular and plural in both languages.

## 9. Sample content to confirm

These strings are new in the mockups, and final Bangla needs a human check:

- All new microcopy, such as "None of these", "Looks right, next", and the Mild, Moderate and Severe descriptions
- The sample explanation and Ask answer, written from Rahima's data rather than returned by the AI
- The "16.7" phone reading, invented to show the "readings differ" state
- The Bangla on Landing and Home, partly new or shortened from `bn.json`

## 10. Results

Measured on 2026-11-04 against the production build of the last commit (before) and this work (after), at 390, 768 and 1280px in English and Bangla: 72 page states each, in no-database demo mode. A second after-run on Rahima's data, using a throwaway in-memory database, gave the same zero counts.

| Measure | Before | After |
| --- | --- | --- |
| Text below 4.5:1 contrast | 54 | 0 |
| Controls under 48px tall | 564 | 0 |
| Pages with sideways scroll | 0 | 0 |
| Pages without exactly one h1 | 0 | 0 |
| React hydration error on Landing | Yes | No |

Page height at 390px, English:

| Page | Before | After |
| --- | --- | --- |
| Landing | 2363 | 1413 |
| Log in | 1720 | 844 |
| Records | 1874 | 1045 |
| Review | 2125 | 1084 |
| Check-in, all on one page before, step 1 now | 2023 | 948 |
| Home | 1681 | 1607 |
| Doctor | 2123 | 1930 |
| Timeline, longer | 3193 | 3760 |
| Summary, longer | 1344 | 1705 |
| Ask, longer | 844 | 970 |

The Landing and Log in drops are partly because this comparison ran without a database, where the new build hides the neighbor list and the old one showed it. With a database they are taller. Timeline, Summary and Ask got longer because cards take more room than plain lines.

Other checks:

| Check | Result |
| --- | --- |
| Unit and contract tests | 135 of 135 |
| E2E on a fresh server | 9 of 9. The Bangla flow can only run once per server, because it saves the shared demo paper. |
| Builds, with the env file and with only `AUTH_SECRET` | Both pass |
| Reduced motion | No infinite animations running |
| Reduced transparency | Every surface solid |
| Shortest check-in | 4 taps |
| Doctor report as PDF, both languages | One A4 page, correct Bangla shaping |

### Taste Skill inspector

| Result | Screens | Why |
| --- | --- | --- |
| No FAIL | Log in, Sign up, Home, Records, Timeline, Review, Saved paper, Check-in, Doctor, Summary | Judged as app screens |
| FAIL: gradient | Ask | The orb's halo. Deliberate, following the reference, and recorded in `DESIGN.md`. |
| FAIL: 6 rules | Landing | See below. Judged as a marketing page, a stricter bar. |

Landing's failures: `few-pictures` (one paper, not four), `still-page` (little motion), and `focal-point` (the paper is under a third of the desktop screen) are real gaps against that bar, and are a choice to make. `eyebrow` is the required demo banner, `hairline` is dividers in a list, and `shadow` is the paper, which really does float. Warnings left in place: 30px titles over the skill's phone guide (chosen for readability), white card edges (the frost look), `ragged-row` and `hero-void` on desktop Review, because the paper and value list differ in height, and `below-fold` on Timeline, a long list.

### Still needs a person

These can't be done from a browser script:

1. **Real phone:** the camera button, a real 999 call, and read aloud and voice input, especially in Bangla.
2. **Low-end Android:** a 6x CPU throttle held 60fps with and without blur, but headless Chrome has no real GPU, so this says little about blur. It needs a real device.
3. **Timed check-in:** under a minute with a real person.
4. **Real Atlas and Muse:** especially Muse's citations on Ask, and its Bangla.
5. **Bangla copy:** a native read of every new string, especially the symptom severity descriptions and urgent text.
6. **Printer:** one Bangla page on paper, and a report long enough to run to two pages.
7. **`error.tsx`:** built but never triggered by a real crash.
8. **Canvas mockups:** the published canvas was only checked through a local render.
