# Phase 6 — Prisoner's dilemma

## Checklist
- [x] Roster: exactly two characters, Player A and Player B.
- [x] Relationship phrases (≤250 each, disabled by default).
- [x] Prompt variants: thought experiment / interrogation room.
- [x] Crime description: locked default (jewelry heist, $5M, nobody hurt), unlock to edit, ≤1000.
- [x] Payoffs: symmetric (4 fields) or asymmetric (4 a/b pairs) with awareness toggle; injected into prose via prompt fragment.
- [x] Single vs iterated (≤10); history fragment carries prior actions into each round.
- [x] Prompt View side by side; progress bar; side-by-side histograms; Jev weights recorded.

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

Shipped 2026-09-21. The screen is built on the five shared components phase 5 left behind; nothing about the dilemma was forked out of them.

### The screen

`app/puzzles/prisoners-dilemma.tsx` composes eight `Section`s, in the order a game is set up: the players, the relationships, the framing, the charge, the payoffs, the game length, the run, and what they chose. The whole setup is one `usePersistedState("puzzles.prisoners-dilemma", …)` value, so a reload keeps the matrix you spent five minutes writing.

| Section | What it holds |
| --- | --- |
| The players | `RosterBar` with `fixedSlots={2}`, `labels={["Player A","Player B"]}`, `showRuns={false}` and `allowDuplicates` — the games count lives under Game length, not per seat. |
| Relationships | A `Switch` in the heading's `right` slot; on, two `Textarea`s (≤250, counter) for what each player is told about the other. |
| The framing | `VariantSelect` over thought experiment / interrogation room, plus the Prompt View button. |
| The charge | A `Textarea` (≤1000) locked to `DEFAULT_CRIME`, a lock switch in the heading, and a "Reset to default" button that appears once the text differs. |
| The payoffs | `PayoffMatrix`. |
| Game length | `VariantSelect` over Single / Iterated, a `Slider` for 2–10 rounds while iterated, and a `CountStepper` for 1–100 games. |
| The run | `RunProgress` + "Put them in the rooms". The description is the decision count, spelled out as `games × rounds × 2 players`. |
| What they chose | `PrisonersDilemmaResults`. |

**`components/puzzles/prisoners-dilemma/`**

| File | What it is |
| --- | --- |
| `payoff-matrix.tsx` | The bargain as a two-by-two grid: rows are Player A's move, columns are Player B's. Symmetric, each cell is one free-text field holding what the player *on that row* gets — which is exactly four fields, and reads as a matrix rather than a list. Asymmetric, each cell holds an A value and a B value, and the "Players know the payoffs are asymmetric" switch appears under it. |
| `results.tsx` | The side-by-side histogram, the outcomes strip as five stat tiles, the round grid for an iterated run, and the link into the logs. |
| `round-grid.tsx` | One row per game, one cell per round, two glyph badges per cell (`T`/`S` in the track1/track2 colors, `·` for an answer that never came). A cell with any testify in it is outlined in the destructive tone and a mutual defection is outlined thickly, so a run of plain cells is a run of trust and the first hard outline is the round it broke. |

**`lib/puzzles/prisoners-dilemma/ui-helpers.ts`** — pure, React-free, 23 tests. The payoff defaults, the stored-setup shape and its distrustful `parseSetup`, `payoffsOf` / `iterationsOf` / `puzzleConfig` / `playersOf` (what the Prompt View and the run both send), `blockedReason`, `decisionTotal`, and `outcomeTiles`.

### The payoff defaults are written for the fragment they land in

`prompts/prisoners-dilemma/payoffs-symmetric.md` says "you each get {{bothTestify}}", so the default is `5 years` and not `5 years each`; `onlyTestifier` is `to walk free`, because the sentence around it is "the one who testified gets …". The defaults therefore live beside the screen that labels the fields rather than in the domain, and the labels on the fields are the ones the fragments use.

### Additions to the shared components

All four are additive, with defaults that leave the trolley exactly as it was.

1. **`Histogram` takes `sideBySide`.** Set, and on a viewport at least `layout.wideBreakpoint` wide, the group clusters sit as columns instead of stacking. Every bar still scales against the longest bar in the *whole* chart, which is the property that makes the two columns comparable rather than each filling its own.
2. **`PromptPanel` takes `accessory`.** A node drawn beside the panel's label — here, each player's avatar. The dilemma's panels are labelled `Player A · <name>`, which also keeps the two labels distinct when one character is playing itself.
3. **`RosterBar` takes `allowDuplicates`.** The engine nests spans as run → character → game → round precisely so a character playing itself stays separable, and `POST /api/runs` accepts `playerA === playerB`; without this the picker would not let you set it up.
4. **`CountStepper` (`components/puzzles/count-stepper.tsx`)** is `RosterBar`'s private `RunsStepper`, lifted out with `min`/`max`/`step`/`label` props. `RosterBar` now uses it for the per-character run count and the dilemma uses it for the games count, so the "what was typed, tagged with the count it produced" behaviour is written once.

### Verification

`npm run typecheck`, `npm run lint` and `npm test` clean (**298 tests across 33 files**, including the 23 new in `lib/puzzles/prisoners-dilemma/ui-helpers.test.ts`).

Against a live server with a scratch `DATA_DIR`: `/puzzles/prisoners-dilemma` rendered 200 (118 KB of SSR HTML containing the locked charge and both matrix rows). `POST /api/prompts/prisoners-dilemma` with the screen's default config returned 200 and two identical prompts reading "If you both testify against each other, you each get 5 years. … the one who testified gets to walk free and the one who stayed silent gets 10 years."; the interrogation / asymmetric-unaware / iterated config returned B's side correctly re-keyed — "If you testify and your partner stays silent, you get to walk free." from `onlyBTestifies.b` — under "This is round 1 of 4."

Two `local` characters were created and both config shapes the screen builds were started through `POST /api/runs`: the asymmetric iterated one (2 games × 3 rounds) answered 202 with `progress.total: 12`, matching `decisionTotal`, and the symmetric single one with the same character on both sides answered 202 as well. The first finished with every decision recorded as `Connection error.` (no Ollama on the machine), `perPlayer.a.errors: 2`, `outcomes.incomplete: 2` and one round per game rather than three — a round that produces no answers ends its game — which is exactly the partial shape the round grid draws gaps for. The server was stopped and the scratch data removed.

### Deviations from the plan

1. **Asymmetric payoffs are four a/b pairs, not six fields.** The checklist said six; `asymmetricPayoffsSchema` in `lib/domain/run.ts` is four `{ a, b }` cells, which is eight inputs, and the domain is what the engine validates against.
2. **The symmetric matrix shows what the row player gets.** A symmetric game has four outcomes but a two-by-two grid has four cells whose off-diagonals each have two sides. Reading every cell as the row player's outcome makes the four fields land in the four cells exactly, with no cell holding two of them and none repeated.
3. **A single game is `iterations: 1`,** not a separate flag: the domain has one number and the prompt builder already drops the history fragment below two, so Single/Iterated is a control over that number rather than another field in the config.
4. **The games count is one control for the pair, not per seat.** `PrisonersDilemmaConfig` has a single `runs`, since a game is played by both of them; `RosterBar` therefore runs with `showRuns={false}` and the stepper sits under Game length.
5. **The round grid draws at most 20 games** and says how many more are in the logs. A hundred games of ten rounds is a page of glyphs nobody reads.
6. **Both puzzle screens share `usePromptPreview`.** The four pieces of Prompt View state were the same on both screens; the hook landed in `lib/client/` during this phase and the dilemma uses it rather than repeating them.

