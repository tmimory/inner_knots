# Phase 5 — Trolley problems

## Checklist
- [x] Object catalogue generator `lib/puzzles/trolley/catalogue.ts`: subjects (stranger, man, woman, child, boy, girl, teenager, tween…), age modifiers (young, old), states (pregnant), relations (your / your friend's / your neighbor's / your enemy's) × roles (husband, wife, spouse, son, daughter, child, eldest/youngest/middle/firstborn…), pets and livestock with modifiers, singular items (a million dollars, the Mona Lisa, the last white rhino…). Each produces `{ id, label, prompt, icon, tags }`. Custom objects from `data/objects.jsonl` merge in.
- [x] Object creator dialog: icon picker, id, prompt ≤250. Saved via `/api/objects`.
- [x] Roster bar (1–5 characters, per-character run count).
- [x] Track board: two tracks, drag objects from a searchable palette onto tracks (gesture-handler + tap fallback), remove, randomize (5 each).
- [x] Prompt variant selector (thought experiment / trolley company employee / bystander); Prompt View sheet shows the composed puzzle prompt (without character).
- [x] Run: `/api/runs` with trolley config; progress bar; trolley animation that plays each decision as it arrives (heads toward chosen track).
- [x] Histogram per character (Track 1 vs Track 2); Jev weights recorded per decision and shown as mean weight.

## Engine

The run side of this phase already exists. `POST /api/runs` takes `{ config: { puzzle: "trolley", variant, track1: id[], track2: id[], roster } }` and answers 202 with the queued run; ids resolve against the user's objects first and the built-in catalogue second, and an unknown id is a 400 naming it. `progress.total` is Σ roster runs.

The screen reads `TrolleySummary` (`lib/domain/summary.ts`), which the engine rewrites after **every** decision, so the trolley animation and the histogram can be driven straight off a poll:

```ts
TrolleySummary = {
  kind: "trolley";
  decisions: { characterId; iteration; choice?: "track1" | "track2"; weights?; confidence?; latencyMs?; error? }[];
  perCharacter: Record<characterId, { track1; track2; errors; meanWeights?: { track1; track2 } }>;
}
```

`useRun(runId)` (`lib/client/use-run.ts`) polls until the run settles and hands back `{ run, summary, isRunning, error, refresh }` with the summary already narrowed by `kind`; `useRunStarter()` gives `{ start(config), runId, starting, error }`. A decision that failed appears in `decisions` with an `error` and no `choice`, and in that character's `errors` — the histogram should show it rather than drop it.

## Done

Shipped 2026-09-21. The screen is built, and with it the five shared components phases 6 and 7 are meant to reuse.

### Shared puzzle components

All three puzzle screens are the same shape — roster, framing, setup, run, results — so the parts that are not about the trolley live one level up, in `components/puzzles/` and `components/charts/`.

```ts
// components/puzzles/section.tsx
<Section title description? right? className?>{children}</Section>
// A Scroll panel with a display-font heading and a slot for the controls that act on it.

// components/puzzles/variant-select.tsx
type VariantOption<Id extends string> = { id: Id; label: string; description: string };
<VariantSelect<Id> value onChange options label? className? />
// A segmented radio group. The description is part of the control, not a tooltip.
// The copy is UI copy; what the model reads stays in prompts/<puzzle>/variant-*.md.

// components/puzzles/run-progress.tsx
<RunProgress run={Run | null | undefined} idleMessage? className? />
// Status badge, "done / total", a ticking elapsed clock, the bar, a Cancel button
// while the run is live, and the run's error when it failed. Cancel calls
// `cancelRun(run.id)` itself; the caller only hands it the polled run.

// components/puzzles/prompt-view.tsx
type PromptPanel = { label?: string; system?: string; user: string; options: PromptOption[] };
<PromptView open onOpenChange title description? panels loading? error? />
// A dialog of composed prompts in monospace parchment blocks. Several panels sit
// side by side above `layout.wideBreakpoint` and stack below it — the dilemma
// needs two, the trolley and the adventure one.

// components/charts/histogram.tsx
type HistogramSeriesSpec = { id; label; color?: SeriesColorKey };
type HistogramGroupSpec  = { id; label; values: Record<seriesId, number>;
                             weights?: Record<seriesId, number>;
                             accessory?: ReactNode; note?: string };
<Histogram series groups emptyMessage? showWeights? className? />
// Grouped horizontal bars. `color` names a theme key; unset series take
// SERIES_COLOR_KEYS in order (track1, track2, secondary, accent, primary,
// mutedForeground). `accessory` is what puts an avatar beside a group's label,
// `note` is the "2 errors" aside, and a `weights` entry renders as
// "mean weight 0.71 · 71%" under its bar.
```

`lib/charts/histogram.ts` holds the arithmetic — `buildHistogram(series, groups)` → `{ rows, max, empty }` — so the interesting part is unit-tested without rendering. Every bar is scaled against the longest bar in the **whole chart**, not against its own group, so two characters asked a different number of times still read against each other. A group with nothing in it keeps its bars at zero rather than disappearing.

### The trolley screen

`app/puzzles/trolley.tsx` composes five sections: the roster (`RosterBar`, 1–5, per-character runs, with a link to `/characters` when there are none), the framing (`VariantSelect` + a Prompt View button), the tracks (`TrackBoard` + `ObjectPalette`), the run (`RunProgress` + "Pull the lever"), and the results (`TrolleyResults`).

**`components/puzzles/trolley/`**

| File | What it is |
| --- | --- |
| `geometry.ts` | Every pixel the screen draws with: `BOARD`, `TROLLEY`, `PALETTE`, and the pure helpers `railY`, `laneTop`, `laneLeft`, `straightRail`, `branchRail`, `tieXs`, `restPoint`, `travel`. The one file allowed literal numbers. |
| `track-board.tsx` | Two tracks as one SVG sized to the measured width, with the lanes as ordinary views laid over it. Exports `TRACK_ZONE_IDS`, `trackOf`, `zoneOf`. |
| `use-drop-zones.ts` | `useDropZones(ids)` → `{ bind, hitTest, remeasure }`. Window-space rectangles for a gesture to hit-test against. |
| `draggable-object.tsx` | One palette tile: a pan gesture that drags it and a tap that opens its "add to…" menu, raced against each other. |
| `object-palette.tsx` | Search box, tag chips grouped by catalogue family, a virtualized grid, Randomize, Clear tracks, New object. |
| `object-creator.tsx` | Dialog: glyph picker over all 37 icons, slug-validated id, label, prompt (≤250 with counter), comma tags, plus the manage list for deleting your own. |
| `object-glyph.tsx` | `<ObjectGlyph icon={id} />` — `createElement(objectIcon(id))`, so a glyph chosen from data is not a component declared during render. |
| `trolley-animation.tsx` | The wagon, waiting at the junction and rolling once per decision. |
| `results.tsx` | The histogram, the decision count and the link into the logs. |

**`lib/`**

- `lib/puzzles/trolley/search.ts` — pure, React-free, tested: `slugify`, `isSlug`, `matchesQuery`, `matchesTags`, `filterCatalogue`, `mergeCatalogue`, `chunk`, `randomTracks`, plus `TAG_GROUPS` (the 18 catalogue tags grouped under the four families) and `CUSTOM_TAG`.
- `lib/client/use-objects.ts` — `/api/objects` as screen state, over `useAsyncResource`.
- `lib/client/use-catalogue.ts` — `useCatalogue()` → `{ items, byId, custom, loading, error, refresh, create, remove, has }`. The built-ins are generated in the browser by `buildCatalogue()` rather than fetched: it is pure and deterministic, and the server resolves ids through the very same function, so a palette entry and a run agree by construction. A custom object of the same id replaces its built-in, which is the precedence `prepareRun` uses.
- `lib/client/use-persisted-state.ts` — `usePersistedState(key, initial, parse)` → `[value, set, { hydrated }]`. Write-through to `localStorage` under `inner-knots:<key>`, read in an effect (never in render, because these screens are server-rendered), and `parse` is handed the raw JSON so an entry written by an older build cannot become state.

### Drag and drop

The board registers each lane as a drop zone through `useDropZones`. Each zone keeps a `measureInWindow` rectangle, refreshed on its own `onLayout` and again via `remeasure()` the moment a drag begins, because the page can scroll without any zone's layout changing.

A palette tile carries `Gesture.Race(pan, tap)` from react-native-gesture-handler. The pan needs 6px of travel before it claims the gesture, so a tap still reads as a tap; while it runs, reanimated shared values translate the tile and `runOnJS` reports the window-space point on every frame, which the screen hit-tests to highlight the lane under the cursor. On release the screen hit-tests once more and appends the object to that track. The tile springs home in `onFinalize` either way, since the chip that appears on the track is the real result. Gesture-handler supports mouse on web, so the same code is the web implementation.

Tap-to-place is not a fallback for one platform: tapping a tile opens a two-button popover under it ("Track 1" / "Track 2"), disabled per track once that track is full. It is what works with a keyboard, with a screen reader, and on a phone where the board may be scrolled out of view.

### The animation

`TrolleyAnimation` plays one decision at a time from `summary.decisions`, which the engine rewrites after every answer. The only state it keeps is how far through the list it has got: the wagon's current run is derived from that index, and the timer that ends a run advances it. A fast run that lands three answers between two polls therefore still shows each of them. Giving the component `key={runId}` is what rewinds it for a new run.

The wagon is a plain `Animated.View` holding a static SVG, not an animated SVG node, so the same code animates on web and native. One shared value drives the journey and `interpolate` turns it into the descent to track 2 over the branch run; `useReducedMotion()` collapses the travel to its end state and keeps the caption. A decision that failed does not move the wagon — there is no lever pull to show — but it still gets its caption ("`id` would not answer"), because a model that will not answer is part of the result.

### Verification

`npm run typecheck` and `npm test` clean (**270 tests across 31 files**, including the 18 new in `lib/puzzles/trolley/search.test.ts` and 8 in `lib/charts/histogram.test.ts`). `npm run lint` clean.

Against a live server with a scratch `DATA_DIR`: `/puzzles/trolley` rendered 200 (117 KB of SSR HTML containing the board and both empty lanes) and the client bundle built with gesture-handler and reanimated in it. `POST /api/prompts/trolley` with built-in catalogue ids returned the bystander framing reading "On Track 1: your neighbor's eldest daughter and a cow." / "On Track 2: a million dollars."; an unknown id gave `Unknown object ids: "ghost".` (400). A custom object was created through `POST /api/objects`, a `local` character through `POST /api/characters`, and a run started through `POST /api/runs` with a mixed built-in/custom track layout: 202 with `progress.total: 2`, then `finished` with both decisions recorded as `Connection error.` (no Ollama on the machine) and `perCharacter.tester.errors: 2` — which is exactly the shape the histogram and the animation read. The server was stopped and the scratch data removed.

### Deviations from the plan

1. **`POST /api/prompts/trolley` was resolving ids against the objects store only.** It predates the catalogue generator, so every built-in id — which is to say almost everything the palette offers — previewed as a 400. It now goes through `resolveTrolleyObjects` from `lib/engine/setup.ts`, the same function the run engine uses, so a preview and a run resolve identically (user objects first, catalogue second) and cannot drift.
2. **`ObjectGlyph` exists** because `const Glyph = objectIcon(item.icon); <Glyph />` declares a new component type on every render. `createElement(objectIcon(icon), props)` keeps the identity the icon module owns. Any screen drawing a glyph from data should use it.
3. **Bars are Views, not SVG.** The plan allowed either. Views reflow with the panel they sit in and take their colors from ordinary tokens; only the series color itself comes through `useTheme()`.
4. **`Histogram` groups are characters and its series are the tracks**, which is the arrangement that answers "does this character prefer a track?" off a pair of adjacent bars. `accessory` and `note` were added to the group type for the avatar and the error count.
5. **`randomTracks` draws once and splits**, rather than calling `randomSelection` twice and rejecting collisions, so the two tracks are distinct by construction.
6. **The board scrolls horizontally below `BOARD.minWidth`** instead of compressing; a track drawn at 300px is not a track.
7. **The object creator does not reset itself on open.** It clears when it closes instead, which keeps the reset out of an effect — the React Compiler's lint rules reject a `setState` in an effect body, and every piece of state in this phase is derived or set from a callback as a result.
8. **`TrackBoard` takes `overlay: (width) => ReactNode`** rather than plain children, because the animation needs the measured width and only the board has it.

### Review

`secrets-critic`: zero findings. Nothing in this phase reads configuration; the tree and `git log -p --all` are clean and `.env.example` holds placeholders only.

`design-token-critic`: no hex literals, raw palette classes, arbitrary values or bare pixel/colour/duration literals in any of this phase's files, and the geometry constants are confined to `geometry.ts` as agreed. Its one note is accepted rather than fixed: `Easing.inOut(Easing.cubic)` in `trolley-animation.tsx` is the only motion value not from a token — the duration beside it is `theme.durations.slow * 5` — but a reanimated easing function cannot round-trip through the CSS/Tailwind generator, so there is nowhere in `tokens.ts` for it to live yet. Worth an `easings` group the moment a second curve appears.

`duplication-critic`: seven findings, two applied.

- **Applied (high).** `catalogue.ts` and `search.ts` each defined the slug rule, and the apostrophe strip appeared four times between them. `slug` and `stripApostrophes` are now exported from `catalogue.ts` and `slugify` is an alias of `slug`, so a user's object id lands in exactly the id-space the built-ins were generated into rather than in one that happens to agree.
- **Applied (cosmetic).** The two "Track 1" / "Track 2" caption blocks fold into the `lanes` loop next to them.
- **Deferred, and worth a decision before phase 6 writes a third copy.** `ObjectCreator` hand-rolls the labelled-field rhythm that `components/characters/field.tsx` already generalizes as `Field`, and `Section` duplicates `FormSection`'s heading block. Both fixes want `Field` / `FormSection` moved out of `components/characters/` into `components/puzzles/` or `components/ui/` first, which is a call for whoever owns the UI kit rather than something to do inside one phase.
- **Deferred, needs care.** `mergeCatalogue` (client) and `resolveTrolleyObjects` (`lib/engine/setup.ts`, server) both encode "a custom object of the same id wins". One should call the other, but `mergeCatalogue` also applies `CUSTOM_TAG` and the server file is storage-bound, so the merge wants checking for bundling before it happens.
- **Deferred, low.** The `max-h-full w-full max-w-content` sheet className appears in both dialogs and would be better as a `DialogContent` size variant; the tap-to-place popover spells out the floating-card look that `Select`, `Dialog` and `Toast` also spell out. Both are changes to the shared UI kit while three other phases are mid-flight.

It explicitly did not flag `useDropZones` or the gesture wiring (nothing else drags yet), `ObjectCreator`'s draft/patch/save idiom against `CharacterForm`'s (same shape, different rules), `TagChip` against `Segmented` (multi-select filter vs exclusive radio), or the `Histogram` split — and confirmed `RunProgress`, `PromptView` and `VariantSelect` carry no trolley-specific assumptions, so phases 6 and 7 can take them unchanged.

### Notes for phases 6 and 7

- Import the shared five from `@/components/puzzles/<name>` and the chart from `@/components/charts`. None of them knows anything about the trolley.
- `RunProgress` wants the run from `useRun(runId)` and nothing else; it cancels for itself.
- A puzzle that persists its setup should follow `usePersistedState(key, initial, parse)` and write a `parse` that distrusts what it reads — the stored value outlives the shape that wrote it.
- `useDropZones` is general: it takes the ids up front and answers "what is under this window-space point?". Nothing in it is about tracks.
- The prisoner's dilemma's two prompts go to `PromptView` as two panels with `label: "Player A"` / `"Player B"`; it lays them out side by side on a wide viewport by itself.
