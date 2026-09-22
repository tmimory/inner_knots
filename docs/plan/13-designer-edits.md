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

_(filled in as items land)_
