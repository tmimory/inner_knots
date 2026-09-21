# Phase 2 — Domain, storage, prompts

## Checklist
- [x] `lib/domain/`: zod schemas + types for Character, TrolleyObject, Adventure (+ nodes/options), Run, Span, LogEvent, DecisionRequest/Result, ProviderId, OutputMode, EffortLevel. Character limits (bio/principle/value ≤500, ≤10 each) and identifier rule (no spaces) enforced in the schema.
- [x] `lib/storage/jsonl.ts`: `appendLine`, `readLines`, `replayCollection`, `compact`. `lib/storage/collections.ts`: typed repos for characters, objects, adventures. `lib/storage/runs.ts`: run index, span and log appenders, readers.
- [x] `lib/prompts/`: loader for `prompts/**/*.md` (frontmatter + body), `compose(id, vars)` with `{{var}}` and `{{#if}}` support, and a startup check that every fragment referenced in code exists and declares its variables.
- [x] Prompt fragments written: characters (bio, principles, values), trolley (3 variants + decision + track description), prisoners-dilemma (2 variants + payoffs + history + relationship), adventure (briefing, node, history), shared output instructions.
- [x] API routes: CRUD for `/api/characters`, `/api/objects`, `/api/adventures`; `/api/prompts/:id` returns a rendered preview; `/api/runs` list/get.
- [x] Unit tests (vitest) for jsonl replay and prompt compose.

## Done

Shipped 2026-09-21. The backend exists: entities are typed, stored as replayable JSONL, and every word a model will read is composable from markdown on disk.

### What shipped

**Domain (`lib/domain/`).** One file per entity, zod schema plus the inferred type, re-exported from `index.ts`.

