# Phase 3 — Provider layer

## Checklist
- [x] `lib/providers/types.ts` (ProviderAdapter, ModelInfo, capabilities), `factory.ts` (`createProvider`, `listEnabledProviders` from env), `clamp.ts` (MAX_OUTPUT_TOKENS).
- [x] Adapters: `typesafe.ts` (@typesafe-ai/sdk, one `choice` question, probabilities → weights, `models.list()`), `openai.ts` (Responses API, json_schema + tool mode, `reasoning.effort`), `anthropic.ts` (messages API, tool mode + structured via forced tool or output format, effort/thinking budget), `local.ts` (OpenAI-compatible base URL, `/models`), `openrouter.ts` (dynamic `/api/v1/models`, capabilities from `supported_parameters`).
- [x] Every call wrapped in a span recording exact request + raw response + usage + latency.
- [x] `/api/providers` returns enabled providers; `/api/providers/:id/models` returns models with capabilities.
- [x] `/api/providers/:id/test` runs a trivial decision so a user can verify a key.
- [x] Unit tests with mocked HTTP for each adapter's request shaping and response parsing.

## Done

Shipped 2026-09-21. Five providers behind one interface, every call traced.

### What shipped

**Contract** (`lib/providers/types.ts`). `DecisionRequest` / `DecisionRecord` / `ProviderCallRecord` / `TraceContext` / `ModelInfo` / `ProviderAdapter`, plus `ProviderError` (`provider`, `status?`, `retryable`) and `isRetryableStatus()`. `DecisionRecord` gained `confidence?: number` beyond the architecture sketch, because TypeSafe reports one and it is not a weight.

