# MediSathi Design System: "Mist" (স্বাস্থ্য খাতা)

**This is the design the app now uses.** See [docs/REDESIGN_PLAN.md](docs/REDESIGN_PLAN.md) for how it was built. For UI and visual design, this file wins over
`AGENTS.md` and `FIX_PLAN.md`.

Mockups of every page: https://claude.ai/artifact/BcNELU6uFLUss7zhufTuRX

## Idea

Morning light on a doctor's paper: a calm mist ground, frosted cards, black actions, and one lit value.
The first thing read on every screen is the one thing to do next.

The people using it may have low health literacy and a cheap phone, so legibility beats style whenever
they conflict. The app explains records. It never diagnoses, prescribes or advises.

## Colour

All values are checked conversions from the hex. Haldi and Alarm carry over from the previous design.

| Name | Hex | OKLCH | Use |
|------|-----|-------|-----|
| Mist high | `#D5DDE0` | `oklch(0.8923 0.0096 222.07)` | Top of the ground |
| Mist | `#B9CBD3` | `oklch(0.8309 0.0226 226.19)` | Ground at 340px |
| Mist low | `#A9BEC8` | `oklch(0.7887 0.0271 228.01)` | Bottom of the ground |
| Ink | `#0B1012` | `oklch(0.1686 0.0089 224.11)` | Text and every primary action |
| Ink 2 | `#26363E` | `oklch(0.3222 0.0254 230.14)` | Secondary text |
| Ink 3 | `#3A4C55` | `oklch(0.4048 0.0272 229.87)` | Unset radios, gap outlines, placeholders |
| Lagoon | `#0B5F7C` | `oklch(0.4545 0.0856 228.51)` | Data only: normal range, today's bar |
| Orb cyan | `#19B5D8` | `oklch(0.7155 0.1255 218.90)` | The orb only, never text |
| Haldi | `#E3A72F` | `oklch(0.7659 0.1449 79.78)` | Fill: outside range, needs checking |
| Haldi ink | `#573A00` | `oklch(0.3726 0.0779 77.31)` | Text for those states |
| Haldi wash | `#F6E2B4` | `oklch(0.9178 0.0636 87.27)` | Badge behind Haldi ink |
| Alarm | `#A92C1E` | `oklch(0.4884 0.1638 30.25)` | Fill and card text: urgent signs, delete |
| Alarm text | `#6E180E` | `oklch(0.3562 0.1214 30.47)` | Red text on bare Mist |
| Alarm wash | `#F7DDD8` | `oklch(0.9175 0.0297 30.64)` | Badge behind Alarm text |

Translucent surfaces:

| Name | Value | Use |
|------|-------|-----|
| Frost | white at 46% | Cards |
| Frost on | white at 78% | The screen's lead card, selected options |
| Frost edge | white at 62% | 1px card edge |
| Bar | `rgba(232,239,242,.86)` with 14px blur | Bottom nav |
| Dock | `rgba(190,207,215,.88)` with 14px blur | Sticky action bar |

### Contrast

Computed on the darkest ground and on a Frost card over it. Every word must reach 4.5:1.

| Text | On Mist low | On Frost |
|------|-------------|----------|
| Ink | 9.9:1 | 13.7:1 |
| Ink 2 | 6.5:1 | 9.0:1 |
| Ink 3 | 4.6:1 | 6.4:1 |
| Haldi ink | 5.4:1 | 7.5:1 |
| Alarm | 3.6:1, **fails**, use Alarm text (6.1:1) | 4.9:1 |
| Lagoon | 3.7:1, **fails**, data marks only | 5.1:1 |

White on Ink is 19.1:1 and white on Alarm is 6.9:1.

### Colour rules

- Black is the primary action. One filled primary per screen.
- Lagoon goes on data, never on chrome or buttons.
- "Needs checking" and "outside range" are Haldi, never red.
- Red means urgent signs or delete, and nothing else.
- Never use colour alone. Every state also has words, an icon or a shape.

### Mapping to shadcn tokens

Use semantic tokens in components, never raw colour values.

| shadcn token | Value |
|---|---|
| `--background` | Mist high, for solid bars and docks. The three-stop ground is on `body`. |
| `--foreground`, `--card-foreground`, `--popover-foreground`, `--secondary-foreground`, `--accent-foreground` | Ink |
| `--primary`, `--ring` | Ink |
| `--primary-foreground` | White |
| `--card` | Frost |
| `--popover` | Solid white. Use it for menus, dialogs, and anything sticky or overlapping, because Frost shows what is behind it. |
| `--secondary`, `--accent` | White at 62% |
| `--muted` | Ink at 8% |
| `--muted-foreground` | Ink 2 |
| `--border` | Frost edge |
| `--input` | Ink at 28% |
| `--destructive` | Alarm |
| `--warning`, `--warning-foreground` | Haldi, Haldi ink |
| `--chart-1`, `--chart-2` | Lagoon, Haldi |

