# Phase 7 — Choose your own adventure

## Checklist
- [x] Adventure list (saved in `data/adventures.jsonl`), create / duplicate / delete.
- [x] Builder (React Flow, web): DecisionNode with context ≤1000, decision ≤500, up to 5 options (label, outcome ≤500) each with a source handle; connect option → node or mark as end. Start node marker. Validation (unreachable nodes, dangling options).
- [x] Amnesia toggle, briefing ≤1000, roster 1–5 with run counts.
- [x] Engine: walk tree per run; with memory, prior nodes/choices/outcomes are included via history fragment; with amnesia each node is a fresh prompt.
- [x] Outcome view: read-only React Flow with node hit counts and option frequencies as edge labels/thickness; select a single run to highlight its path.

## Engine

`POST /api/runs` takes `{ config: { puzzle: "adventure", adventureId, amnesia, roster } }` and runs `validateAdventure` first: a missing start, a dangling option, a node without options or a duplicate id is a 400 with the message; an unreachable node is only a builder warning and does not block a run. Walks run in parallel, nodes within a walk in order, and a walk stops at an option with no next node, at a failed decision, or after 50 steps (`MAX_STEPS`), which is what a graph with a loop in it hits. `progress.total` counts **paths**, so only a walk's last step advances it.

The outcome view reads `AdventureSummary` (`lib/domain/summary.ts`), rewritten after every step, so the React Flow overlay can fill in while the run is still going:

```ts
AdventureSummary = {
  kind: "adventure";
  paths: { characterId; iteration; steps: { nodeId; optionId?; weights?; confidence?; latencyMs?; error? }[]; terminal: boolean }[];
  nodeHits: Record<nodeId, number>;
  optionHits: Record<nodeId, Record<optionId, number>>;
  perCharacter: Record<characterId, { completed; errors }>;
}
```

`terminal` is true only for a walk that ended where the graph said it should, which is what `perCharacter.completed` counts; a walk that stopped on an error or at the step cap is not terminal. `paths` carries each walk in order, so highlighting a single run's path is a lookup rather than a reconstruction.

## Done

Shipped 2026-09-21. A tree you can draw, a walk you can watch, and no `edges[]` anywhere.

### What shipped

**Dependencies.** `@xyflow/react@12.11.6` and `@dagrejs/dagre@3.1.1`. `tsconfig.json` gained `"moduleSuffixes": [".web", ""]` so an import of `./adventure-builder` typechecks against the `.web.tsx` implementation while Metro still picks `.web` or `.native` per bundle; both variants are checked, because the include glob catches them. Two layout tokens were added to `theme/tokens.ts`: `layout.canvas` (the height an embedded graph is drawn at) and `layout.inspector` (the column beside it).

**Auto-layout** (`lib/puzzles/adventure/layout.ts`). `layoutAdventure(adventure)` runs dagre top-to-bottom over the graph it reads off `options[].nextNodeId` and writes the result into `node.position`, converting dagre's centre coordinate to React Flow's top-left corner. `ADVENTURE_LAYOUT` is the one place a card's width and the gaps around it are decided, and `adventureNodeHeight(node)` grows it by one row per option, so the ranking leaves room for the card that is actually drawn. Two options leading to the same node are two dagre edges (multigraph, keyed by option id), so their labels do not collide. It is deterministic — nodes and edges go in in stored order — and safe on a half-built graph: an option pointing at a node that is not there is simply not an edge, and a loop lays out rather than hanging. Unit-tested in `layout.test.ts`.

**Graph edits** (`lib/puzzles/adventure/edits.ts`). Every gesture the builder can make, as a pure function over an `Adventure`: `addNode`, `updateNode`, `removeNode`, `setStartNode`, `addOption`, `updateOption`, `setOptionTarget`, `removeOption`, `setNodePositions`, plus `starterAdventure()` and `copyOfAdventure()`. `removeNode` is the one with teeth — options that led to the removed node become endings, and if it was the start node the first node left takes over — which is why it is tested rather than inlined into a component. `setNodePositions` returns the same object when nothing moved, so a drag that ends where it began does not mark the draft dirty.

**Client** (`lib/client/use-adventures.ts`). Both hooks read through `useAsyncResource`, so they inherit its two guards rather than re-implementing them. `useAdventures()` adds create / duplicate / delete, folding each answer into local state rather than re-listing, like `useCharacters`. `useAdventure(id)` holds the builder's draft beside a baseline — the copy the store last confirmed — and reports `dirty` by comparing the two without their timestamps, so a save that only moves `updatedAt` does not re-mark the draft as changed. A save folds into that baseline rather than into the loaded resource, which is what lets the author keep typing while the PUT is in flight without losing the keystrokes. The draft is reset during render when a different adventure arrives, not in an effect, so the builder never paints one graph's draft over another's.