**Configuration** (`lib/providers/env.ts`). The only file in the layer that touches `process.env`. It reads `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `TYPESAFE_API_KEY`, `OPENROUTER_API_KEY`, `LOCAL_LLM_BASE_URL`, `LOCAL_LLM_API_KEY`, `MAX_OUTPUT_TOKENS`, `DEFAULT_EFFORT` — all already in `.env.example`, so no new variable was added. Values are read at call time, never captured at module load, so a route that boots before `.env` loads still sees the key and tests can vary the environment per case. Whitespace-only counts as absent. `isProviderEnabled(id)` is key-presence, except `local`, which is enabled by its base URL (the default Ollama URL counts; a dead server surfaces as a `ProviderError` from `listModels`, not a missing provider).

**Clamp** (`lib/providers/clamp.ts`). `clampMaxTokens(requested?)` = `min(requested ?? MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS)`, floor 16. Every adapter applies it; a character can lower the ceiling, never raise it.

**Shared** (`lib/providers/shared/`). `decision-schema.ts` builds the one JSON schema both modes carry and the `choose` tool, and `parseChoice()` validates an answer (exact id → case-insensitive id → case-insensitive label → throw). `messages.ts` folds `system` + `messages` into each vendor's convention. `trace.ts` is where a call is timed, recorded and its error normalized — adapters route HTTP through `tracer.run()` rather than awaiting the SDK, so a failed call produces a record too, and an adapter that retries produces two. `http.ts` is plain JSON fetch for the catalogue endpoints no SDK covers. `openai-chat.ts` holds everything the two OpenAI-compatible adapters share.

**Factory** (`lib/providers/factory.ts`). `createProvider`, `listProviders` (all five, with `enabled`), `listEnabledProviders`, `getModels` / `refreshModels` / `clearModelCache` over a ten-minute in-memory cache. Building an adapter never needs a key or a network call, so the factory is safe to use just to read a label; a missing key surfaces from `decide` / `listModels` as a non-retryable 401.

### Per-provider implementation

| Provider | Endpoint | Structured mode | Tool mode | Effort | Models | Notes / fallbacks |
| --- | --- | --- | --- | --- | --- | --- |
| **typesafe** | `@typesafe-ai/sdk` 0.6.0, `client.systemOne` | The only mode. One `choice(instructions, criteria)` question named `decision`; `state` is `{ character, transcript }`, `instructions` is `req.question` (default "Which option does this character choose?"), criteria are keyed by option id with `"Label — description"` as the value. | Not supported — `decide` throws a non-retryable `ProviderError`, and `capabilities.toolCalls` is `false` so the UI never offers it. | None. `effort: []`. | `client.models.list()` → `ModelCard.name`. | `probabilities` → `weights` (keys not on offer are dropped), `confidence` → `confidence`, `usage.input_tokens/output_tokens` → `usage`. No output-token parameter exists, so the clamp does not apply. `jev-latest` is pinned first, and prepended if the account list omits it. |
| **openai** | `openai` 7.20, Responses API (`client.responses.create`) | `text.format = { type: "json_schema", name: "decision", schema, strict: true }`. | `tools: [{ type: "function", name: "choose", parameters, strict: true }]`, `tool_choice: { type: "function", name: "choose" }`. | `reasoning: { effort }` only for reasoning families (`o1`, `o3`, `o4`, `gpt-5`, `gpt-6` — the list lives in `REASONING_MODEL_PREFIXES`). `none` → `"minimal"` on the gpt-5/6 families, dropped on the o-series, which has nothing below `low`. | `client.models.list()`, filtered to `gpt-*`/`o1*`/`o3*`/`o4*`/`chatgpt-*` minus audio/realtime/tts/transcribe/embedding/image/moderation/codex, sorted. | Character steering goes in `instructions`, not a system message, so the puzzle transcript stays exactly what the puzzle wrote. `max_output_tokens` = clamp. |
| **anthropic** | `@anthropic-ai/sdk` 0.127, Messages API | `output_config.format = { type: "json_schema", schema }` — native, GA in this SDK version. | Tool `choose` with `input_schema`, `tool_choice: { type: "tool", name: "choose" }`. | `output_config.effort` on current models; `thinking: { type: "enabled", budget_tokens }` (low 1024 / medium 2048 / high 4096) on older thinking-capable models; nothing on the rest. | `client.models.list({ limit: 100 })`, reading the API's own `capabilities.structured_outputs` and `capabilities.effort`, with a family fallback when a model reports none. `max_input_tokens` → `contextWindow`. | **Two fallbacks.** If the structured call fails 400/404/422 mentioning `output_config`/`json_schema`, it retries as a forced `choose` tool and the second call record carries `structuredVia: "forced-tool"`. If a thinking budget will not fit inside the clamped `max_tokens` (budget + 64), thinking is dropped and the record carries `effortDropped: "..."` rather than failing the run. |
| **local** | `openai` SDK pointed at `LOCAL_LLM_BASE_URL`, chat completions | `response_format: { type: "json_schema", json_schema: { name, schema, strict: true } }`. | `tools` + `tool_choice: { type: "function", function: { name: "choose" } }`. | None. `effort: []`. | `GET {base}/models`. | **Fallback:** a server that rejects the schema (400/404/422/501 mentioning `json_schema`/`response_format`) is retried with `response_format: { type: "json_object" }` and the option list appended to the system prompt; the second record carries `structuredVia: "json-object"`. `apiKey` is `LOCAL_LLM_API_KEY` or the literal `"local"`. Capabilities are assumed (`structuredOutput`/`toolCalls` true) because local servers rarely declare them. |
| **openrouter** | `openai` SDK at `https://openrouter.ai/api/v1`, chat completions | Same as local's `json_schema`. | Same as local's. | `reasoning: { effort }` as an extra body parameter, for `low`/`medium`/`high`; `none` sends nothing. | `GET /api/v1/models`, capabilities read from `supported_parameters` — `tools`/`tool_choice` → `toolCalls`, `structured_outputs`/`response_format` → `structuredOutput`, `reasoning`/`include_reasoning` → `effort`. `context_length` → `contextWindow`. Sorted by label. | Sends `HTTP-Referer: https://github.com/inner-knots` and `X-Title: inner_knots`. The catalogue is public, so it lists without a key and sends the key only when present. |

### Tracing

Every adapter wraps its HTTP in `tracer.run(body, call)`. The tracer emits a `ProviderCallRecord` with the exact body sent, the raw response (or a `{ name, message, status, body }` summary of the failure), ISO start/end stamps and, on failure, `error` — **always**, success or not. A throwing `onCall` is swallowed so a broken trace sink cannot turn a good answer into a failed run. `latencyMs` on the `DecisionRecord` covers the whole decision, so an adapter that retried reports the total.

### How the engine calls it

