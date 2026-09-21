# Phase 9 — Polish and review

## Checklist
- [x] Run duplication-critic, design-token-critic, secrets-critic on the whole tree; apply worthwhile findings.
- [x] README: quick start, providers and env vars, where data lives, how to add a puzzle / prompt / object / theme.
- [x] CLAUDE.md: real commands and code organization.
- [x] Final typecheck, lint, tests.

## Done

Shipped 2026-09-21. Nothing new is visible on screen; what changed is that the same
idea is now written once. Two rounds: an earlier consolidation commit, then the three
critic sweeps and what they turned up.

### The earlier consolidation

`d97a5f4 polish: consolidate polling, form primitives, confirm dialog, prompt preview`
took the first pass: one `usePolled` behind every run-progress view, one `Field` /
`FormSection` pair behind the character and object forms, one `ConfirmDialog` in place
of four hand-built "are you sure?" dialogs, and one `usePromptPreview` behind the three
Prompt View buttons. `86255cd` followed it with the React Native `pointerEvents`
deprecation in the trolley animation.

### The critic sweeps

**secrets-critic — 0 findings.** Every environment read goes through
`lib/storage/paths.ts` (`DATA_DIR`) or the provider layer's key lookup, the reads and
`.env.example` are in sync in both directions, and git history carries no literal
credential. The prompt markdown holds puzzle prose only.

**design-token-critic — 1 finding, low, fixed.** `components/puzzles/trolley/trolley-animation.tsx`
was the last piece of motion in the app choosing its own curve, with
`Easing.inOut(Easing.cubic)` written inline. `theme/tokens.ts` gained an `easings`
group — control points rather than a `cubic-bezier(...)` string or a Reanimated value,
so the file stays importable by the Node CSS generator — the generator now emits
`--easing-standard: cubic-bezier(0.65, 0, 0.35, 1)` and a Tailwind
`transitionTimingFunction.standard`, and the animation reads
`Easing.bezier(...theme.easings.standard)`. A re-sweep over the whole change set came
back at zero.

**duplication-critic — 5 findings, 4 applied.** A re-sweep over the finished change set
confirmed all four landed and found two stragglers of the count ternary, one of which
(`json-tree.tsx`) was taken; it also noted that `node-editor.tsx` and `character-form.tsx`
share a *boolean* confirm-delete shape — no list target to remember — and agreed with
itself that at two sites the abstraction would be as thin as the code it replaced.

1. *The nullable-target delete dialog*, written out in the adventure shelf and the
   trolley object creator: `useState<T | null>`, an `open={target !== null}`, an
   `onOpenChange` that has to re-read the target, and a confirm handler that must clear
   the target before firing so the dialog does not sit open describing a deleted row.
   Now `usePendingDelete<T>()` in `lib/client/use-pending-delete.ts` →
   `{ target, open, request, cancel, onOpenChange, confirm }`. The action runs outside
   the state updater, because an updater may be replayed and a deletion may not. The
   object creator keeps its separate `removing` spinner id: that is a different
   question (which row is in flight) from which row is aimed at.
2. *The viewport comparison*, `useWindowDimensions().width >= layout.wideBreakpoint`,
   in five files — which meant the shell's idea of "wide" and a panel's could drift by
   one edit. Now `lib/client/use-viewport.ts`: `useWideViewport()` for the shell, the
   run detail and the adventure builder; `useSideBySide(count)` — wide *and* more than
   one panel — for the Prompt View and the histogram. The breakpoint itself still lives
   in `theme/tokens.ts`; the hook is only the reading of it.
3. *The count ternary*, `n === 1 ? "run" : "runs"`, twelve times over, including a
   byte-identical `errorNote` in both results panels. `lib/format.ts` gained
   `pluralize(count, singular, plural?)` and `countNote(...)`, which is `pluralize` but
   silent at zero — a bar's aside should read nothing, not "0 errors". Both `errorNote`
   copies are gone; the other straightforward sites followed, `components/logs/json-tree.tsx`
   among them on a re-sweep. Two were left alone because the helper would have changed
   the sentence: the adventure delete dialog's "and its 3 nodes go for good" (no clean
   singular reading) and the round grid's "3 more games in the logs", where `more` sits
   between the count and the noun and `pluralize` carries the count with it.
4. *The RosterBar empty state.* "No characters yet. / Make one →" was written around
   the bar in the trolley and dilemma screens and simply missing from the adventure run
   screen. `components/puzzles/roster-bar.tsx` now renders it itself when
   `characters.length === 0` — it is a shell-level component, so owning the link to
   `/characters` is fair — the two screens dropped their branch, and the run screen
   gained the message for free.
5. *`decisionFields` across the three summary reducers* — **deliberately skipped.**
   The shared part is four lines repeated at three sites, and each reducer reads its
   own decision shape around them; extracting it would have bought less than it cost in
   indirection.

### Verification

`npm run typecheck`, `npm run lint` and `npm test` clean: **302 tests across 33 files**,
four of them added here for `pluralize` and `countNote` in `lib/format.test.ts`.

Booted against `npx expo start --web --port 8105` with a scratch `DATA_DIR`:
`/characters` (74 KB), `/puzzles/trolley` (118 KB), `/puzzles/prisoners-dilemma`
(120 KB), `/puzzles/adventure` (74 KB) and `/logs` (77 KB) all answered 200 and
server-rendered their shells, with no warnings or errors in the Metro log. With the
scratch store empty, the trolley and dilemma screens both rendered the relocated
"No characters yet. / Make one" state from inside `RosterBar`. An adventure created
through `POST /api/adventures` served `/puzzles/adventure/<id>/run` at 200. The server
was stopped and the scratch data removed afterwards.

Token grep over every touched file: no hex or `rgb()` literals, no arbitrary Tailwind
values, no raw palette classes, no numeric style literals outside the layout keywords
(`position: "absolute"`, `0`, `pointerEvents: "none"`) the animation overlay needs.
