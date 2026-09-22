# Phase 4 — Characters

## Checklist
- [x] `components/avatars/`: 15 SVG shapes (react-native-svg) each exposing one `color` prop that tints a meaningful region (shirt, feathers, shell…), 25 named colors in `theme/tokens.ts` under `avatarPalette`.
- [x] Characters list: avatar grid with names; search by identifier, provider, model, output mode, steering mode.
- [x] Editor: identifier (no spaces, uniqueness check, UUID default), avatar shape + color pickers, provider (enabled only), model (from provider), output mode toggle (tool disabled when unsupported), effort (when supported), steering mode with bio / principles / values as removable chips (limits enforced), live Final Prompt preview from `/api/prompts`.
- [x] Delete with confirmation.

## Done

Shipped 2026-09-21. The roster is real: a character can be made, given a face and a set of convictions, tested against its provider, and watched turning into the prompt a model will actually hear.

### What shipped

**Hooks (`lib/client/`).**

- `use-async-resource.ts` — `useAsyncResource(load, initial)` → `{ data, loading, error, refresh, set }`. One place holds the "read it, say whether it arrived, let me ask again" wiring, including the two guards every screen needs: no state set after unmount, and no slow answer overwriting a newer one. `load` receives `"mount" | "refresh"`, which is how the model picker asks the server to bypass its ten-minute cache.
- `errors.ts` — `describeApiError(error)` unwraps the `{ error: string }` body an `ApiError` carries, so a route's sentence reaches the screen instead of "API request failed with 400"; `isConflict(error)` is the 409 test the identifier field needs.
- `use-characters.ts` — `useCharacters()` → `{ characters, loading, error, refresh, create, update, remove }`. Each mutation folds the store's answer into local state rather than re-listing, so a save lands in the same tick it returns.
- `use-providers.ts` — `useProviders()` → `{ providers, enabled, loading, error, refresh }` and `useModels(provider)` → `{ models, loading, error, refresh }`. Passing no provider settles on an empty list instead of making a request.

**Screens (`app/characters/`).** `index.tsx` (roster), `new.tsx` and `[id].tsx` — the last two are thin: they own navigation, toasts and the store calls, and hand everything else to one form. Neither has a menu entry; the roster is the way in.

**Components (`components/characters/`).** `character-form.tsx` (the editor), `character-card.tsx`, `conviction-list.tsx` (principles / values), `field.tsx` (`Field`, `FormSection`), `filter-chips.tsx`, `final-prompt.tsx`, `labels.ts` (the words for every enum value, in one place), `screen-header.tsx` (`PageHeader` + the meander rule the three screens share), `search.ts`, `segmented.tsx`, and an `index.ts` barrel.

**Roster list.** Search over identifier, display name, provider and model; three chip facets (provider — only those actually in use — output mode, steering mode), each chip clearing itself on a second press. Cards are `min-w-menu grow` inside a wrapping row, which is the grid: they fill the line at any width without a breakpoint. Each card shows the face at `size="lg"`, the name in the display font, `provider · model`, and badges for output mode, steering mode and effort. Two empty states, one for a roster that is empty and one for filters that match nothing. When no provider is configured, a panel says so and lists the providers on offer.