```ts
import { createProvider } from "@/lib/providers/factory";
import type { ProviderCallRecord } from "@/lib/providers/types";

const calls: ProviderCallRecord[] = [];
const decision = await createProvider(character.provider).decide(
  {
    model: character.model,
    system: character.systemPrompt,          // undefined for a raw character
    messages: [...history, { role: "user", content: puzzlePrompt }],
    options,                                  // 2..5, ids are what comes back
    outputMode: character.outputMode,
    effort: character.effort,                 // `defaultEffort()` from env when unset
    maxTokens: character.maxTokens,           // clamped regardless
    question: puzzle.question,                // TypeSafe `instructions`
  },
  { onCall: (record) => calls.push(record) },
);
```

Everything throwable is a `ProviderError` with `provider`, `status?` and `retryable` — retry on `retryable`, surface the message otherwise. `decision.weights` is present only for TypeSafe; `decision.confidence` likewise.

### API routes

- `GET /api/providers` → `{ providers: [{ id, label, enabled }] }` for all five. No key value ever leaves the process.
- `GET /api/providers/:id/models` → `{ models: ModelInfo[] }`. `?refresh=1` bypasses the ten-minute cache. 400 for an unknown id, 503 with the message when the provider is unconfigured or the upstream call fails.
- `POST /api/providers/:id/test` `{ model, outputMode? }` → `{ decision, calls }`. Runs "Which is larger, 3 or 7?" with options `three`/`seven` through the real `decide()` path, so a user verifying a key exercises the same shaping, clamping and parsing a puzzle run would.
- `lib/client/providers.ts`: `fetchProviders()`, `fetchModels(id, refresh?)`, `testProvider(id, model, outputMode?)`. Types only cross the boundary, so no vendor SDK can reach the app bundle.

### Verification

`npm run typecheck`, `npm run lint` and `npm test` all clean (157 tests across 19 files; 77 of them in `lib/providers`). Against a live server on :8095: `GET /api/providers` returned all five with `enabled` matching the environment, `GET /api/providers/openrouter/models` returned **440 models** with capabilities mapped from `supported_parameters`, `?refresh=1` re-fetched, an unknown id returned 400 and an unconfigured provider 503.

### Deviations from the plan

1. **Two schema variants.** The plan's schema has `required: ["choice"]`, but OpenAI-style `strict: true` rejects a schema whose `properties` are not all `required`. `buildDecisionSchema()` is the plan's shape (used for Anthropic `input_schema` and the local/OpenRouter tool parameters); `buildStrictDecisionSchema()` makes `rationale` `["string","null"]` and required, and is used everywhere `strict: true` is sent. `parseChoice` treats a null or blank rationale as absent.
2. **Anthropic uses `output_config`, not a forced tool.** The installed SDK exposes `output_config: { format, effort }` on the non-beta Messages API, so structured output and effort are both native. The forced-tool path is kept as a fallback and still records `structuredVia: "forced-tool"`.
3. **`DecisionRecord.confidence`** was added to the type for TypeSafe's reported confidence, rather than folding it into `weights` or `rationale`.
4. **OpenRouter's catalogue is served without a key.** `/api/providers/:id/models` 503s for an unconfigured provider, except OpenRouter, whose model list is genuinely public — the picker can show what is on offer before anyone signs up. Running a puzzle against those models still needs the key.
5. **`jev-latest` is prepended** when TypeSafe's account catalogue omits it, since it is the SDK's own default model.
6. **`shared/openai-chat.ts` and `shared/http.ts`** are not in the plan's file list; they hold what the two OpenAI-compatible adapters share and the plain-fetch catalogue calls, so the adapters stay thin.

### Open risks

- **OpenAI `none` → `minimal`.** `minimal` is the lowest setting the whole gpt-5 family accepts; newer members also accept `none`. Sending `minimal` is valid on both, so this is conservative rather than wrong, but it is not the literal lowest on the newest models.
- **Anthropic's effort/thinking split is matched by model-id regex** at request time, because the capability data only arrives with `models.list()`. A model id outside the known families gets no reasoning control rather than an error.
- **Anthropic `models.list({ limit: 100 })` reads one page.** The catalogue is well under 100 entries today; a longer list would need pagination.
- **Local-server capabilities are assumed.** `structuredOutput` and `toolCalls` are reported as true for every local model because OpenAI-compatible servers do not declare them; the structured fallback is what catches a server that cannot keep the promise.