## Type

Fonts come from `next/font/google`.

| Role | Bangla | English | Size | Line height |
|------|--------|---------|------|-------------|
| Page title | Anek Bangla 600 | Anek Latin 600 | 30 | 1.3 Bangla, 1.2 English |
| Section title | Anek Bangla 600 | Anek Latin 600 | 21 | 1.3 |
| Card title | Anek Bangla 600 | Anek Latin 600 | 18 | 1.35 |
| Lead figure | Anek Bangla 500 | Anek Latin 500 | 38 | 1.1 |
| Body | Noto Sans Bengali | Anek Latin | 17 | 1.65 Bangla, 1.45 English |
| Meta | Noto Sans Bengali | Anek Latin | 15 | inherit |
| Smallest allowed | Noto Sans Bengali | Anek Latin | 14 | inherit |

- Keep `html { font-size: 17px }`. Nothing is smaller than 14px, except bottom nav labels at 13px so all
  five fit in Bangla.
- Never apply letter spacing to Bangla, because it breaks the matra. English page titles may use `-0.01em`.
- No all-caps labels. No `·`-joined detail strings.
- Numbers use `tabular-nums`, and units are a smaller Ink 2 suffix.
- Convert digits to Bangla for display only. `rawValue` never changes.

## Shape and spacing

- Cards 24px, tiles 18px, pale icon tiles 16px, controls fully round.
- Screen margin 16px. Gap between cards 14px. Card padding 16px.
- Primary button 56px tall. Every other control is at least 48px.
- A border or a shadow, never both. Shadows only on things that float: paper, sheets and dialogs.

## Components

### Signature parts

- **Range bar** (`src/components/range-bar.tsx`). A lab value as a dot on a bar whose shaded middle is the
  printed range. Ink dot means within range, Haldi dot means outside. A hollow mark shows the previous
  value when one exists. Always paired with a status in words and the lab's own printed range.
- **Lit paper.** A Haldi highlight over the value on the real paper, on Review and Landing.
- **Gap bars** (`gap-bars.tsx`, on the shadcn `chart` component). Black bars on pale tracks, Lagoon for today. A day with no check-in is an empty dashed
  slot (a small baseline tick when slots are too narrow for dashes), and is never counted as zero. Its height
  must never suggest a value.
- **The orb** (`orb.tsx`). A glass sphere holding a paper with one lit line, built in CSS with no image. It appears only
  while AI is reading, or on Ask while waiting for a question. It is the only glow and the only
  decorative gradient besides the ground. Reduced motion stops any animation and keeps the orb.
  `ai-loader.tsx` is the shared waiting state for AI: a line sweeps down the paper, and after 8 seconds it says it is still working.

### Shared parts

| Part | Built from | Notes |
|------|-----------|-------|
| Card, lead card | `Card` variant | Frost, or Frost on for the one lead card |
| Black tile | `tile.tsx`, `lead` | 64px, one per screen, beside the lead question |
| Pale tile | `tile.tsx`, `pale` | 52px, in list rows, where an icon helps someone who reads slowly |
| Pill button | `Button` variants | `default`, `secondary`, `destructive`. `destructive-soft` is for a Delete repeated in a list. |
| Tabs | `page-tabs.tsx` | URL-driven. Active tab is a black pill. |
| Option card | `option-card.tsx` | Toggle button with `aria-pressed`, full row tappable. `urgent` has a red edge. |
| Chip | `Checkbox` or `Link` | 48px tall, wraps |
| Stepper | `stepper.tsx` | Minus, value, plus. Unset shows "Add", never 0. |
| Progress | `Progress` | Black fill. "Step 2 of 4" in words above it. |
| Page title | `page-title.tsx` | The one h1. With `back` it becomes the focused-flow title bar. |
| Sticky action bar | `sticky-action-bar.tsx` | Holds the screen's one primary. Replaces the bottom nav in focused flows. |
| Bottom sheet | `Sheet` | Add a paper |
| Urgent dialog | `urgent-dialog.tsx` | Solid white. The user's language first, the other below it. Call 999 is the largest control. |

No other component library. Charts use the shadcn `chart` component, icons use `lucide-react`.

## Layout

- Mobile first, at 390px. Single column with no sideways page scroll.
- Top-level pages: bottom nav with the same five labelled places (Home, Records, Check-in, Ask, Doctor),
  with no hidden "More" menu. The active item is a black pill.
- Focused flows (Review, Check-in steps, but not the saved screen): no bottom nav. A round back button, a centred title and a sticky
  action bar instead.
