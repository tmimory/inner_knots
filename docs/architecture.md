# Architecture

inner_knots is a local research bench for running AI "characters" (model + configuration + optional steering prompt) through philosophical puzzles and comparing the choices they make.

## Stack

- **Expo SDK 57 + Expo Router** (TypeScript). Web is the primary target and is what `npm run dev` launches. Native builds are supported by the same code except React Flow, which is web only (see Platform notes).
- **NativeWind 4 / Tailwind** for styling. All colors, fonts, spacing, radii, shadows and motion come from theme tokens. No literals in components.
- **shadcn-style components** hand-built in `components/ui/` on top of `@rn-primitives/*` where a primitive helps (select, switch, dialog, tabs, tooltip, slider).
- **@xyflow/react (React Flow 12)** for the adventure tree builder and outcome visualizer.
- **Expo Router API routes** (`app/api/**/*+api.ts`, `web.output: "server"`) form the local backend. They run in Node inside the Expo dev server, so they can read `.env` secrets, write files to disk, and call local LLMs. The browser bundle never sees an API key.

Single-command run: `cp .env.example .env`, fill in keys, `npm install`, `npm run dev`.

Requires **Node >= 22.18**: the theme generator imports `theme/tokens.ts` directly and relies on Node's native TypeScript type stripping. Tailwind is pinned to 3.4.x because NativeWind 4 does not support Tailwind 4.

## Directory layout

```
app.config.ts            Expo config in TS, so splash/icon colors come from the tokens
tailwind.config.js       requires theme/tailwind-tokens.cjs; holds no literals
metro.config.js          withNativeWind(input: theme/global.css)
scripts/
  build-theme-css.mjs    generates theme/global.css + theme/tailwind-tokens.cjs from tokens.ts
app/                     Expo Router routes
  _layout.tsx            fonts, theme provider, toast provider, portal host, app shell
  index.tsx              redirect to /characters
  characters/            list + editor
  puzzles/trolley.tsx
  puzzles/prisoners-dilemma.tsx
  puzzles/adventure/     list, builder, run
  logs/                  run list, run detail (spans + logs)
  api/                   server routes (characters, objects, adventures, runs, providers, prompts)
components/
  ui/                    shadcn-style primitives (+ index.ts barrel)
  shell/                 app shell, left menu, nav-items, page header, Scroll surface,
                         wordmark, roster bar
  avatars/               15 SVG avatars + color swatches
  charts/                histogram
  flow/                  React Flow nodes/edges (.web.tsx) with .native.tsx fallbacks
  puzzles/               puzzle-specific UI
lib/
  domain/                types + zod schemas (Character, TrolleyObject, Adventure, Run, Span, LogEvent)
  storage/               JSONL store (server only): paths, jsonl, collections, runs
  prompts/               markdown loader + template engine + composer (server only)
  api/                   shared API-route helpers: http responses, CRUD route factory
  providers/             provider factory + adapters
  engine/                run engine (executes a run, emits spans/logs, updates progress)
  puzzles/               puzzle definitions: prompt assembly, option sets, result reducers
  client/                typed fetch helpers used by screens
theme/
  tokens.ts              single source of truth (colors, fonts, spacing, control sizes,
                         layout measures, radii, shadows, motion, z-index, avatar palette)
  color.ts               hex -> "r g b" and camel -> kebab helpers (shared with the generator)
  provider.tsx           ThemeProvider, useTheme, useThemeName
  vars.ts                NativeWind vars() per theme, for native (reads scalarTokenGroups)
  index.ts               public surface of the theme module
  global.css             GENERATED CSS variables for web/Tailwind
  tailwind-tokens.cjs    GENERATED theme.extend object for tailwind.config.js
prompts/                 markdown prompt fragments (editable without touching code)
  characters/            bio.md, principles.md, values.md
  trolley/               variant-{thought-experiment,employee,bystander}.md,
                         situation.md, question.md
  prisoners-dilemma/     variant-{thought-experiment,interrogation}.md, crime.md,
                         relationship.md, payoffs-symmetric.md,
                         payoffs-asymmetric-{aware,own}.md, history.md, question.md
  adventure/             briefing.md, history.md, node.md
  shared/                decision-{structured,tool,judgment}.md
data/                    local JSONL data (gitignored). Created on first run.
docs/                    this documentation
```

## Data model (lib/domain)

All entities carry `id`, `createdAt`, `updatedAt`.

