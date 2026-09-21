# Phase 2 — Domain, storage, prompts

## Checklist
- [ ] `lib/domain/`: zod schemas + types for Character, TrolleyObject, Adventure (+ nodes/options), Run, Span, LogEvent, DecisionRequest/Result, ProviderId, OutputMode, EffortLevel. Character limits (bio/principle/value ≤500, ≤10 each) and identifier rule (no spaces) enforced in the schema.
- [ ] `lib/storage/jsonl.ts`: `appendLine`, `readLines`, `replayCollection`, `compact`. `lib/storage/collections.ts`: typed repos for characters, objects, adventures. `lib/storage/runs.ts`: run index, span and log appenders, readers.
- [ ] `lib/prompts/`: loader for `prompts/**/*.md` (frontmatter + body), `compose(id, vars)` with `{{var}}` and `{{#if}}` support, and a startup check that every fragment referenced in code exists and declares its variables.
- [ ] Prompt fragments written: characters (bio, principles, values), trolley (3 variants + decision + track description), prisoners-dilemma (2 variants + payoffs + history + relationship), adventure (briefing, node, history), shared output instructions.
- [ ] API routes: CRUD for `/api/characters`, `/api/objects`, `/api/adventures`; `/api/prompts/:id` returns a rendered preview; `/api/runs` list/get.
- [ ] Unit tests (vitest) for jsonl replay and prompt compose.

## Done
_(fill in on completion)_
