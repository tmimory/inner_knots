# inner_knots

An exploration of philosophical puzzles that push the limits of AI models, to find the actual values encoded in them and how steerable each is via various prompting strategies.

## What it is

inner_knots is a local research bench for running AI "characters" — a model, a provider, an output mode, and an optional steering prompt — through philosophical puzzles (the trolley problem, the prisoner's dilemma, a choose-your-own-adventure tree) and comparing the choices they make. It is unrealistic by design: options are named and bounded, payoffs are spelled out, and every prompt sent and every response received is recorded and readable afterward. The point is to see what a model does when a dilemma is stripped down to a forced choice, not to build a realistic simulation.

## Quick start

Prerequisites: **Node >= 22.18** (the theme generator relies on Node's native TypeScript type stripping) and npm.

```
cp .env.example .env
# add at least one provider key, or run a local model (see Providers below)
npm install
npm run dev
```

`npm run dev` prints a URL — open it in a browser. Web is the primary target; native builds run the same code except the React Flow adventure builder, which is web only. All puzzle prompts are sent from Expo Router API routes running in Node on the dev server, so provider API keys are read from `.env` on the server and never reach the browser bundle.

If you don't have a provider key handy, set `LOCAL_LLM_BASE_URL` (default `http://localhost:11434/v1`, Ollama's default) and run `ollama serve` with a model pulled — the local provider needs no key.

## Providers

A provider is enabled when its key (or, for the local provider, its base URL) is present in `.env`. Model lists, capabilities and structured/tool support come from each provider at request time; `GET /api/providers` reports which are enabled and `GET /api/providers/:id/models` lists their models with capabilities.

| Provider | Env variable(s) | Models | Structured output | Tool mode | Effort |
| --- | --- | --- | --- | --- | --- |
| **typesafe** (Jev) | `TYPESAFE_API_KEY` | `client.models.list()`; `jev-latest` pinned first | Only mode (one `choice` question) | Not supported | None |
| **openai** | `OPENAI_API_KEY` | `client.models.list()`, filtered to chat-capable families | `json_schema` (strict) | Forced `choose` function tool | `reasoning.effort` on reasoning families (o1/o3/o4/gpt-5/6) only |
| **anthropic** | `ANTHROPIC_API_KEY` | `client.models.list()` | `output_config.format` (native), falls back to a forced tool | Forced `choose` tool | `output_config.effort` or a thinking budget, depending on model |
| **local** | `LOCAL_LLM_BASE_URL`, `LOCAL_LLM_API_KEY` (optional) | `GET {base}/models` | `response_format: json_schema`, falls back to `json_object` | Forced `choose` function tool | None |
| **openrouter** | `OPENROUTER_API_KEY` | `GET /api/v1/models` (public catalogue, ~440 models) | `response_format: json_schema` | Forced `choose` function tool | `reasoning.effort` where a model supports it |

Run-wide knobs, also in `.env.example`:

- `MAX_OUTPUT_TOKENS` — hard clamp applied to every provider call, so no model can overthink a choice.
- `DEFAULT_EFFORT` — used when a character does not set its own effort (`low` \| `medium` \| `high`).
- `RUN_CONCURRENCY` — how many decisions the run engine keeps in flight at once (default 3, capped at 16).

`POST /api/providers/:id/test` runs a trivial two-option decision through the real path, which is the quickest way to check a key is working.

## Using the app

**Characters** (`/characters`) are the cast list every puzzle page seats its own roster from: an identifier (unique, no spaces), an avatar (shape + color), a provider and model, an output mode (structured JSON vs. a forced tool call — tool mode is disabled when the model doesn't support it), an optional effort level, and a steering mode — `raw` (no system prompt), `bio` ("You are ..."), or `full` (bio plus lists of principles and values). The editor's Final Prompt panel shows the exact steering text a run will send, composed live from the same prompt fragments a run uses.

**Puzzles:**

- **Trolley** (`/puzzles/trolley`) — drag objects from a searchable, tag-filterable catalogue (people, relations, animals, singular items) onto two tracks, pick a framing variant (thought experiment / trolley-company employee / bystander), add a roster of 1–5 characters with a run count each, and pull the lever. Results show a per-character histogram of Track 1 vs. Track 2 with mean Jev weights where a provider reports them.
- **Prisoner's dilemma** (`/puzzles/prisoners-dilemma`) — exactly two players (Player A / Player B), an optional relationship phrase for each, a framing variant (thought experiment / interrogation room), an editable crime description, a payoff matrix (symmetric or per-player, with an awareness toggle for whether each player sees the other's consequences), and single or iterated rounds (up to 10, with prior rounds fed back into each next prompt). Results show side-by-side histograms and per-round outcomes.
- **Choose your own adventure** (`/puzzles/adventure`) — build a decision tree with a React Flow canvas: each node has context, a decision prompt, and up to five options (each an edge to another node or an ending). An amnesia toggle controls whether a walk remembers its own history. Running it walks the tree per roster character and shows an outcome view — a read-only graph with node hit counts and option frequencies — plus a per-walk step list.

**Logs** (`/logs`) list every run, grouped by day and filterable by puzzle, character and status. Opening a run shows its stored configuration, its summary, the full span tree (run -> character -> iteration -> provider call), and — per span — the exact system prompt, messages, schema or tool definition sent, the raw provider response, and the normalized decision with weights. A run can be exported as a single JSONL bundle (`<runId>.jsonl`, one tagged line per run/span/log record).

## Where your data lives

Everything is local, human-readable JSONL under `data/` (path configurable via `DATA_DIR`; created on first write, gitignored):

```
data/characters.jsonl        append-only upsert/delete log, replayed to current state
data/objects.jsonl           custom trolley objects
data/adventures.jsonl        saved adventure trees
data/runs/index.jsonl        one event per run status change (created/progress/finished/...)
data/runs/<runId>/spans.jsonl
data/runs/<runId>/logs.jsonl
```

Inspect it with `jq`, e.g. `jq -c 'select(.op=="upsert")' data/characters.jsonl` or `jq -c 'select(.kind=="span")' data/runs/<runId>/spans.jsonl` after exporting.

## Editing prompts

Prompt text lives entirely under `prompts/**/*.md` — nothing in application code contains prompt prose. Each fragment is a markdown file with YAML frontmatter (`id`, `description`, `variables`) and a body in a small hand-written template language:

```
{{name}}                        plain substitution
{{#if name}}…{{/if}}            included when the value is truthy and non-empty
{{#if name}}…{{else}}…{{/if}}   the alternative when it is not
{{#each list}}…{{/each}}        repeated per item; {{this}} is the item
{{this.field}}                  a field of the current item
```

A fragment's `id` must equal its path under `prompts/` without the extension. Fragments are cached and re-read when their file's mtime changes, so editing a prompt during `npm run dev` takes effect on the next request — no restart needed. `GET /api/prompts/fragments` returns every fragment's id, description, variables and raw (unrendered) body, which is what a "view the prompts" screen reads from.

## Extending

- **Add a trolley object** — use the in-app object creator on `/puzzles/trolley` (icon, id, prompt <= 250 chars), or add to the grammar in `lib/puzzles/trolley/catalogue.ts` (nouns x modifiers x possessors, expanded deterministically).
- **Add a prompt variant** — add a markdown fragment under the relevant `prompts/<puzzle>/` directory and reference it from that puzzle's prompt builder in `lib/puzzles/<puzzle>/`.
- **Add a provider** — implement the `ProviderAdapter` interface (`lib/providers/types.ts`) in `lib/providers/<id>.ts`, register it in `lib/providers/factory.ts`, and read its key/URL from `lib/providers/env.ts`; add the new variable to `.env.example`.
- **Add a theme** — add a token object to `theme/tokens.ts` (same keys as `scroll`/`nightScroll`) and run `npm run theme:css` to regenerate `theme/global.css` and `theme/tailwind-tokens.cjs`.
- **Add a puzzle** — a domain type and zod schema in `lib/domain/`, a prompt builder and runner in `lib/puzzles/<puzzle>/`, a summary reducer in `lib/domain/summary.ts`, an API route under `app/api/`, and a screen under `app/puzzles/`.

## Scripts

```
npm run dev          start the Expo dev server for web (regenerates theme CSS first)
npm run typecheck     tsc --noEmit
npm run lint          expo lint
npm test              vitest run
npm run theme:css     regenerate theme/global.css and theme/tailwind-tokens.cjs from theme/tokens.ts
```

## License

MIT, Travis McQueen 2026. See `LICENSE`.