- **Character**: `id` (user identifier, no spaces, unique; defaults to UUID), `avatar: { shape, color }`, `provider`, `model`, `outputMode: "structured" | "tool"`, `effort?`, `steering: { mode: "raw" | "bio" | "full", bio?, principles: string[], values: string[] }`. The composed steering prompt is derived, never stored.
- **TrolleyObject**: `id`, `label`, `prompt` (≤250 chars), `icon` (key into the SVG set), `builtIn: boolean`, `tags`.
- **Adventure**: `id`, `name`, `briefing` (≤1000), `startNodeId`, `nodes[]`. Node = `{ id, position: {x,y}, context ≤1000, decision ≤500, options: [{ id, label ≤100, outcome? ≤500, nextNodeId | null }] }` (max 5 options). There is no separate `edges[]`: an option *is* the edge, and React Flow derives its edges from `nextNodeId`. `validateAdventure(adventure)` reports the structural problems a graph can have — missing start, unreachable node, dangling `nextNodeId`, node without options, duplicate node id — so the builder can show them without refusing to store a half-built graph.
- **Run**: `id`, `puzzle: "trolley" | "prisoners-dilemma" | "adventure"`, `config` (full puzzle configuration snapshot incl. roster and per-character run counts, a discriminated union on `puzzle`), `status`, `progress: { done, total }`, `startedAt`, `finishedAt`, `summary` (puzzle-specific reducer output: histogram counts, per-node frequencies). Prisoner's-dilemma payoffs are free text ("5 years", "walk free"), symmetric or per-player.
- **Span**: `runId`, `spanId`, `parentSpanId`, `name` (run / character / iteration / provider-call), `characterId`, `iteration`, `startedAt`, `endedAt`, `status`, `input` (exact system + messages + tool/schema sent), `output` (raw provider response), `decision` (normalized: `choice`, `weights?` for Jev probabilities, `usage`, `latencyMs`), `error?`.
- **LogEvent**: `runId`, `ts`, `level`, `message`, `data?`.

## Storage (lib/storage)

Server-only JSONL under `data/`:

- `data/characters.jsonl`, `data/objects.jsonl`, `data/adventures.jsonl`: append-only event logs of `{ op: "upsert" | "delete", entity }`. Reading replays the file; the last op per id wins, and first-write order is preserved so lists stay stable as entities are edited. A `compact()` helper rewrites the file as one line per surviving entity (via a temp file and a rename, so a crash mid-compaction leaves the original intact). `createCollection(name, schema)` builds one typed repository — `list`, `get`, `has`, `upsert`, `remove`, `compact` — and `upsert` validates with zod and stamps `createdAt` / `updatedAt` itself, so a client cannot backdate an entity.
- `data/runs/index.jsonl`: one `RunEvent` per status change — `created` (carrying the whole run), then `progress`, `finished`, `failed` or `cancelled` (carrying only what changed). Replay gives current state; the result is cached in memory and updated in place as events are appended, so polling the logs screen never re-reads the file.
- `data/runs/<runId>/spans.jsonl` and `data/runs/<runId>/logs.jsonl`: append-only. A span may be written more than once — `updateSpan` appends a patch with the same `spanId`, and readers merge by `spanId`, last write wins per field — so a span can be opened before a provider call and closed after it without ever rewriting a line.

`DATA_DIR` (default `./data`) is read in `lib/storage/paths.ts` and nowhere else, and it is read per call rather than at import time, so tests can point a temporary directory at the store. Writes to one file are serialized by an in-process promise chain, so two concurrent API requests cannot interleave halves of a line. Everything is human-readable and can be reviewed with `cat` or `jq`.

## Prompts (prompts/, lib/prompts)

Prompt fragments are markdown files with YAML frontmatter (`id`, `description`, `variables`), parsed with `gray-matter`. The `id` must equal the path under `prompts/` without the extension, so a fragment can be found from its id and vice versa. Fragments are cached by id and re-read when their mtime changes, so editing a prompt during `npm run dev` takes effect on the next request without a restart.

The template language (`lib/prompts/template.ts`, hand-written, no Handlebars dependency) is deliberately tiny — prompt fragments are prose with holes in them, not programs:

```
{{name}}                        plain substitution, never HTML-escaped
{{#if name}}…{{/if}}            included when the value is truthy and non-empty
{{#if name}}…{{else}}…{{/if}}   the alternative when it is not
{{#each list}}…{{/each}}        repeated per item; {{this}} is the item
{{this.field}}                  a field of the current item
```

A block tag alone on its line takes the line with it, so an omitted section leaves no blank lines behind. Empty strings, empty arrays, `0` and `false` are all falsy, which is what lets `characters/principles.md` render as nothing rather than as a dangling heading.

`lib/prompts/compose.ts` renders a fragment by id and is strict in both directions: a declared variable that was not supplied is an error, and a fragment that reads a variable it did not declare fails to load at all. `checkFragments()` parses every fragment on disk, so a malformed template surfaces on startup rather than mid-run. Puzzle definitions in `lib/puzzles/*` assemble the final prompt from fragments. Nothing in code contains prompt prose.

