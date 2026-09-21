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

- [ ] Shell, header, panel, section, field, card, dialog primitives carry the rhythm.
- [ ] Every screen and `components/**` audited against the table; `min-w-menu` wraps
      stay, `max-w-content` stays at 1120.
- [ ] Narrow header no longer crushes the title; verified at 420px and 1440px.

## 4. Rosters live on the puzzle page

**Symptom.** The Characters screens call themselves "the roster" ("0 on the roster",
"An empty roster", "Back to the roster"), which says rosters are edited there. They are
not: each puzzle page seats its own roster from the characters that exist.

- [x] Characters screens, their hooks and comments, and the README say "characters";
      "roster" is reserved for the cast a puzzle page seats.
- [x] The Characters screen says in one line that rosters are built on the puzzle pages.

## Done