- `enums.ts` — `PROVIDER_IDS`, `OUTPUT_MODES`, `EFFORT_LEVELS`. Shared verbatim with the provider layer (phase 3).
- `character.ts` — `CHARACTER_LIMITS` (bio/principle/value 500, 10 each), `CHARACTER_ID_PATTERN` (`^[A-Za-z0-9_.-]{1,64}$`, no spaces), steering modes `raw | bio | full`, `characterDisplayName()`.
- `trolley-object.ts` — `TROLLEY_OBJECT_LIMITS` (prompt ≤250). The input schema defaults `builtIn` to false and `tags` to `[]`.
- `adventure.ts` — `ADVENTURE_LIMITS`, plus `validateAdventure()` returning `AdventureIssue[]` with codes `missing-start`, `unreachable-node`, `dangling-option`, `node-without-options`, `duplicate-node-id`. Cycles are followed without hanging.
- `run.ts` — puzzle ids, `RosterEntry`, the three puzzle configs, `RunConfig` (discriminated on `puzzle`), `Run`, `RunEvent`, `DEFAULT_CRIME`, `RUN_LIMITS`.
- `span.ts` — `DecisionRecord` (the provider layer's contract), `Span`, `LogEvent`.
- `id.ts` — `newId(prefix?)` over `crypto.randomUUID()`, dashes stripped: `run_3f2a…`.

**Storage (`lib/storage/`, server only).**

- `paths.ts` — the only reader of `process.env.DATA_DIR` (default `./data`), read per call so tests can redirect it.
- `jsonl.ts` — `appendLine`, `appendLines`, `readLines` (a cut-short trailing line is skipped with a warning, not an error), `replayCollection` (last-write-wins, first-write order preserved), `compact` (temp file + rename), and `withFileLock`, an in-process promise chain that serializes writes per file.
- `collections.ts` — `createCollection(name, schema)` → `{ list, get, has, upsert, remove, compact, file }`, and the instances `characters`, `trolleyObjects`, `adventures`. `upsert` validates and stamps `createdAt` / `updatedAt`; a caller cannot backdate an entity.
- `runs.ts` — `createRun`, `updateRunProgress`, `finishRun`, `failRun`, `cancelRun`, `getRun`, `listRuns` (filters, newest first), `appendSpan`, `updateSpan`, `listSpans`, `appendLog`, `listLogs`, `runCharacterIds`, `resetRunCache`. The run index is cached in memory and folded forward as each event is appended, rather than invalidated and re-read.

**Prompts (`prompts/`, `lib/prompts/`).** 21 markdown fragments, no prompt prose anywhere in `.ts`.

- `template.ts` — a hand-written parser and renderer for `{{var}}`, `{{#if}}…{{else}}…{{/if}}`, `{{#each}}…{{/each}}` and `{{this.field}}`. No Handlebars dependency. A block tag alone on its line takes the line with it.
- `loader.ts` — reads `prompts/**/*.md` with `gray-matter`, requires the frontmatter `id` to match the file path, rejects a fragment that reads an undeclared variable, and re-reads a file when its mtime changes so prompts can be edited live.
- `compose.ts` — `render(id, vars)` (throws on a missing declared variable or an unknown id), `renderMany`, `checkFragments()`.

**Puzzle prompt assembly (`lib/puzzles/`).** Pure functions, unit-tested without the store: `composeSteeringPrompt`, `buildTrolleyPrompt`, `buildPrisonersDilemmaPrompt`, `buildAdventurePrompt`, plus `lib/puzzles/types.ts` with the shared `PuzzlePrompt` shape and `renderDecisionInstructions`.

**API + clients.** `lib/api/http.ts` (response helpers, `handle()` error wrapper, query-param readers), `lib/api/collection-routes.ts` (the CRUD factory) and `lib/api/schemas.ts` (`previewOutputModeSchema`) keep the route files to a couple of lines each. `lib/client/` gained `collection.ts` (the factory), `characters.ts`, `objects.ts`, `adventures.ts`, `prompts.ts`, `runs.ts`.

**Screen.** `app/characters/index.tsx` now reads `/api/characters` through `charactersApi.list()` and shows the roster count in the header badge. The health probe it replaced has served its purpose.

### API table

Success bodies are `{ items }` for a list, `{ item }` for one entity. Every 4xx/5xx is `{ error: string }`.

| Method | Route | Body / query | Returns |
| --- | --- | --- | --- |
| GET | `/api/characters` | — | `{ items: Character[] }` |
| POST | `/api/characters` | `Character` (no timestamps) | `{ item }` 201 · 409 if the id exists · 400 on a bad shape |
| GET | `/api/characters/:id` | — | `{ item }` · 404 |
| PUT | `/api/characters/:id` | `Character` (path id wins) | `{ item }` · 404 |
| DELETE | `/api/characters/:id` | — | `{ deleted: true }` · 404 |
| GET/POST | `/api/objects` | `TrolleyObject` | as characters |
| GET/PUT/DELETE | `/api/objects/:id` | | as characters |
| GET/POST | `/api/adventures` | `Adventure` | as characters |
| GET/PUT/DELETE | `/api/adventures/:id` | | as characters |
| POST | `/api/prompts/steering` | `{ character: { steering } }` | `{ prompt: string \| null }` |
| POST | `/api/prompts/trolley` | `{ config: { variant, track1: id[], track2: id[], outputMode? } }` | `{ prompt: PuzzlePrompt }` · 400 naming unknown object ids |
| POST | `/api/prompts/prisoners-dilemma` | `{ config }` (`playerA`, `playerB`, `runs`, `iterations` optional) | `{ a: PuzzlePrompt, b: PuzzlePrompt }` — round 1 |
| POST | `/api/prompts/adventure` | `{ adventureId, amnesia?, outputMode? }` | `{ prompt, adventure: { id, name }, nodeId, issues }` · 404 |
| GET | `/api/prompts/fragments` | — | `{ fragments: { id, description, variables, body }[] }` |
| GET | `/api/runs` | `?puzzle=&characterId=&status=&limit=` | `{ items: Run[] }` newest first · 400 on a bad filter |
| GET | `/api/runs/:id` | — | `{ item: Run }` · 404 |
| GET | `/api/runs/:id/spans` | — | `{ items: Span[] }` merged by `spanId` |
| GET | `/api/runs/:id/logs` | `?level=&limit=` | `{ items: LogEvent[] }` oldest first |

`POST /api/runs` is a TODO comment in `app/api/runs+api.ts`; starting a run belongs to the engine phase.

### Verification

`npm run typecheck`, `npm run lint` and `npm test` all clean. Vitest: **157 tests across 19 files** (the count includes the phase-3 provider tests landing in parallel); this phase added `lib/storage/jsonl.test.ts`, `lib/storage/collections.test.ts`, `lib/storage/runs.test.ts`, `lib/prompts/template.test.ts`, `lib/prompts/compose.test.ts`, `lib/puzzles/characters/steering.test.ts`, `lib/puzzles/trolley/prompt.test.ts`, `lib/puzzles/prisoners-dilemma/prompt.test.ts`, `lib/puzzles/adventure/prompt.test.ts`, `lib/domain/adventure.test.ts`. Storage tests get a fresh temp `DATA_DIR` each via `lib/storage/test-utils.ts`.

End to end against `npx expo start --web --port 8094`: created a character (201) and re-posted it (409); a spaced id was refused with `id: Use 1-64 letters, digits, dot, dash or underscore, with no spaces` (400); `data/characters.jsonl` held exactly one `{"op":"upsert","entity":{…}}` line; `PUT` kept `createdAt` and moved `updatedAt`; `DELETE` returned `{"deleted":true}` then 404. `POST /api/prompts/steering` returned the full stacked prompt for a `full` character and `null` for a `raw` one. Three objects were seeded and `POST /api/prompts/trolley` rendered the bystander framing with "On Track 1: your neighbour's eldest daughter and a cow." / "On Track 2: a million dollars."; an unknown id gave `Unknown object ids: "ghost".` (400). `POST /api/prompts/prisoners-dilemma` returned both sides of an asymmetric aware game with the payoffs correctly mirrored per player and the default crime text. `POST /api/prompts/adventure` returned the briefing, the start node, its options and `issues: []`. `GET /api/prompts/fragments` listed all 21 fragments with their variables. Run routes returned `{ items: [] }` / 404 as appropriate, and a bad filter gave 400. `/` and `/characters` both rendered 200. The server was stopped and the scratch `data/` directory removed afterwards.

### Deviations from the plan

1. **Asymmetric payoffs are per-player in all four cells.** The plan listed `bothTestify` and `bothSilent` as single values in the asymmetric variant. That would have forced symmetry in exactly the two cells an asymmetric game is most likely to vary, so all four are `{ a, b }` pairs. `SymmetricPayoffs` is unchanged.
2. **The template language gained `{{else}}` and `{{this.field}}`.** `{{this.field}}` is what lets `prisoners-dilemma/history.md` and `adventure/history.md` write their own prose per row instead of receiving pre-formatted strings from code. `{{else}}` is what lets `trolley/situation.md` own the phrase for an empty track ("nothing at all") instead of a string literal in `prompt.ts`. Both keep prose out of `.ts`, which is the rule they exist to serve.
3. **`outputMode` reaches `shared/decision-instructions.md` as `{ structured, tool }`,** not as the string. The template has no equality test by design, and two booleans are cheaper than adding one.
4. **The prisoner's-dilemma variant fragments take no `{{situation}}`.** The trolley variants wrap the situation as the plan specified; for the dilemma the crime, relationship, payoffs and history are separate fragments composed in order, so a variant is pure framing.
5. **`lib/api/` is new**, holding `http.ts`, `collection-routes.ts` and `schemas.ts`. Without it the six CRUD route files and the four prompt routes would have repeated the same response and error plumbing ten times. `previewOutputModeSchema` lives there rather than in `lib/domain/enums.ts`, because that file is a contract shared verbatim with the provider layer and must not drift.
6. **Response envelope `{ items }` / `{ item }`** rather than a bare array or a per-collection key, so one generic client factory covers all three collections.
7. **`compact()` writes via a temp file and a rename.** The plan asked only for a rewrite; a crash during a rewrite-in-place would lose the collection.
8. **Spans are patched, not rewritten.** `updateSpan(runId, spanId, patch)` appends a partial line and `listSpans` merges by `spanId`, so the store stays append-only while a span is open.
9. **Dependencies added:** `zod@^3.25.76` and `gray-matter@^4.0.3`. zod was previously only a transitive dependency.

### Review

`secrets-critic`: zero findings. `DATA_DIR` in `lib/storage/paths.ts` is the only environment read this phase adds and it was already in `.env.example`; the prompt markdown holds puzzle prose only; git history is clean.

`duplication-critic`: two findings, both applied. The prisoner's-dilemma preview route had re-derived the `runs` and `iterations` bounds instead of reusing `runCountSchema` and `prisonersDilemmaConfigSchema.shape.iterations`; and `z.enum(OUTPUT_MODES).default("structured")` was repeated across the three prompt-preview routes, now `previewOutputModeSchema` in `lib/api/schemas.ts`. It explicitly did not flag the six thin CRUD route files or the three one-line client modules, which are instantiations of the shared factories, nor the two `*-thought-experiment.md` fragments, whose shared opening gives way to puzzle-specific prose.

`design-token-critic`: zero findings on `app/characters/index.tsx` — the change is data-fetching and copy only, and the one style-bearing line (`gap-lg`) was already a token.

### Notes for the next phase (the run engine)

The engine composes a call as: `composeSteeringPrompt(character)` for the system message, a `build…Prompt` for the user message and options, then a provider call, then `appendSpan` / `updateSpan` / `appendLog` / `updateRunProgress` around it.

```ts
// lib/puzzles/characters/steering.ts
composeSteeringPrompt(character: Pick<Character, "steering">): Promise<string | null>

// lib/puzzles/{trolley,prisoners-dilemma,adventure}/prompt.ts
buildTrolleyPrompt(input: {
  variant: TrolleyVariant;
  track1: readonly TrackItem[];        // TrackItem = Pick<TrolleyObject, "label" | "prompt">
  track2: readonly TrackItem[];
  outputMode: OutputMode;
}): Promise<PuzzlePrompt>               // PuzzlePrompt = { system?: string; user: string; options: { id, label }[] }

buildPrisonersDilemmaPrompt(input: {
  config: PrisonersDilemmaConfig;
  player: "a" | "b";
  outputMode: OutputMode;
  round?: number;                       // 1-based, default 1
  history?: readonly { round: number; you: "testify" | "silent"; partner: "testify" | "silent" }[];
}): Promise<PuzzlePrompt>

buildAdventurePrompt(input: {
  briefing: string;
  node: Pick<AdventureNode, "context" | "decision" | "options">;
  history?: readonly { decision: string; choice: string; outcome?: string }[];
  amnesia: boolean;
  outputMode: OutputMode;
}): Promise<PuzzlePrompt>

// lib/storage/runs.ts
createRun(input: { config: RunConfig; total: number; id?: string }): Promise<Run>
updateRunProgress(runId: string, progress: RunProgress, status?: RunStatus): Promise<void>
finishRun(runId: string, summary?: unknown): Promise<void>
failRun(runId: string, error: string): Promise<void>
cancelRun(runId: string): Promise<void>
getRun(runId: string): Promise<Run | undefined>
listRuns(filter?: { puzzle?; characterId?; status?; limit? }): Promise<Run[]>
appendSpan(runId: string, span: Omit<Span, "runId"> & { runId?: string }): Promise<Span>
updateSpan(runId: string, spanId: string, patch: Partial<Omit<Span, "runId" | "spanId">>): Promise<void>
listSpans(runId: string): Promise<Span[]>
appendLog(runId: string, level: LogLevel, message: string, data?: unknown): Promise<LogEvent>
listLogs(runId: string, filter?: { level?; limit? }): Promise<LogEvent[]>

// lib/storage/collections.ts
characters | trolleyObjects | adventures: Collection<T>
  // { list, get, has, upsert, remove, compact, file }
```

Objects on a trolley track are stored as ids; resolve them through `trolleyObjects` before calling `buildTrolleyPrompt`, and fail the run rather than rendering a prompt with a hole in it.

**To add a prompt fragment:** create `prompts/<dir>/<name>.md` with frontmatter `id` equal to its path without `.md`, a `description`, and the `variables` it reads. Loading fails loudly if the id does not match or a variable is used undeclared. Nothing else needs changing — `listFragments()` and `/api/prompts/fragments` pick it up.
