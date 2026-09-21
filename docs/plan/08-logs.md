# Phase 8 — Logs

## Checklist
- [x] Run list grouped by puzzle and day; filters by puzzle, character, status; shows roster avatars and summary.
- [x] Run detail: config snapshot, summary, span tree (run → character → iteration → provider call) with timing; click a span to see the exact system prompt, messages, schema/tool, raw response, normalized decision and weights.
- [x] Log stream tab; export run as JSONL bundle.

## Done

Shipped 2026-09-21. Every run the engine writes can now be read back in full: what was configured, what each model was sent, what it said, and what the reducer made of it.

### What shipped

**Screens.**

- `app/logs/index.tsx` — the ledger. Filters (puzzle, status, character, free text over the run id) sit on a Scroll panel; runs below are grouped by the day they started, newest day first, under a display-font heading that reads `Today` / `Yesterday` / `Sunday, 21 September 2026`. Each row carries the puzzle badge, the roster's faces, progress `done / total`, the status badge, and a one-line result — `Track 1 ×12 · Track 2 ×8`, `A testified 6/10, B 4/10`, `14 paths, 3 endings`. A row for a live run also shows a progress bar. The list refreshes itself every 2 s while any visible run is unfinished and goes quiet the moment they all settle.
- `app/logs/[id].tsx` — one run, in three tabs, reachable only by following a row (no menu entry). A header strip holds status, **Cancel** (while the run is live) and **Export**, over a stat row: started, duration, progress, span count, log count.
  - **Overview** — the stored config rendered as the puzzle states it (trolley: variant and both tracks with glyphs and catalogue labels; dilemma: variant, games, rounds, crime, relationships and the payoff matrix; adventure: name and whether amnesia was on), the roster with faces and per-character run counts, the error when it failed, and the summary as a compact per-character table with mean weights when the provider reported any.
  - **Spans** — the tree on the left, the selected span on the right (below, on a narrow viewport).
  - **Logs** — the stream, oldest first, with level chips, timestamps and expandable `data`.

**Components (`components/logs/`, one job each).** `run-row`, `run-filters`, `status-badge` (run, log-level and span-status variants), `roster-avatars` (`rosterOf` flattens all three puzzle shapes into seats), `summary-view` (+ `summaryLine`), `config-view`, `span-tree`, `span-detail`, `span-input`, `decision-view`, `message-block`, `json-tree`, `log-list`, `export-button`, and an `index.ts` barrel.

**What the span detail shows.** This is the point of the phase. For the selected span: its name, character, iteration/round/node, model, status, start → end and duration; the error text when it failed; the normalized decision (choice, per-option weights as a bar list, confidence when the provider reports it, token usage, latency, rationale); the **exact request**, with the system prompt and every turn rendered as role-labelled monospace parchment blocks and everything else in the body (`response_format` or `tools`, `max_tokens`, effort notes) as a collapsible JSON tree; and the **raw response** unmodified, also as a JSON tree. `readCallInput` normalizes the three vendor request shapes the provider layer produces — OpenAI-compatible `{ model, messages, … }`, Anthropic's separate `system`, and TypeSafe's `{ state: { character, transcript }, questions }` — and anything it does not recognize falls through to the JSON tree rather than being dropped.

**Hooks (`lib/client/use-runs.ts`).**

| Hook | Returns | Polls |
| --- | --- | --- |
| `useRuns(filter, { pollMs })` | `{ runs, loading, error, refresh }` | every `pollMs` (default 2000) while any run in the answer is not terminal |
| `useRunDetail(id, { pollMs })` | `{ run, spans, logs, loading, error, refresh }` | same rule, on the run's own status |
| `useCharacterIndex()` | `ReadonlyMap<string, Character>` | once |
| `useObjectIndex()` | `ReadonlyMap<string, ObjectEntry>` (built-in catalogue merged with custom objects) | once |
| `useAdventureName(id?)` | `string \| undefined` | once |

`isRunActive(run)` is the predicate, over the domain's own `isTerminalRunStatus`. The internal `usePolled` reads its callbacks through refs, so a caller may pass inline functions; a failed request backs off to four intervals and keeps trying rather than freezing a live view.

**Formatting (`lib/format.ts`).** `formatDuration`, `durationBetween` / `formatElapsed` (an unfinished span measures to now), `formatTime`, `formatDateTime`, `dayKey`, `formatDay`, `formatPercent`, `truncate`, and the shared `UNKNOWN` dash every formatter answers with rather than inventing a value. Covered by `lib/format.test.ts` (16 cases).

**Export.** One `<runId>.jsonl` file: the run, then every span, then every log line, each tagged (`{"kind":"span",…}`), so `jq 'select(.kind=="span")'` takes the bundle apart again. Web downloads it through a Blob and an anchor; on native the button toasts that export is web-only.

### Verification

`npm run typecheck`, `npm run lint` and `npm test` clean (206 tests before this phase's 16 were added; the engine and character phases were landing tests in parallel).

End to end against `npx expo start --web --port 8099` with a scratch `DATA_DIR` and a stand-in OpenAI-compatible server on `LOCAL_LLM_BASE_URL`: two characters (structured and tool mode), then a five-decision trolley run that finished with 13 spans — `run → character → iteration → provider-call`, every provider-call span carrying `{ model, messages, max_tokens, response_format }` with the system and user turns intact and a decision of `{ choice, rationale, usage, latencyMs }` — and an eight-decision dilemma run with 23 spans whose summary matched `prisonersDilemmaSummarySchema` (games, rounds, per-player tallies, outcomes). `/logs` and `/logs/<runId>` both answered 200 and server-rendered their shells. A twenty-decision run was cancelled mid-flight through `POST /api/runs/:id/cancel`: it went `running 12/20` → `cancelled 16/20`, keeping its partial summary. The scratch data directory and both servers were removed afterwards.

Design-token self-check over `app/logs/**` and `components/logs/**`: no hex or `rgb()` literals, no arbitrary Tailwind values, no raw palette classes, no numeric style literals. Status colors reuse the existing semantic tokens — `accent` for running, `secondary` for finished, `destructive` for failed, `muted` for cancelled, `outline` for queued — so no `status*` token group was needed.

### Deviations from the plan

1. **No new tokens.** The plan allowed an additive `status*` group; the existing semantic tokens covered every state, and inventing parallel status colors would have split one vocabulary into two.
2. **`components/logs/` has more than the nine files listed.** `config-view`, `log-list` and `export-button` were split out rather than inlined into the two screens, on the same "keep each small" principle the list was asking for.
3. **The auxiliary indexes live in `lib/client/use-runs.ts`.** Characters, trolley objects and an adventure's name are ids on a stored run and faces and labels on screen; the logs screens are the only place that conversion is needed, so it sits with them rather than becoming another client module. They are built on `useAsyncResource`, and errors read through `describeApiError`, so this phase adds no second copy of either.
4. **Cancel and the run clients are the shared ones.** `cancelRun` from `lib/client/runs.ts` is used directly rather than a second fetch wrapper, and polling stops via the domain's `isTerminalRunStatus`.
5. **The dilemma's two iteration levels are labelled `game` and `round`.** The engine names both spans `iteration`, correctly — nesting is nesting to it — but the reader is better served by the puzzle's own words, so the tree relabels by depth.
6. **A long string in the JSON tree is shortened until pressed.** A raw response can carry a whole prompt back; the tree previews 280 characters with a `▾ more` toggle, while the request's messages are always shown in full.
7. **Object labels resolve client-side.** `buildCatalogue()` is pure, so the run detail merges it with `/api/objects` in the browser instead of adding a route to resolve track ids.
