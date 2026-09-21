# Phase 3 — Provider layer

## Checklist
- [ ] `lib/providers/types.ts` (ProviderAdapter, ModelInfo, capabilities), `factory.ts` (`createProvider`, `listEnabledProviders` from env), `clamp.ts` (MAX_OUTPUT_TOKENS).
- [ ] Adapters: `typesafe.ts` (@typesafe-ai/sdk, one `choice` question, probabilities → weights, `models.list()`), `openai.ts` (Responses API, json_schema + tool mode, `reasoning.effort`), `anthropic.ts` (messages API, tool mode + structured via forced tool or output format, effort/thinking budget), `local.ts` (OpenAI-compatible base URL, `/models`), `openrouter.ts` (dynamic `/api/v1/models`, capabilities from `supported_parameters`).
- [ ] Every call wrapped in a span recording exact request + raw response + usage + latency.
- [ ] `/api/providers` returns enabled providers; `/api/providers/:id/models` returns models with capabilities.
- [ ] `/api/providers/:id/test` runs a trivial decision so a user can verify a key.
- [ ] Unit tests with mocked HTTP for each adapter's request shaping and response parsing.

## Done
_(fill in on completion)_
