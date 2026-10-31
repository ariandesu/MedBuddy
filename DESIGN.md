# MediSathi Design System — "স্বাস্থ্য খাতা" (Health Notebook)

## Overview

MediSathi uses a mobile-first, icon-based design system inspired by a health notebook ("স্বাস্থ্য খাতা"). The design prioritizes low health literacy users with large tap targets, clear icons, high contrast, and Bangla-first typography.

## Design Tokens

### Colors

| Name | Hex | OKLCH | Usage |
|------|-----|-------|-------|
| Shapla teal | `#0E6B5E` | oklch(0.521 0.134 160.0) | Primary — buttons, links, active states |
| Haldi | `#E3A72F` | oklch(0.686 0.155 46.0) | Secondary — warm accents, highlights |
| Alarm | `#C2402F` | oklch(0.542 0.174 26.4) | Destructive — delete, errors, urgent |
| Paper | `#F6F8F6` | oklch(0.963 0.008 142.1) | Background |
| Ink | `#18282A` | oklch(0.196 0.012 142.0) | Foreground — headings, body text |

### Typography

| Element | Font | Size | Line Height | Usage |
|---------|------|------|-------------|-------|
| Headings / numbers | Anek Bangla | 17px+ (mobile base) | 1.5 | Page titles, card titles, numbers |
| Body | Noto Sans Bengali | 17px (mobile base) | 1.65 (Bangla) | Body text, labels, descriptions |
| UI / labels | Noto Sans Bengali | 17px | 1.5 | Button text, form labels |

- Base font size: 17px on mobile (html `font-size: 17px`)
- Bangla line height: 1.65 (`html[lang="bn"] { line-height: 1.65 }`)
- No ALL-CAPS labels anywhere
- No `·`-joined detail strings

### Spacing & Components

- Card radius: 0.625rem (`--radius`)
- All buttons: `min-height: 48px` (≥48px tap target)
- All nav links/buttons: `min-height: 48px`, `min-width: 48px`
- Mobile-first: single column on mobile, grid on desktop (md+)
- Navigation: the same five places everywhere (Home, Records, Check-in, Ask, Doctor). Mobile: bottom bar, no hidden "More" menu. Desktop: centered pills in the header.
- Range bar (`src/components/range-bar.tsx`): the signature element. A lab value as a dot on a bar whose shaded middle 50% is the normal range. Teal dot = within range, Haldi dot = outside.
- Red (Alarm) is reserved for urgent symptoms and destructive actions. "Needs checking" uses Haldi, never red.
- CSS tokens in `globals.css` are the hex values above converted to OKLCH; Haldi is a fill colour only, text on it uses `--warning-foreground` (#7A5200).

## Pages

| Path | Purpose | Layout |
|------|---------|--------|
| `/dashboard` | Quick actions, status cards | Icon grid cards |
| `/records` | Combined Documents + Timeline | Tabs: Documents / Timeline |
| `/documents` | Upload + document library | Card grid |
| `/documents/[id]` | Side-by-side review | Desktop: split; Mobile: Tabs |
| `/checkin` | Daily wellness check-in | Card with sliders/radio |
| `/timeline` | Merged records + check-ins | Chronological list + charts |
| `/show-doctor` | Combined Summary + Report | Tabs: Report / Summary |
| `/summary` | Health summary | Section cards |
| `/report` | Print-ready doctor report | Print-optimized |
| `/ask` | Grounded Q&A | Search + answer card |
| `/login` | Login + demo start | Centered card |
| `/signup` | Account creation | Centered card |

## Interaction Rules

- Tapping symptom text toggles the checkbox (check-in page)
- No skip checkboxes — only entered values are saved
- Every field is optional, completable in < 1 minute
- "Confirm" on review page requires all fields checked (server-enforced)
- Urgent-care dialog shows in user's language (Bangla default)
- Date range picker on report/show-doctor pages
- Print via `window.print()` — no server-side PDF

## Accessibility

- All buttons ≥ 48px tap target
- All icons have `aria-hidden`
- Color contrast meets WCAG AA (Ink on Paper)
- No color-only information — icons + text + badges
- Focus visible via `outline-ring/50`

## Files

- `src/app/globals.css` — design tokens + base styles
- `src/app/layout.tsx` — font imports (Anek Bangla, Noto Sans Bengali)
- `src/lib/i18n/en.json` + `bn.json` — all user-visible strings
- `src/components/nav-items.ts` — navigation structure
- `src/components/bottom-nav.tsx` — mobile bottom nav
- `src/components/header.tsx` — desktop header
