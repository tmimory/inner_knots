# Phase 12 — One column, many games, a readable tree

Four complaints from using the app, requested 2026-09-22. Two implementers run in
parallel with disjoint file ownership; each item lands as its own commit once the
whole tree passes `typecheck`, `lint` and `test`. The critics (duplication,
design-token, secrets) run once on the stable tree at the end.

## 1. One column, like the trolley

**Symptom.** The prisoner's dilemma and the adventure builder are two columns (a
main column and a rail); the trolley is one. Side by side buys nothing on either.

**Design.**
- Prisoner's dilemma: the `SplitPane` goes. The page reads top to bottom in the
  trolley's order — Setup, Rules, then the run as a footer of the last section (a
  hairline row: the decision count on the left, the filled button at the right
  edge), `RunProgress` and the pending answers under it, and a "What they chose"
  section that appears once a round has come back. "View prompt" moves into the
  `right` slot of the Framing subsection or the Rules section, as the trolley does.
- The Prompt View is unchanged: its two panels stay side by side on a wide
  viewport, because reading the two rooms against each other is the point.
- Adventure builder: canvas first, full width, at the canvas height the theme
  gives it; the inspector below it, full width, with its fields capped to the
  reading measure so a title field is not a thousand pixels wide. Selecting a card
  on the canvas still fills the inspector.
- `SplitPane` stays for the logs and the character form.

**Owner A.** `app/puzzles/prisoners-dilemma.tsx`, `app/puzzles/adventure/[id].tsx`,
`components/puzzles/prisoners-dilemma/**`, `components/puzzles/adventure/**`,
`lib/puzzles/prisoners-dilemma/ui-helpers.ts` (+test). Read-only elsewhere.

## 2. No crossings in the tree

**Symptom.** dagre orders a rank without knowing which handle an edge leaves
from, so a card whose option 1 leads left and option 2 leads right can have its
children placed the other way round, and the two edges cross. Cards cannot be
dragged, so the crossing cannot be undone by hand.

**Design.**
- After dagre, a top-down sweep re-orders each rank by the handles its edges
  arrive from: every card's wanted x is the mean of the x of the source handles
  pointing at it (parents already placed), the rank's cards are sorted by that,
  and the rank's existing x slots are handed out in the sorted order. Cards are
  one width, so swapping slots keeps the rank's spacing. A card with no incoming
  edge from above keeps its dagre order.
- The handle's place along the bottom edge is one formula in `layout.ts`
  (`optionLaneCentre(index, count)`), read by both the layout and `handleStyle`.
- A test builds a shape that crosses under plain dagre (a fork whose first option
  leads to the node dagre puts second) and asserts the sweep uncrosses it, with a
  crossing counter over edges between consecutive ranks.

## 4. Which option is which edge

**Symptom.** On a forked card the rows are numbered but the edges are not, so the
reader counts handles from the left to know which line is which choice.

**Design.**
- Every source handle on a card with more than one option carries its number
  beneath it, on the canvas, so an edge visibly starts at "2" and row 2 reads "2".
- Hover or click couples them both ways: hovering (or selecting) an option row
  lights its edge in the primary colour at the highlighted width; hovering or
  selecting an edge lights the option row it leaves from. A small React context
  inside the canvas holds the focused `{ nodeId, optionId }`; `useAdventureGraph`
  takes it and tones the edge, and `DecisionNode` reads it for the row.
- Works in both moods (builder and outcomes); the outcome overlay keeps its
  `×hits` label.

**Owner B (2 and 4).** `lib/puzzles/adventure/layout.ts` (+test),
`components/flow/**`. Read-only elsewhere.

## 3. Many games of the single bargain

**Symptom.** "Games" only appears with the iterated length, and picking Single
resets it to one. One game of a single round is one data point.

**Design.**
- The Games stepper is always shown; the single/iterated switch stops touching
  `runs`. "Rounds per game" still appears only for the iterated game.
- Results: the game-by-game grid is drawn whenever there is more than one game or
  more than one round ("Game by game" when it is one round per game), so a run of
  twenty single games reads as twenty rows. The footer says games and rounds.
- Domain, engine and runner already take `runs` with `iterations: 1`; nothing
  below the screen changes.

**Owner A** (with 1).

## Done
