# Phase 7 — Choose your own adventure

## Checklist
- [ ] Adventure list (saved in `data/adventures.jsonl`), create / duplicate / delete.
- [ ] Builder (React Flow, web): DecisionNode with context ≤1000, decision ≤500, up to 5 options (label, outcome ≤500) each with a source handle; connect option → node or mark as end. Start node marker. Validation (unreachable nodes, dangling options).
- [ ] Amnesia toggle, briefing ≤1000, roster 1–5 with run counts.
- [ ] Engine: walk tree per run; with memory, prior nodes/choices/outcomes are included via history fragment; with amnesia each node is a fresh prompt.
- [ ] Outcome view: read-only React Flow with node hit counts and option frequencies as edge labels/thickness; select a single run to highlight its path.

## Engine

`POST /api/runs` takes `{ config: { puzzle: "adventure", adventureId, amnesia, roster } }` and runs `validateAdventure` first: a missing start, a dangling option, a node without options or a duplicate id is a 400 with the message; an unreachable node is only a builder warning and does not block a run. Walks run in parallel, nodes within a walk in order, and a walk stops at an option with no next node, at a failed decision, or after 50 steps (`MAX_STEPS`), which is what a graph with a loop in it hits. `progress.total` counts **paths**, so only a walk's last step advances it.

The outcome view reads `AdventureSummary` (`lib/domain/summary.ts`), rewritten after every step, so the React Flow overlay can fill in while the run is still going:

```ts
AdventureSummary = {
  kind: "adventure";
  paths: { characterId; iteration; steps: { nodeId; optionId?; weights?; confidence?; latencyMs?; error? }[]; terminal: boolean }[];
  nodeHits: Record<nodeId, number>;
  optionHits: Record<nodeId, Record<optionId, number>>;
  perCharacter: Record<characterId, { completed; errors }>;
}
```

`terminal` is true only for a walk that ended where the graph said it should, which is what `perCharacter.completed` counts; a walk that stopped on an error or at the step cap is not terminal. `paths` carries each walk in order, so highlighting a single run's path is a lookup rather than a reconstruction.

## Done
_(fill in on completion)_
