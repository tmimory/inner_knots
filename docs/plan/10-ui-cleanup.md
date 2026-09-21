# Phase 10 — UI cleanup

Four complaints from using the app, each its own commit. Diagnosed 2026-09-21 with a
headless Chromium run against the dev server (`scripts` in the session scratchpad, not
in the repo).

## 1. Navigation flicker

**Symptom.** Every left-menu click flashes the whole screen: the wordmark stretches
across the top, then snaps back into the left column.

**Cause, verified.** Two faults stack.

- Each click is a full document load, not a client-side navigation. `LeftMenu` passes
  `onPress={onNavigate}` to `<Link asChild>`. expo-router's `Link` spreads `...rest`
  after its own navigation `onPress`, so the menu's `onPress` (even when it is
  `undefined`) replaces the navigation handler; on web the navigation is also attached
  as `onClick`, which RNW's `Pressable` overwrites with its own press handler. Nothing
  calls `preventDefault`, so the anchor navigates natively.
- The server-rendered HTML is the narrow layout. `AppShell` decides column-vs-drawer
  from `useWindowDimensions()`, which is `0` on the server, so every full load paints the
  hamburger header first and switches to the column once the client hydrates.

**Fix.**
- [x] `LeftMenu`: move `onPress={onNavigate}` from `Link` onto the `Pressable` child, so
      Radix `Slot` composes it with the navigation handler instead of replacing it.
- [x] Breakpoint as CSS: the theme generator emits `screens.wide` from
      `layout.wideBreakpoint`; `AppShell` renders the menu column `hidden wide:flex` and
      the narrow header `wide:hidden`, so the SSR HTML is right at any width with no JS.
- [x] The two screens that toggle classes on `useWideViewport()` for pure layout
      (`app/logs/[id].tsx`, `app/puzzles/adventure/[id].tsx`) use `wide:` classes instead.
      `useSideBySide` stays: it depends on a count, not only on width.
- [x] Verified in headless Chromium: one `load` event per session, no hamburger frame on
      any menu click, and the SSR HTML for a wide viewport shows no hamburger.

## 2. The loops

**Symptom.** The Greek-key meander rows (wordmark, under every page title on the
Characters and Adventure screens, along the top of every `Scroll` panel) are distracting;
on the Characters and Adventure shelves two of them sit one above the other.

**Fix.** Retire the ornament rather than tune it.
- [x] Delete `components/shell/greek-key.tsx`; drop the `ornament` prop from `Scroll` and
      `PageHeader`; delete `CharactersHeader`, which only existed to pass `ornament`.
- [x] `Wordmark`: a short gilt rule (`h-xxs w-3xl bg-accent`) under the name.
- [x] `PageHeader`: a hairline rule under the title block, on every screen alike.
- [x] `Scroll`: no ornament strip; hairline edge and the soft shadow, so a panel weighs
      the same as a `Card`.
- [x] `docs/architecture.md` stops naming the ornament.

## 3. Spacing and widths

**Symptoms, from screenshots.** Panels pad 24px inside but sit 16px apart, so a page
reads as one slab; heading-to-content gaps use 2px in places; on a phone the page title
breaks one syllable per line because the header row never wraps and the right-hand
badges keep their width.

**Rhythm.** One scale, applied everywhere:

| Where | Value |
| --- | --- |
| Page padding | `p-lg` narrow, `wide:p-xl` |
| Between page sections | `gap-xl` |
| Page header | title/subtitle `gap-xs`; wraps or stacks on narrow; `pb-lg` above its rule |
| Panel padding | `p-lg` narrow, `wide:p-xl`; inner `gap-lg` |
| Section heading → content | `gap-lg`; title/description `gap-xs` |
| Field label → control | `gap-xs`; between fields `gap-lg` |
| Card | `p-lg`, inner `gap-sm` |
| Dialog | `p-xl`, inner `gap-lg` |
| Chip / badge rows | `gap-xs` |
| `gap-xxs` | only inside a control (stepper, chip), never between lines of text |

- [x] Shell, header, panel, section, field, card, dialog primitives carry the rhythm.
- [x] Every screen and `components/**` audited against the table; `min-w-menu` wraps
      stay, `max-w-content` stays at 1120.
- [x] Narrow header no longer crushes the title; verified at 420px and 1440px.

## 4. Rosters live on the puzzle page

**Symptom.** The Characters screens call themselves "the roster" ("0 on the roster",
"An empty roster", "Back to the roster"), which says rosters are edited there. They are
not: each puzzle page seats its own roster from the characters that exist.

- [x] Characters screens, their hooks and comments, and the README say "characters";
      "roster" is reserved for the cast a puzzle page seats.
- [x] The Characters screen says in one line that rosters are built on the puzzle pages.

## Done

Shipped 2026-09-21, one commit per item, in the order 4, 1, 2, 3, then a critic sweep.

**Rosters** (`0a496fa`). Copy and comments only. The Characters screens, their hooks
and the README now say "characters"; the index screen opens with "Characters are made
here; each puzzle page seats its own roster from them." Nothing in `lib/domain` or the
puzzle screens was renamed.

**Navigation flicker** (`753af8b`). Both faults confirmed in headless Chromium before
and after: a menu click now fires one `framenavigated` and no `load`, and every 30ms
sample for 1.5s after a click shows the menu column rendered and the hamburger not.
`useWideViewport` stays for `useSideBySide`, which depends on a count as well as a
width; the drawer's open state is the only layout decision still in JS.

**The loops** (`8f16eee`). Retired rather than tuned. Along the way the implementer
found that `cn()`'s tailwind-merge did not know the theme's named border widths, so it
read `border-hairline` as a colour and let a following `border-border` delete it:
cards, panels, chips and the old `Scroll` had never drawn the edge their source asked
for. `lib/utils.ts` now extends tailwind-merge with `Object.keys(borderWidths)`. The
visible consequence is that declared hairlines now draw everywhere, which is what the
components always said they did.

**Spacing** (`c577348`). The rhythm table above, applied through the primitives first
and then audited screen by screen. Two decisions beyond the table: the page header
stacks on narrow rather than wrapping, because the badge-and-button cluster still
squeezed the title when it wrapped; and the Logs day heading sits `gap-md` above its
rows because the page's `gap-xl` already separates one day from the next. `gap-xxs`
survives only inside controls (stepper, segmented, tabs, chip rows, menu rows, the
wordmark rule). The empty roster seat is labelled "Add" because "Add character" was
truncating at the avatar width.

**Critics.** secrets-critic: 0 findings, `.env.example` and the reads in sync both ways.
design-token-critic: 0 findings on the diff and on the whole of `components/shell`,
`components/ui` and `lib/utils.ts`; the `wide:` variant is backed by
`layout.wideBreakpoint`. duplication-critic: 3 findings; see the follow-up commit.
A visual-critic pass on the trolley screen (5.5/10) asked for things outside this
phase: a sticky primary Run action in the header, dropping the outer panel on the
roster and framing sections, one accent hue for selection, warm rail colours, fewer
small caps, and five seat slots drawn in a row. Recorded here as candidates for a
later pass, not acted on.

**Duplication follow-up.** Of the three findings, two taken: the run detail's local
`Stat` was `FieldCode` from `components/logs` under another name, and fifteen screens
opened with the same `<View className="gap-xl"><PageHeader …/>` shell, which is why the
spacing pass had to touch every one of them. `components/shell/screen.tsx` now owns
that shell; `PageHeader` is used only from there. The third, a shared split-pane for
the two screens that lay a panel beside a canvas or a tree, was left: one class string
at two sites is thinner than the component would be.