- Desktop (`md` and up): a centred pill nav in the header, on a 12-column grid. Review shows the paper and
  the value list side by side.
- The demo banner stays persistent, as one slim line.
- Disclaimer in the footer and on the Doctor pages.

### Glass limits

Blur is only on the bottom nav and the sticky action bar, so scrolling stays smooth on low-end Android.
Cards are translucent with no blur. Respect `prefers-reduced-transparency` by making surfaces solid.
Print has no ground, frost or blur: black on white.

## Pages

| Path | One question | Layout |
|------|--------------|--------|
| `/` | What is this and how do I try it? | Headline, lit paper, two language buttons in the first screen |
| `/login` | How do I get in? | Form, then one demo card |
| `/signup` | How do I start? | Form plus the privacy line |
| `/dashboard` | What should I do now? | One next-step card, latest result, sleep bars, links |
| `/records` | What needs me? | Tabs. "To check" first, then saved papers. Add a paper in a sheet. |
| `/records?tab=timeline` | How am I changing? | Lab value, one switchable chart, entries |
| `/documents/[id]`, saved | What does this mean? | What the paper says, then in simple words, then the paper. Every source link lands here. |
| `/documents/[id]` | Is this value right? | Lit paper, one value at a time, "See all values" |
| `/checkin` | How are you today? | Four steps, then a saved screen |
| `/ask` | What can I ask? | Orb, examples, composer. Then answer and sources. |
| `/show-doctor` | What do I show? | Tabs. Dates and Print first. Mobile shows averages. |
| `/show-doctor?tab=summary` | What changed, and what do I ask? | Source chips on each claim |
| Print | Can the doctor read it fast? | White A4 with the full table |

## Interaction rules

### Next step

- Home shows exactly one next step, by priority: add a paper, then check a paper, then check in, then
  show the doctor.
- The judge tour and the switch-neighbor card sit behind one quiet link on Home, for demo accounts only.

### Check-in

1. **Urgent signs.** "Do you have any of these right now?" Tapping one opens the urgent dialog at once.
   "None of these" moves on with one tap.
2. **How are you feeling.** None, Mild, Moderate or Severe, plus other symptoms. Severe opens the urgent
   dialog at once.
3. **Your body today.** Steppers for sleep, water and walking. Unset fields stay unset.
4. **Energy and an optional note.** Then Save.

Steps 2 to 4 can be skipped, and the whole check-in takes under a minute. Only entered values are saved. A reload
returns to step 1, so nobody lands past the urgent signs. Once today is saved, the check-in opens on the saved screen,
which keeps Call 999 visible for an urgent entry, and "Change" reopens the steps with today's values. The
red-flag rules in `src/lib/safety/redflags.ts` stay deterministic and unchanged by the redesign.

### Review

- One value at a time, with the value lit on the paper. A compact list jumps to any value: open on desktop, behind "See all values" on phones. Saved papers show the list read-only.
- Labels say who read the value: "Only the AI could read this", "The two readings differ".
- When readings differ, offer each as a large choice, plus "Neither is right, type it".
- Save needs every value checked, and the server enforces this.
- Words stay as written. Never swap a brand for a generic name.

### Honest data

- Show the lab's printed range, never a generic one.
- Say the record's words first, then the interpretation, and keep them visibly separate.
- Never use praise or a score. No "healthy momentum", no "+8%".
- A real zero prints as 0. A missing value is a blank or a dash.
- AI text says it may be wrong, and every claim links to the saved paper it came from, named in words rather than by ID.

### States

- Loading keeps the final layout with flat bars at real size, and no shimmer.
- Errors stay inside the block that failed, say what happened, and offer one next step.
- Empty sections keep their frame and say what will appear.
- Delete says what will go, and needs confirmation. Papers are deleted from their own page, or from the list only if they never finished reading.
- A failed load says it failed. It never shows an empty list, which would look like "you have no records".
- Print uses `window.print()`, with no server-side PDF. The printed page is its own layout: black on white, every value as written, with lab ranges and source paper names.

## Accessibility

- Text at least 4.5:1, and targets at least 48px, in both languages.
- Every icon is `aria-hidden` or has an accessible name.
- Charts and range bars have a text alternative with the actual values.
- Visible focus on every control. Everything works from the keyboard.
- Respect `prefers-reduced-motion` and `prefers-reduced-transparency`.
- Read aloud is available on explanations, answers and summaries.

## Files

- `src/app/globals.css`: tokens, ground and print rules
- `src/app/layout.tsx`: fonts and shell
- `src/lib/i18n/en.json`, `bn.json`: all visible text
- `src/components/nav-items.ts`, `bottom-nav.tsx`, `header.tsx`: navigation
- `src/components/range-bar.tsx`, `trend-chart.tsx`, `page-tabs.tsx`: signature and shared parts