The character steering prompt is composed from `prompts/characters/*`:

- raw → no system prompt from the character.
- bio → "You are {{bio}}".
- full → bio, then "You are guided by the following principles:" list (omitted when empty), then "Your values are as follows:" list (omitted when empty).

## Puzzle prompts (lib/puzzles)

Each puzzle exports a pure `build…Prompt` function that returns `{ system?, user, options }` — the puzzle side of a call only. The character's steering prompt is prepended as the system message by the run engine, so the same builder serves both a run and the Prompt View, where no character is attached yet.

Every builder closes with `renderDecisionInstructions(options, decisionStyle)`, which renders `shared/decision-<style>.md`. `DecisionStyle` (`lib/domain/enums.ts`) is `"structured" | "tool" | "judgment"` and is derived per character by `decisionStyleFor(provider, outputMode)`: TypeSafe is always `judgment`, every other provider takes the character's `outputMode`. The `judgment` fragment lists the options as what the decision resolves to and says nothing about a response format, because Jev reads the prompt as *state* rather than as instructions.

- **Trolley** — `buildTrolleyPrompt({ variant, track1, track2, decisionStyle })`. Track contents arrive already resolved to objects, so the builder is testable without the store. `joinNaturalLanguage` produces "a, b and c"; an empty track renders as an empty string and `trolley/situation.md` supplies the wording, so the phrase for a bare track stays in markdown.
- **Prisoner's dilemma** — `buildPrisonersDilemmaPrompt({ config, player, decisionStyle, round?, history? })`. Each player gets their own prompt: relationships are per side, and the stored `a`/`b` payoff matrix is re-keyed as "you" / "your partner". When `playersAware` is false a player is shown only their own consequences.
- **Adventure** — `buildAdventurePrompt({ briefing, node, history?, amnesia, decisionStyle })`. Each node call is stateless, so the briefing is repeated every time; amnesia simply omits the history section.

## API routes (app/api, lib/api)

Routes are thin. Responses follow one envelope so the typed clients in `lib/client/` need one shape each: `{ items }` for a list, `{ item }` for a single entity, `{ error: string }` for every 4xx and 5xx. `lib/api/http.ts` holds the response helpers and a `handle()` wrapper that turns a `ZodError` into a 400 with a readable message, a `PromptError` into a 400, and anything else into a 500. `lib/api/collection-routes.ts` builds the CRUD handlers once; characters, objects and adventures are each a two-line route file over it. `POST` creates (409 on a taken id) and `PUT` updates (404 when absent), so a typo in an id can never silently overwrite a character.

Prompt previews (`/api/prompts/*`) compose with the same builders a run uses and take an optional `decisionStyle` (`previewDecisionStyleSchema` in `lib/api/schemas.ts`, defaulting to `structured`). The trolley preview takes **object ids** and resolves them through the objects collection, answering 400 with the offending ids rather than rendering a prompt with a silent hole in it.

## Provider layer (lib/providers)

```ts
interface ProviderAdapter {
  id: ProviderId;                       // "typesafe" | "openai" | "anthropic" | "local" | "openrouter"
  label: string;
  listModels(): Promise<ModelInfo[]>;   // ModelInfo: { id, label, capabilities: { toolCalls, structuredOutput, effort: EffortLevel[] } }
  decide(req: DecisionRequest, ctx: TraceContext): Promise<DecisionResult>;
}
```

- `DecisionRequest`: `{ model, system?, messages: [{role, content}], options: [{ id, label, description? }], outputMode, effort?, maxTokens }`.
- `DecisionResult`: `{ choice: optionId, weights?: Record<optionId, number>, rationale?, raw, usage, latencyMs }`.
- `createProvider(id)` factory. `listEnabledProviders()` reads env: a provider is enabled when its key (or base URL for local) is present.
- Structured output uses each provider's native JSON-schema mode; tool mode defines a single `choose` tool with an enum parameter and forces the call. TypeSafe (Jev) is structured only: the request becomes one `choice` question whose criteria are the options; `probabilities` map to `weights`.
- Effort maps to provider-native reasoning controls where the model supports it; ignored otherwise.
- `MAX_OUTPUT_TOKENS` (env) is a hard clamp applied to every provider call.
- OpenRouter models are fetched from `GET /api/v1/models` at request time and cached in memory for the session.
- Local LLMs use an OpenAI-compatible base URL (`LOCAL_LLM_BASE_URL`, default Ollama).

Every provider call is wrapped in a span that records the exact request body and raw response.