**Editor.** Identifier validated live against `characterIdSchema` (the schema's own message is what shows, so the rule lives in one place), against the loaded roster for uniqueness, and against a 409 from the store; `Generate` fills a `newId()`; the field is read-only when editing, because the id is the key in the JSONL store, in run configs and in every span. Avatar: an `xl` preview beside `ShapePicker` and `ColorPicker`. Provider: a select over all five with the unconfigured ones disabled and labelled. Model: a select over `/api/providers/:id/models` with a refresh control, plus an "enter model id manually" switch that flips to a free-text input — and flips itself when the catalogue cannot be read, so a dead provider never blocks a save. Output mode and steering mode are `Segmented` controls; the tool segment carries a tooltip and refuses the press when the chosen model reports `capabilities.toolCalls: false`. Effort appears only when the model reports levels, with "provider default" as the first option. Bio, principles and values use `CHARACTER_LIMITS` for every cap. `Test connection` runs `testProvider()` and toasts the choice and latency, or the error. Delete confirms in a dialog.

Everything the chosen model decides — which provider, which model, whether tool mode is available, which effort levels exist — is **derived at render** rather than written back into the draft. A catalogue that arrives late changes what is offered without a second render pass, and nothing the user typed is silently rewritten. (It also satisfies `react-hooks/set-state-in-effect`, which this React version enforces as an error.)

**Final Prompt.** A read-only panel that debounces the steering block 300 ms and posts it to `/api/prompts/steering`, so the preview is composed by the same code a run uses — edit `prompts/characters/*.md` and the panel changes with it. A raw character reads "No steering prompt: this character speaks for the raw model."

### RosterBar (`components/puzzles/roster-bar.tsx`)

The cast of a run, shared by all three puzzles.

```ts
import { RosterBar, type RosterEntry } from "@/components/puzzles/roster-bar";
// RosterEntry is re-exported from lib/domain/run.ts: { characterId: string; runs: number }

type RosterBarProps = {
  value: readonly RosterEntry[];
  onChange: (value: RosterEntry[]) => void;
  characters: readonly Character[];   // from useCharacters()
  max?: number;                       // default RUN_LIMITS.maxRoster (5)
  min?: number;                       // default RUN_LIMITS.minRoster (1)
  showRuns?: boolean;                 // default true
  labels?: readonly string[];         // per-slot names
  fixedSlots?: number;                // exactly N labelled seats
  className?: string;
};
```

- **Growing row** (trolley, adventure): medallions for each entry plus one "Add character" slot, which disappears at `max`. A medallion is an `lg` avatar, the identifier under it, a run-count stepper (`RUN_LIMITS.minRuns`…`maxRuns`), and a remove `×` that is withheld once removing would drop below `min`.
- **Fixed slots** (prisoner's dilemma): `fixedSlots={2} labels={["Player A","Player B"]} showRuns={false}` renders exactly two labelled seats. Seats fill left to right — the next empty one is the one that opens the picker — so the emitted array is always dense and always valid against `rosterEntrySchema`. Pressing a filled seat reopens the picker to replace it.
- **Picker**: a dialog with the shared character search; characters already on the roster are omitted, except the one in the seat being replaced.
- A roster entry whose character no longer exists renders as a dimmed medallion showing the raw id, rather than vanishing.

```tsx
// Trolley / adventure
<RosterBar value={roster} onChange={setRoster} characters={characters} />

// Prisoner's dilemma
<RosterBar
  value={roster}
  onChange={setRoster}
  characters={characters}
  fixedSlots={2}
  min={2}
  labels={["Player A", "Player B"]}
  showRuns={false}
/>
```

### Verification

`npm run typecheck`, `npm run lint` and `npm test` clean (222 tests across 27 files; this phase adds no test file — the logic it introduces is all in components, and no component test harness exists yet).

Against `npx expo start --web --port 8098` with a scratch `DATA_DIR`: `/characters` and `/characters/new` → 200, the new screen's SSR HTML contains the Identifier, Steering and Final prompt sections; a character created through `POST /api/characters` → 201 and `/characters/<id>` → 200; re-posting the same id → 409; `POST /api/prompts/steering` returned the full stacked bio/principles/values prompt the Final Prompt panel renders. The server was stopped and the scratch data directory removed afterwards.

Token self-check across all phase-4 files: no hex literals, no arbitrary-value classes (`bg-[…]`, `text-[13px]`), no raw Tailwind palette classes, and one inline `style` — `maxHeight: VISIBLE_MODEL_ROWS * theme.controlSizes["control-sm"]` on the model list's scroll container, a row count times a token.

### Deviations from the plan

1. **The "no provider configured" notice lists provider labels, not environment variable names.** `GET /api/providers` returns `{ id, label, enabled }` and nothing else; the `ProviderId → variable` map lives in `lib/providers/env.ts`, which is server-only and must not be mirrored in the client bundle. Adding an `envVar` field to `ProviderSummary` would have meant editing the provider layer, which this phase did not own. The notice names the providers and points at `.env`.
2. **No display-name field in the editor.** `Character.name` exists in the schema and `characterDisplayName()` falls back to `id`; the plan's editor is identifier-only, so the form preserves an existing `name` and never offers to set one. Worth adding if a name ever earns its place.
3. **Steering fields are stored whole, not per mode.** Switching from `full` to `bio` keeps the principles and values in the record; `composeSteeringPrompt` reads only what the mode uses, so nothing extra reaches the model and nothing the user typed is thrown away by a toggle. Kept is not sent, though, and the screens say which: the roster tallies such a character as "ignores 4 convictions" in the subtle ink, and the editor puts a sentence under the mode control saying what is on record, that the mode ignores it, and that Full sends it. `sendsConvictions(mode)` in `lib/domain/character.ts` is the one place that knows which mode that is.
4. **Principles and values are rows, not chips.** They are up to 500 characters each — a chip that holds a paragraph is not a chip. Each row is a two-line capped textarea with its own remove control, and the add button closes at the limit so the cap is visible rather than enforced by a refusal.
5. **A manual model entry toggle.** The plan allowed a free-text fallback; it is a switch beside the Model label, and it turns itself on (and locks) when the catalogue cannot be read, so an unreachable provider never blocks a save.
6. **Three files in `lib/client/` rather than two.** `use-async-resource.ts` and `errors.ts` came out of the duplication review: three hooks were carrying the same mounted-ref/loading/error wiring, and one hook file was importing an error helper from another.
7. **`Segmented` is hand-built rather than `Tabs`.** A disabled segment has to stay hoverable for its tooltip to explain itself, which a disabled `TabsTrigger` does not.
8. **The model select scrolls at eight rows.** OpenRouter lists 440 models; without a cap the popover runs off the screen. The cap is `VISIBLE_MODEL_ROWS * theme.controlSizes["control-sm"]`.

### Review

`design-token-critic`: no color, typography, spacing or arbitrary-value findings across the fifteen files. One low note — `DEBOUNCE_MS = 300` in `final-prompt.tsx` is not on the `durations` scale (120 / 200 / 360). Left as is: it is a network debounce rather than a motion value, it is a single named and commented constant, and adding a token would have meant editing `theme/tokens.ts`, outside this phase's files. The critic confirmed the one inline `style` is the documented `useTheme()` escape hatch, not a literal.

`duplication-critic`: four findings, all applied.

- The roster screen and the roster bar each had their own character search and the same placeholder string → `components/characters/search.ts` (`matchesCharacterQuery`, `CHARACTER_SEARCH_PLACEHOLDER`).
- Three hooks repeated the same load/mounted-ref/error wiring, and `use-providers.ts` imported `describeApiError` from `use-characters.ts` → `lib/client/use-async-resource.ts` and `lib/client/errors.ts`. `useModels`'s stale-answer guard now protects all three.
- `ORNAMENT_REPEATS` plus a bare `<GreekKey>` was copied into all three screens → `CharactersHeader`. (The critic's alternative, an `ornament` prop on the shared `PageHeader`, is the better long-term home if other phases want the same rule.)
- `CharacterCard` restated the `Card` primitive's classes → it composes `Card` inside the `Pressable` now. The critic notes `components/logs/run-row.tsx` hand-rolls the same string; if a third pressable surface appears, `Card` should grow a `pressable` variant.

### Notes for the puzzle phases

- `useCharacters()` is the roster; pass `characters` straight into `RosterBar`.
- Puzzle screens get their cast from `RosterBar` and nothing else — do not re-implement a character picker.
- `Field` / `FormSection` (`components/characters/field.tsx`) and `Segmented` are general enough for a puzzle configuration form; import them from `@/components/characters` rather than rebuilding the label/hint/error rhythm.
- A prompt preview panel is `FinalPrompt`'s shape: debounce the config, post it to the matching `/api/prompts/*` route, render what comes back. Do not compose prompt prose in the client.
