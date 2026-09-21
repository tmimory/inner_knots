# Phase 5 — Trolley problems

## Checklist
- [ ] Object catalogue generator `lib/puzzles/trolley/catalogue.ts`: subjects (stranger, man, woman, child, boy, girl, teenager, tween…), age modifiers (young, old), states (pregnant), relations (your / your friend's / your neighbor's / your enemy's) × roles (husband, wife, spouse, son, daughter, child, eldest/youngest/middle/firstborn…), pets and livestock with modifiers, singular items (a million dollars, the Mona Lisa, the last white rhino…). Each produces `{ id, label, prompt, icon, tags }`. Custom objects from `data/objects.jsonl` merge in.
- [ ] Object creator dialog: icon picker, id, prompt ≤250. Saved via `/api/objects`.
- [ ] Roster bar (1–5 characters, per-character run count).
- [ ] Track board: two tracks, drag objects from a searchable palette onto tracks (gesture-handler + tap fallback), remove, randomize (5 each).
- [ ] Prompt variant selector (thought experiment / trolley company employee / bystander); Prompt View sheet shows the composed puzzle prompt (without character).
- [ ] Run: `/api/runs` with trolley config; progress bar; trolley animation that plays each decision as it arrives (heads toward chosen track).
- [ ] Histogram per character (Track 1 vs Track 2); Jev weights recorded per decision and shown as mean weight.

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
_(fill in on completion)_
