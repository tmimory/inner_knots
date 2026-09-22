# Phase 13 — Deleting, rewiring, and a full-width inspector

Two complaints from using the adventure designer, requested 2026-09-22. Two
implementers run in parallel with disjoint file ownership; each item lands as its
own commit once the whole tree passes `typecheck`, `lint` and `test`. The critics
(duplication, design-token, secrets, visual) run once on the stable tree at the end.

## 1. Delete nodes and connections; rewire

**Symptom.** The canvas can delete a card with Backspace and an edge with a
double-click, but nothing says so, edges cannot be dragged to a new card
(`edgesReconnectable={false}`), and a handle whose option already leads somewhere
refuses a new connection instead of moving it. The inspector shows where each
option leads as a sentence the author cannot change.

**Design — canvas.**
- Rewiring by gesture. A new connection dragged from an option that already leads
  somewhere *re-points* it (the newest target wins; an option leads to one node or
  none). `isValidConnection` only refuses an edge to the option's own card.
  `edgesReconnectable` is on in the builder: dragging either end of an edge to a
  new handle calls `setOptionTarget` for the option it stood for (old option back
  to `null` if the source end moved); dropping an end on the pane
  (`onReconnectEnd` without a successful reconnect) deletes the edge.
- A visible way to delete an edge. The builder uses a custom edge type
  (`components/flow/option-edge.web.tsx`): the same smooth step path as now
  (`BaseEdge` + `getSmoothStepPath` with the bundle's `pathOptions`), and, through
  `EdgeLabelRenderer`, a small round "×" button at the path's midpoint that is
  drawn only while the edge is focused (hovered or pinned via `FlowFocus`) or
  selected. Pressing it disconnects the option. Double-click keeps working. The
  outcome view keeps the built-in `smoothstep` edge and its `×hits` label.
- A visible way to delete a card. In the builder the selected card shows a
  `NodeToolbar` (position top, aligned end) with one ghost `Button` reading
  "Delete node"; the Delete and Backspace keys do the same
  (`deleteKeyCode={["Backspace", "Delete"]}`). Neither removes anything itself:
  `onBeforeDelete` returns `false` for any deletion that includes nodes and calls
  the new `onRequestDeleteNode(nodeId)` prop, so the screen can confirm it in the
  one `ConfirmDialog` it owns. Edge-only deletions go straight through
  `onEdgesDelete` as now.
- Every colour, size, radius and shadow on the new edge button and toolbar comes
  from `useTheme()` through `flow-style.ts`; nothing is hard-coded.
- The helper line in the empty inspector says the gestures: click a card to write
  it, drag a handle to another card to connect or re-point it, drag an edge's end
  onto the pane to cut it.

**Contract (both owners build to it).** `AdventureBuilderProps` gains
`onRequestDeleteNode: (nodeId: string) => void`. The canvas asks; the screen
confirms and applies `removeNode`. Edge edits are applied directly through
`onChange` with no confirmation.

**Design — inspector.**
- Each option row's "leads to …" sentence becomes a `Select` labelled "Leads to",
  whose items are "Ends the adventure" and every *other* node, named by its
  decision (truncated) or its id. Changing it calls `setOptionTarget`; the canvas
  redraws the edge. A target that no longer exists is shown as its id so the
  author can fix it.
- The `NodeEditor` no longer owns the delete `ConfirmDialog`: it takes
  `onRequestDelete: () => void` (replacing `onRemoved`) and its "Delete node"
  button calls it. The screen owns one `pendingDeleteNodeId` state and one
  `ConfirmDialog`, fed by both the inspector button and the canvas's
  `onRequestDeleteNode`; confirming applies `removeNode` and clears the selection
  if the deleted card was selected.

**Owner A (canvas).** `components/flow/**`, `lib/puzzles/adventure/edits.ts`
(+test, only if a helper is needed), `docs/architecture.md` (the builder
paragraph). Read-only elsewhere.

**Owner B (inspector and screen).** `components/puzzles/adventure/**`,
`app/puzzles/adventure/[id].tsx`. Read-only elsewhere.

## 2. The inspector at full width

**Symptom.** The inspector under the canvas is capped at `max-w-measure` (520px),
so on a wide page the editor sits in a half-width column beside nothing.

**Design.**
- The inspector column takes the full width of the page (`w-full`, no measure).
- The `NodeEditor` uses the width: Context and Decision sit side by side in one
  row on wide viewports (`md:flex-row`, each `flex-1`), stacked on narrow ones.
  Each option is one full-width block: the number, the label input and the
  "Leads to" select share the first row (label `flex-1`, select at a fixed
  comfortable width from the theme's layout tokens, e.g. `w-inspector`), the
  Outcome textarea spans the width beneath, the remove button stays on the first
  row's right edge.
- The adventure panel (Title, Briefing) is full width too; the Title input stays a
  single field across the row.
- No new literals: widths, gaps and breakpoints are tokens/Tailwind classes.

**Owner B** (with 1).

## Done

Both landed 2026-09-22 in one commit (the inspector's select and its full-width
layout are the same edit of the same rows); the whole tree passed typecheck, lint
and 372 tests, and the four critics ran on the stable tree.

- [x] **1.** Canvas: a connection dragged from a taken option re-points it;
      `edgesReconnectable` in the builder, with `onReconnect` moving the option
      and `onReconnectEnd` cutting an edge dropped on the pane. The builder's
      `option` edge type (`components/flow/option-edge.web.tsx`) draws a round ×
      at the path's midpoint while the edge is focused or selected; the selected
      card carries a `NodeToolbar` with "Delete node"; Backspace and Delete do
      the same. No deletion of a card happens on the canvas: `onBeforeDelete`
      refuses and calls `onRequestDeleteNode`, and the screen owns the one
      `ConfirmDialog`, fed by the toolbar, the keys and the inspector's button.
      `BuilderActions` is a small context (`null` in the outcome view) that hands
      the two callbacks to cards and edges without putting closures in node data.
      Inspector: each option's "leads to" sentence is a `Select` ("Ends the
      adventure" or any other card, plus a "gone: id" item for a missing target).
      Found in the browser after the implementers finished: the × took no clicks,
      because the focused edge is lifted to the `menu` layer and React Flow draws
      that layer above the label renderer; the button now sits at `zIndex.sticky`.
      And the toolbar covered the × of any edge arriving under it, because a
      selected card is lifted to a vendor z-index and the toolbar one above it;
      `elevateNodesOnSelect` is off (laid-out cards never overlap).
- [x] **2.** The inspector is `w-full`; Context and Decision share a row above the
      `wide` breakpoint (the theme's only one; `md` here is a spacing token); each
      option is one block with the label, the `w-inspector` "Leads to" select and
      the remove button on the first row and the Outcome across the second.

Verified with Playwright against the running app: × click with and without the
target card selected, toolbar and Backspace both open the dialog, drag an edge
end to another card (re-targeted), drag it to the pane (cut), drag from a taken
handle (re-pointed, and the inspector's select agrees), and the select itself.

**Critics.** Secrets and design tokens: nothing. Duplication: the screen's
hand-rolled confirm state became `usePendingDelete`, as the adventure list
already uses; the hover set-and-clear pair (row, handle, edge ×) is one
`optionHoverHandlers` in `flow-focus.tsx`. Declined: composing React Flow's
`SmoothStepEdge` inside the option edge, since the × still needs the path call
for its midpoint, so nothing would be removed. Visual critic 6.5/10. Taken: the
option's text field is labelled "Option n" so it shares a baseline with "Leads
to"; Context and Decision open at the same height; "Add option" is a small
button rather than a bar across the page. Left: a side rail for the inspector
(phase 12 chose one column, and this phase asked for the width); one selection
hue across card, edge and row; hiding counters until near the limit; wider cards
or wrapping option rows; the vendor attribution.
