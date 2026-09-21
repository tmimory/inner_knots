# Phase 7 — Choose your own adventure

## Checklist
- [ ] Adventure list (saved in `data/adventures.jsonl`), create / duplicate / delete.
- [ ] Builder (React Flow, web): DecisionNode with context ≤1000, decision ≤500, up to 5 options (label, outcome ≤500) each with a source handle; connect option → node or mark as end. Start node marker. Validation (unreachable nodes, dangling options).
- [ ] Amnesia toggle, briefing ≤1000, roster 1–5 with run counts.
- [ ] Engine: walk tree per run; with memory, prior nodes/choices/outcomes are included via history fragment; with amnesia each node is a fresh prompt.
- [ ] Outcome view: read-only React Flow with node hit counts and option frequencies as edge labels/thickness; select a single run to highlight its path.

## Done
_(fill in on completion)_
