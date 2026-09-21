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
                         GreekKey ornament, wordmark, roster bar
  avatars/               15 SVG avatars + color swatches
  charts/                histogram
  flow/                  React Flow nodes/edges (.web.tsx) with .native.tsx fallbacks
  puzzles/               puzzle-specific UI
lib/
  domain/                types + zod schemas (Character, TrolleyObject, Adventure, Run, Span, LogEvent)
  storage/               JSONL store (server only)
  prompts/               markdown loader + composer
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
  trolley/               thought-experiment.md, employee.md, bystander.md, decision.md
  prisoners-dilemma/     thought-experiment.md, interrogation.md, payoffs.md, history.md
  adventure/             briefing.md, node.md, history.md
  shared/                output-instructions.md
data/                    local JSONL data (gitignored). Created on first run.
docs/                    this documentation
```

## Data model (lib/domain)

All entities carry `id`, `createdAt`, `updatedAt`.

- **Character**: `id` (user identifier, no spaces, unique; defaults to UUID), `avatar: { shape, color }`, `provider`, `model`, `outputMode: "structured" | "tool"`, `effort?`, `steering: { mode: "raw" | "bio" | "full", bio?, principles: string[], values: string[] }`. The composed steering prompt is derived, never stored.
- **TrolleyObject**: `id`, `label`, `prompt` (≤250 chars), `icon` (key into the SVG set), `builtIn: boolean`, `tags`.
- **Adventure**: `id`, `name`, `briefing` (≤1000), `nodes[]`, `edges[]`, `startNodeId`. Node = `{ id, context ≤1000, decision ≤500, options: [{ id, label, outcome ≤500, nextNodeId | null }] }`. Stored with React Flow positions.
- **Run**: `id`, `puzzle: "trolley" | "prisoners-dilemma" | "adventure"`, `config` (full puzzle configuration snapshot incl. roster and per-character run counts), `status`, `progress: { done, total }`, `startedAt`, `finishedAt`, `summary` (puzzle-specific reducer output: histogram counts, per-node frequencies).
- **Span**: `runId`, `spanId`, `parentSpanId`, `name` (run / character / iteration / provider-call), `characterId`, `iteration`, `startedAt`, `endedAt`, `status`, `input` (exact system + messages + tool/schema sent), `output` (raw provider response), `decision` (normalized: `choice`, `weights?` for Jev probabilities, `usage`, `latencyMs`), `error?`.
- **LogEvent**: `runId`, `ts`, `level`, `message`, `data?`.

## Storage (lib/storage)

Server-only JSONL under `data/`:

- `data/characters.jsonl`, `data/objects.jsonl`, `data/adventures.jsonl`: append-only event logs of `{ op: "upsert" | "delete", entity }`. Reading replays the file; the last op per id wins. A `compact()` helper rewrites the file.
- `data/runs/index.jsonl`: one line per run status change (created, progress, finished, failed). Replay gives current state.
- `data/runs/<runId>/spans.jsonl` and `data/runs/<runId>/logs.jsonl`: append-only.

Everything is human-readable and can be reviewed with `cat` or `jq`.

## Prompts (prompts/, lib/prompts)

Prompt fragments are markdown files with YAML frontmatter (`id`, `description`, `variables`). Bodies use `{{variable}}` placeholders and `{{#if x}}...{{/if}}` blocks. `lib/prompts/compose.ts` loads a fragment by id, validates that all declared variables are provided, and renders it. Puzzle definitions in `lib/puzzles/*` assemble the final prompt from fragments. Nothing in code contains prompt prose.

The character steering prompt is composed from `prompts/characters/*`:

- raw → no system prompt from the character.
- bio → "You are {{bio}}".
- full → bio, then "You are guided by the following principles:" list (omitted when empty), then "Your values are as follows:" list (omitted when empty).

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

`startRun(config)` creates the run, returns immediately, and executes in the background inside the API route process. Puzzle definitions supply an async generator that yields decisions; the engine wraps each in spans, appends logs, updates progress, and writes the summary when finished. Screens poll `GET /api/runs/:id` every second for progress and results. Runs can be cancelled via `POST /api/runs/:id/cancel`.

## Theme (theme/)

`theme/tokens.ts` is the only place a color, font family, radius, shadow, or duration literal appears. Base theme "scroll": parchment surfaces, iron-gall-ink foreground, rubric red accent, verdigris secondary, gilt highlight. A "nightScroll" dark variant shares the same token keys, so `prefers-color-scheme: dark` is intentional rather than inverted. Display font Cinzel, body font Cormorant Garamond, GFS Neohellenic for Greek subtitles, Greek-key ornament components.

`npm run theme:css` (run automatically by `predev` / `prestart` / `prebuild`) derives two files from the tokens so they cannot drift: `theme/global.css` (CSS variables for `:root`, `.dark` and the dark media query) and `theme/tailwind-tokens.cjs` (the `theme.extend` object). Colors reach Tailwind as `rgb(var(--color-x) / <alpha-value>)`; native gets the same variables through NativeWind `vars()`. The Tailwind scales are named rather than numeric (`p-md`, `rounded-lg`, `text-base`, `h-control-md`, `shadow-ink-soft`, `duration-fast`, `z-overlay`, `w-menu`, `opacity-disabled`, `bg-foreground/scrim`), so an off-scale class stands out in review. A second theme is a second token object.

## Platform notes

- React Flow requires the DOM. `components/flow/*.web.tsx` hold the real implementation; `.native.tsx` siblings render a notice. Everything else runs on native.
- Drag and drop on the trolley screen uses react-native-gesture-handler + reanimated so it works on all platforms; every drop target also accepts a tap-to-place fallback.
