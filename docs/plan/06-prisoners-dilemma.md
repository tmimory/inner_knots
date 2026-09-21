# Phase 6 — Prisoner's dilemma

## Checklist
- [ ] Roster: exactly two characters, Player A and Player B.
- [ ] Relationship phrases (≤250 each, disabled by default).
- [ ] Prompt variants: thought experiment / interrogation room.
- [ ] Crime description: locked default (jewelry heist, $5M, nobody hurt), unlock to edit, ≤1000.
- [ ] Payoffs: symmetric (4 fields) or asymmetric (6 fields) with awareness toggle; injected into prose via prompt fragment.
- [ ] Single vs iterated (≤10); history fragment carries prior actions into each round.
- [ ] Prompt View side by side; progress bar; side-by-side histograms; Jev weights recorded.

## Engine

`POST /api/runs` takes `{ config: { puzzle: "prisoners-dilemma", ... } }`. Games run in parallel, rounds within a game strictly in order, and the two players of a round decide simultaneously — neither prompt contains the other's answer for that round. A round that does not produce two answers ends its game, so a game may hold fewer rounds than `iterations`. `progress.total` is `runs × iterations × 2`.

The screen reads `PrisonersDilemmaSummary` (`lib/domain/summary.ts`), rewritten after every decision, so a round appears half-filled while its second answer is still in flight:

```ts
PrisonersDilemmaSummary = {
  kind: "prisoners-dilemma";
  games: { game: number; rounds: { round: number; a: PlayerDecision; b: PlayerDecision }[] }[];
  perPlayer: { a: PlayerTally; b: PlayerTally };
  outcomes: { bothTestify; bothSilent; onlyATestifies; onlyBTestifies; incomplete };
}
PlayerDecision = { choice?: "testify" | "silent"; weights?; confidence?; latencyMs?; error? }
PlayerTally   = { testify; silent; errors; meanWeights?: { testify; silent } }
```

Spans nest as run → character (one per side, so a character playing itself stays separable) → iteration (game) → iteration (round) → provider-call.

## Done
_(fill in on completion)_