## Run engine (lib/engine)

`POST /api/runs` creates the run, returns immediately, and executes it in the background inside the API route process. Puzzle definitions supply an async generator that yields decisions; the engine wraps each in spans, appends logs, updates progress, and writes the summary when finished. Screens poll `GET /api/runs/:id` every second for progress and results. Runs can be cancelled via `POST /api/runs/:id/cancel`.

### Engine

`POST /api/runs` validates the config, resolves everything it names and answers **202** with the queued run; execution continues in the process that served the request, so screens poll `GET /api/runs/:id`. `prepareRun(config)` (`lib/engine/setup.ts`) is the resolution step and is called twice on purpose — once by the route, so a missing character, object or adventure is a 400 naming it before a run exists, and once by the engine when it starts, because the store may have changed. It also computes `progress.total`: trolley Σ runs, prisoner's dilemma runs × iterations × 2, adventure Σ runs (a path is the unit, whatever its length). Trolley object ids resolve against the user's objects first and the built-in catalogue second.

A puzzle supplies a `PuzzleRunner`: a total, an `emptySummary()`, a pure `reduce()` and an async generator of `DecisionEvent`s. The engine knows nothing else about the puzzle. For every event it does the same four things — write its spans, fold it into the summary, persist `progress` **and the partial summary**, log it — which is what lets a screen animate a run: the summary read mid-run has the final shape with fewer decisions in it. `updateRunSummary` appends a `summary` run event for this, so a progress tick and a summary rewrite stay two short lines rather than a rewritten run.

**Span tree.** Each event names the chain of spans it belongs under, and the engine opens each segment the first time it is mentioned:

```
run
└── character                     one per roster entry (per side, for the dilemma)
    └── iteration                 one per run index; for the dilemma, game then round
        └── provider-call         one per upstream round trip, retries and fallbacks included
```

Adventures use a `node` span per step in place of the innermost `iteration`. The span a decision belongs to carries the final `DecisionRecord`; each `provider-call` span carries the exact request body as `input` and the raw response as `output`, so a run can be read back call by call.

**Concurrency.** `mergePool` (`lib/engine/pool.ts`) runs up to `RUN_CONCURRENCY` (default 3, capped at 16) sequences at once and yields their decisions as they arrive. What a sequence is depends on the puzzle: one decision for the trolley, one game for the dilemma (its rounds are strictly ordered, because round n+1 is the one where a player knows what happened in round n), one walk for an adventure (its nodes are ordered for the same reason). A player's two decisions within a round go out together.

**Failure** is asymmetric. A decision that fails is retried once if the `ProviderError` is retryable, then recorded — `error` on its span, `errors` in the summary — and the run continues, because a model that will not answer is a finding. Only a failure to set the run up fails the run.

**Cancellation** goes through the store. `POST /api/runs/:id/cancel` appends the `cancelled` event; the engine looks for it between decisions (reading `data/runs/index.jsonl` directly, since the run store's cache only sees its own module's writes) and stops, keeping the partial summary. The in-process `AbortController` in `lib/engine/registry.ts` is a fast path, not the mechanism: in the dev server the cancel request does not share module state with the request the run is executing inside.

## Theme (theme/)

`theme/tokens.ts` is the only place a color, font family, radius, shadow, or duration literal appears. Base theme "scroll": parchment surfaces, iron-gall-ink foreground, rubric red accent, verdigris secondary, gilt highlight. A "nightScroll" dark variant shares the same token keys, so `prefers-color-scheme: dark` is intentional rather than inverted. Display font Cinzel, body font Cormorant Garamond, GFS Neohellenic for Greek subtitles.

`npm run theme:css` (run automatically by `predev` / `prestart` / `prebuild`) derives two files from the tokens so they cannot drift: `theme/global.css` (CSS variables for `:root`, `.dark` and the dark media query) and `theme/tailwind-tokens.cjs` (the `theme.extend` object). Colors reach Tailwind as `rgb(var(--color-x) / <alpha-value>)`; native gets the same variables through NativeWind `vars()`. The Tailwind scales are named rather than numeric (`p-md`, `rounded-lg`, `text-base`, `h-control-md`, `shadow-ink-soft`, `duration-fast`, `z-overlay`, `w-menu`, `opacity-disabled`, `bg-foreground/scrim`), so an off-scale class stands out in review. A second theme is a second token object.

## Platform notes

- React Flow requires the DOM. `components/flow/*.web.tsx` hold the real implementation; `.native.tsx` siblings render a notice. Everything else runs on native.
- Drag and drop on the trolley screen uses react-native-gesture-handler + reanimated so it works on all platforms; every drop target also accepts a tap-to-place fallback.
