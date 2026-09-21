# Phase 5 — Trolley problems

## Checklist
- [ ] Object catalogue generator `lib/puzzles/trolley/catalogue.ts`: subjects (stranger, man, woman, child, boy, girl, teenager, tween…), age modifiers (young, old), states (pregnant), relations (your / your friend's / your neighbor's / your enemy's) × roles (husband, wife, spouse, son, daughter, child, eldest/youngest/middle/firstborn…), pets and livestock with modifiers, singular items (a million dollars, the Mona Lisa, the last white rhino…). Each produces `{ id, label, prompt, icon, tags }`. Custom objects from `data/objects.jsonl` merge in.
- [ ] Object creator dialog: icon picker, id, prompt ≤250. Saved via `/api/objects`.
- [ ] Roster bar (1–5 characters, per-character run count).
- [ ] Track board: two tracks, drag objects from a searchable palette onto tracks (gesture-handler + tap fallback), remove, randomize (5 each).
- [ ] Prompt variant selector (thought experiment / trolley company employee / bystander); Prompt View sheet shows the composed puzzle prompt (without character).
- [ ] Run: `/api/runs` with trolley config; progress bar; trolley animation that plays each decision as it arrives (heads toward chosen track).
- [ ] Histogram per character (Track 1 vs Track 2); Jev weights recorded per decision and shown as mean weight.

## Done
_(fill in on completion)_