### Edges are options

The domain model has no `edges[]`, and nothing in this phase added one. `components/flow/use-adventure-graph.ts` is the only translator, and it converts in both directions:

| React Flow | Adventure |
| --- | --- |
| one edge, id `` `${nodeId}::${optionId}` `` | an option whose `nextNodeId` is not null |
| `edge.sourceHandle` | the option's id — every option row has its own source handle |
| `edge.targetHandle` | `"in"`, the single target handle on a card's left edge |
| `onConnect` | `setOptionTarget(…, connection.target)` |
| `onEdgesDelete` / double-click an edge | `setOptionTarget(…, null)` — the option becomes an ending |
| `onNodeDragStop` | `setNodePositions` |

An option with no edge is an ending and the card says so. `isValidConnection` refuses a second edge out of an option that already leads somewhere, because an option leads to one node or to none — so re-pointing a branch means cutting it first. React Flow's node list is held in local state rather than derived per render, because that is where it caches each card's measured size; the adventure is only written to when a gesture finishes. Re-seeding happens during render (React's documented escape hatch) rather than in an effect, carrying the measurements across by id.

### Screens

- **`/puzzles/adventure`** — the shelf. Cards carry the name, the node count, when it was last edited and a validation badge, and offer Open / Run / Duplicate / Delete (behind a Dialog). New creates a starter adventure with one empty start node and jumps to the builder.
- **`/puzzles/adventure/[id]`** — the builder. Canvas left, inspector right (name, briefing with its counter, and the selected node's editor). The top bar is Save, Add node, Auto-layout, Validate, Fit view, Run, with a saved / unsaved / saving badge; autosave writes the draft back a beat after the last edit. Validate lists what `validateAdventure` found, blocking findings marked apart from notes, and a row selects the node it names. Run is withheld while anything blocks.
- **`/puzzles/adventure/[id]/run.tsx`** — the run. `RosterBar` (1–5, with per-character run counts), the Amnesia Switch (off by default, so a walk remembers), the briefing as it will be read, the Prompt View over `POST /api/prompts/adventure`, then `RunProgress` and the outcome view. "View in Logs" hands off to the run's detail page.

**The outcome view** is the same canvas, read-only: node cards show hits and their share of the walks, edges carry the option label with its count and a stroke scaled between a hairline and the theme's small step, and a node nothing reached is dimmed to `opacity-disabled`. `AdventureSummary` is rewritten by the engine after every step, so the overlay fills in while the run is going. Below it, every walk is listed with its character's face, its iteration, its length and how it ended; selecting one draws its path in the accent colour and opens the step list, with the reported weights per option where a provider gave them. The selection is tagged with the run it belongs to, so it is re-read from each new poll — a path grows step by step — and drops itself when a new run starts.

### Platform and SSR

`components/flow/*.web.tsx` hold the real canvas; `.native.tsx` siblings render the same panel at the same height saying the builder needs a browser. Everything else on the run screen — roster, Amnesia Switch, prompt view, progress, the walk list — works on native.

The web build is server-rendered and React Flow needs a DOM as soon as it is evaluated, so `canvas-host.web.tsx` keeps it behind `lazy(() => import("./adventure-canvas.web"))` and decides whether it is in a browser with `useSyncExternalStore` (server snapshot `false`, client `true`), which keeps the delivered markup and the first client render in agreement. React Flow therefore never reaches the server bundle — a native bundle contains `adventure-builder.native` and no `@xyflow` module at all — and `@xyflow/react/dist/style.css` is imported only inside that chunk. `/puzzles/adventure`, `/puzzles/adventure/<id>` and `/puzzles/adventure/<id>/run` all answer 200 from the dev server.

### Theme

React Flow draws with inline styles, so `components/flow/flow-style.ts` is the one place theme values become style objects, all of them read from `useTheme()`. `canvasStyle` also hands React Flow its own CSS variables (`--xy-controls-*`, `--xy-minimap-*`, `--xy-edge-*`, `--xy-handle-*`, `--xy-connectionline-*`), so the controls, mini-map, connection line and attribution join the manuscript instead of only the nodes. The background is React Flow's dot grid in `colors.border` at `spacing.xl`; the mini-map is card-on-border. Card content is Tailwind token classes throughout.
