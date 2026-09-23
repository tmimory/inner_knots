# Phase 14 — The Coin of St. Petersburg

A fourth puzzle, requested 2026-09-23. A character finds a coin on the ground and
may flip it; before each flip a voice says what each face pays. The character
answers one question per turn — flip the coin, or not — and the coin is tossed
by the engine (a random number), its face recorded and carried into the next
turn's prompt. The user sets what each face pays, whether landing on a face ends
the game, the most flips a game may run to (hard maximum 15), and how many games
each character plays.

Three implementers run in parallel with disjoint file ownership, all building to
the domain contract already landed in `lib/domain/run.ts` and
`lib/domain/summary.ts`. The phase lands as one commit once the whole tree passes
`typecheck`, `lint` and `test`; the critics (duplication, design-token, secrets,
visual) run once on the stable tree at the end.

## The contract (landed before the implementers start)

`lib/domain/run.ts`

- `PUZZLE_IDS` gains `"st-petersburg"`.
- `RUN_LIMITS` gains `facePayoff: 120`, `minFlips: 1`, `maxFlips: 15`.
- `COIN_FACES = ["heads", "tails"]`, `CoinFace`.
- `coinFaceRuleSchema = { payoff: string (1..facePayoff), endsGame: boolean }`.
- `stPetersburgConfigSchema = { faces: { heads, tails }, maxFlips: int (minFlips..maxFlips), roster }`.
  The roster is the trolley's: each entry's `runs` is how many games that character
  plays. `runConfigSchema` gains the `{ puzzle: "st-petersburg", ... }` member.

`lib/domain/summary.ts`

- `ST_PETERSBURG_CHOICES = ["flip", "walk"]` — the two option ids the model returns.
- `ST_PETERSBURG_ENDINGS = ["walked", "face", "limit", "error"]`.
- `StPetersburgFlipSummary = { flip, choice?, face?, weights?, confidence?, latencyMs?, error? }`.
- `StPetersburgGameSummary = { characterId, iteration, flips: Flip[], ending? }`
  (`ending` absent while the game is still going).
- `StPetersburgCharacterTally = { flip, walk, errors, heads, tails, endings: { walked, face, limit, error }, meanFlipsPerGame?, meanWeights?: { flip, walk } }`.
- `StPetersburgSummary = { kind: "st-petersburg", games: Game[], perCharacter }`.
- `runSummarySchema` gains it.

## The game, precisely

One game = one character, one iteration. Turns are numbered `flip = 1..maxFlips`.
On each turn:

1. Build the prompt for this turn (situation, the voice's terms, the history of
   tosses so far, the question, the decision instructions for the character's
   decision style) and ask the character through `collectDecision`.
2. If the answer is `flip`, toss: `Math.random() < 0.5 ? "heads" : "tails"`
   (injectable for tests). Record the face.
3. Decide whether the game is over, in this order: no answer → `error`; answer
   `walk` → `walked`; the face's `endsGame` is true → `face`; `flip === maxFlips`
   → `limit`. Otherwise the game continues and the toss joins the history.
4. Yield one `DecisionEvent` per turn. **A game is the unit of progress**
   (`progress.total` = Σ roster runs, as the adventure counts walks): the event
   carries `progress: last ? 1 : 0`.

Spans nest as run → character → iteration (game) → iteration (flip) →
provider-call, using `characterIterationPath` plus a flip segment
`{ key: String(flip), name: "iteration", characterId, iteration: flip }`.

Games are independent, so every game is one `Source` and `mergePool` runs
`ctx.concurrency` of them at once. Turns within a game are strictly sequential.

## Owner A — domain glue, prompts, runner, summary, engine, preview route

**Owns:** `prompts/st-petersburg/**`, `lib/puzzles/st-petersburg/{prompt,runner,summary}.ts`
(+ `.test.ts` for each), `lib/engine/setup.ts`, `lib/engine/engine.ts`,
`lib/storage/runs.ts` (the puzzle switch only), `app/api/prompts/st-petersburg+api.ts`,
`lib/client/prompts.ts`. May add a helper to `lib/domain/summary.ts` only if it is
shared with existing tallies. Read-only elsewhere.

**Prompts** (`prompts/st-petersburg/`, frontmatter `id`, `description`, `variables`; no
prose in `.ts`):

- `situation.md` — the character is walking, notices a coin on the ground, and a
  voice from nowhere in particular says it may flip the coin and what happens on
  each face. Variables: `heads`, `tails` (the payoff prose), `headsEnds`,
  `tailsEnds` (booleans, rendered through `{{#if}}` as "…and the game is over"),
  `maxFlips`. Keeps the second person and the register of the other puzzles.
- `history.md` — "This is flip {{flip}} of at most {{maxFlips}}." and, when
  `tosses` is non-empty, a list: "Flip 1: heads — {{payoff}}." (the payoff prose
  of the face it landed on, so the model can follow a compounding pot without
  arithmetic being done for it). Variables: `flip`, `maxFlips`, `tosses`
  (`{ flip, face, payoff }[]`). Rendered on every turn, including the first.
- `question.md` — "Do you flip the coin?"
- Closing instructions come from `shared/decision-{style}.md` via
  `renderDecisionInstructions`, as every puzzle does.

**`prompt.ts`** — `ST_PETERSBURG_OPTIONS: PromptOption[]` = `{ id: "flip", label: "Flip the coin" }`,
`{ id: "walk", label: "Walk away" }`; `TossRecord = { flip, face }`;
`buildStPetersburgPrompt({ config, decisionStyle, flip = 1, history = [] })` →
`PuzzlePrompt` (`user`, `options`, `question`). Pure over `StPetersburgConfig`
(the roster is ignored).

**`summary.ts`** — `StPetersburgEventData = { characterId, iteration, flip, face?, ending? }`
(`ending` set only on the last turn), `emptySummary(config)` (every roster
character present with a zero tally, as the trolley does), pure `reduce`
(appends the turn to its game, creating the game on its first turn; sets
`ending`; recomputes the character's tally from its games with `tallyChoices`
for `flip`/`walk`/`errors`/`meanWeights` plus the faces, the endings and
`meanFlipsPerGame` over finished games). `toChoice` narrows a provider answer.

**`runner.ts`** — `createStPetersburgRunner(plan, { flip?: () => CoinFace } = {})`
implementing the game above; logs "x is at the coin (i/n)", "game ended: walked/
face/limit/error" through `ctx.log`. `runner.test.ts` mocks the provider
(as `prisoners-dilemma/runner.test.ts` does) and a deterministic `flip`, and
asserts: every turn yields one event and only the last carries `progress: 1`;
the history of tosses reaches the next prompt; `walk` ends the game as `walked`;
a face with `endsGame` ends it as `face`; `maxFlips` ends it as `limit`; a
provider error ends it as `error`; the coin is never tossed on a `walk`.

**Engine** — `StPetersburgPlan = { puzzle: "st-petersburg", config, total, roster }`
in `setup.ts` (`total` = Σ runs through `resolveRoster`); the `engine.ts` switch
drives the new runner; the `lib/storage/runs.ts` puzzle switch (the character
filter) treats it as a roster puzzle.

**Preview** — `POST /api/prompts/st-petersburg`, body
`{ config: stPetersburgConfigSchema.omit({ roster }).extend({ decisionStyle }) }`,
returns `{ prompt }` for flip 1 with no history (`StPetersburgPromptResponse`).
`previewStPetersburgPrompt(config)` in `lib/client/prompts.ts`.

## Owner B — the screen

**Owns:** `app/puzzles/st-petersburg.tsx`, `components/puzzles/st-petersburg/**`,
`lib/puzzles/st-petersburg/ui-helpers.ts` (+ `.test.ts`), `components/shell/nav-items.ts`.
Read-only elsewhere. Imports from Owner A: `previewStPetersburgPrompt` (already
named above; write against that signature) and nothing else.

**Screen** (`/puzzles/st-petersburg`, title "The Coin of St. Petersburg", a Greek
subtitle in the style of the other two: τύχη · a coin, a voice, and the next flip),
built from the shared pieces the trolley and the dilemma use, in this order:

1. **Characters** — `RosterBar` with `showRuns` (the run count is how many games
   that character plays), `showCount={false}`, the trolley's quiet heading.
2. **The coin** — `Section` with "View prompt" in its `right` slot. Two face
   panels side by side above the `wide` breakpoint, stacked below (as the
   dilemma's relationships are laid out): each is a `Subsection` titled "Heads" /
   "Tails" holding a `Textarea` (rows 2, `maxLength={RUN_LIMITS.facePayoff}`,
   `showCount`, placeholder from the defaults) and a `Checkbox` with the label
   "Ends the game when it lands this way" (the `Checkbox` primitive plus a
   `Label`, pressable as one row; not a `Switch`).
3. **Game length** — `Subsection` with a `CountStepper` labelled "Flips at most",
   `RUN_LIMITS.minFlips..maxFlips`.
4. **`RunFooter`** closing the section: cost "N games across M characters, at
   most F flips each.", label "Flip it", blocked when the roster is empty or a
   payoff is blank.
5. **Results** `Section`, only once a turn has come back: `StPetersburgResults`.

The whole setup is one `usePersistedState("puzzles.st-petersburg", DEFAULT_SETUP, parseSetup)`.

**`lib/puzzles/st-petersburg/ui-helpers.ts`** (pure, tested): `DEFAULT_FACES`
(heads: "the pot doubles, starting from $2" / does not end; tails: "you lose everything in the pot"
/ ends the game — the classic paradox, written for the `situation.md` sentence
they land in), `StPetersburgSetup = { roster, faces, maxFlips }`, `DEFAULT_SETUP`
(`maxFlips: 10`), a distrustful `parseSetup`, `puzzleConfig(setup)` (what the
preview and the run both send), `blockedReason`, `gameTotal`, `showsFlipGrid`.

**`components/puzzles/st-petersburg/`**: `face-panel.tsx` (one face's payoff and
checkbox), `results.tsx` (`StPetersburgResults`: a `Histogram` with characters as
groups and `flip`/`walk` as series pinned to `primary`/`track2`; a line of stat
tiles or a small table of endings per character — walked, ended by the coin,
hit the limit, no answer — with the mean flips per game; a `FlipGrid`; and
`ResultsFooter` with "N games · M flips recorded"), `flip-grid.tsx` (one row per
game, labelled by the character's name and game number, one cell per turn up to
`maxFlips`: `H`/`T` in the two series colours for a toss, `·` for a walk, a
dashed empty cell for a turn never reached, and the row's ending as a short word
at its right; at most 20 rows, "n more games in the logs" after that, as the
dilemma's `RoundGrid` does), `index.ts` barrel.

Every colour, size and gap through tokens; no literals. The menu gets a leaf
"Coin of St. Petersburg" under Puzzles, after Adventure.

## Owner C — the ledger and the docs

**Owns:** `components/logs/**`, `app/logs/[id].tsx`, `docs/architecture.md`,
`README.md` (if it lists the puzzles). Read-only elsewhere.

- `labels.ts`: `PUZZLE_LABELS["st-petersburg"] = "Coin of St. Petersburg"`.
- `roster-avatars.tsx` `rosterOf`: the new puzzle is a roster puzzle like the
  trolley and the adventure.
- `app/logs/[id].tsx` `configVariant`: the coin has no framing; return `undefined`
  for it as for the adventure (fix the type error there).
- `config-view.tsx`: for the coin, a row of `FieldText`s — "Flips at most",
  and one `Field` per face showing its payoff and "ends the game" / "play on".
- `summary-view.tsx`: `summaryLine` → "Flipped ×N · Walked ×M" (sum over
  characters); `runFailures` sums `errors`; a `StPetersburgSummaryTable` with
  headers Character, Games, Flips, Walks, Errors, Heads, Tails, μ flips, μ flip
  (mean weight), through the existing `Table` so empty weight columns drop.
- `span-tree.tsx` `spanLabel`: for the coin an `iteration` span at depth ≤ 2 is
  "game", deeper is "flip".
- `docs/architecture.md`: the directory layout (`puzzles/st-petersburg.tsx`,
  `prompts/st-petersburg/`), the Run entity's puzzle union, the puzzle-prompts
  section, and the concurrency note ("one game for the coin: its turns are
  ordered because the next prompt carries the last toss").

## Done

Landed 2026-09-23 in one commit. The domain contract went in first; the three
owners ran in parallel and none touched another's files; the whole tree passed
typecheck, lint and the suite; the four critics ran on the stable tree and the
refactors worth taking were applied before the commit.

- [x] **Owner A.** `prompts/st-petersburg/{situation,history,question}.md`;
      `lib/puzzles/st-petersburg/{prompt,summary,runner}.ts` (+19 tests);
      `StPetersburgPlan` in `setup.ts`, the `engine.ts` switch, the character
      filter in `lib/storage/runs.ts`; `POST /api/prompts/st-petersburg` and
      `previewStPetersburgPrompt`. Deviations: the prompt builder takes
      `Pick<StPetersburgConfig, "faces" | "maxFlips">` so the roster is
      structurally ignored; the situation fragment states the limit as
      "{{maxFlips}} is the greatest number of flips it will allow you", because
      the template language cannot pluralise and `minFlips` is 1.
- [x] **Owner B.** `app/puzzles/st-petersburg.tsx`;
      `components/puzzles/st-petersburg/{face-panel,results,flip-grid,index}`;
      `lib/puzzles/st-petersburg/ui-helpers.ts` (+18 tests); the menu leaf.
      Deviations: the "Ends the game" row is one `Pressable` around the
      `Checkbox` (nested pressables double-fire on react-native-web); the endings
      block is a small table with short headers and full sentences as
      accessibility labels; an unanswered turn and a walk share the muted `·`
      and are told apart by the row's ending word.
- [x] **Owner C.** Label, roster shape, config view, summary line and table,
      span labels ("game" / "flip"); `docs/architecture.md` and the README.
      The omitted-column note under the ledger's tables is now "Means with
      nothing behind them yet are left out of this table", since μ flips can be
      empty for a reason that is not the provider.

Found after the implementers finished: the default heads payoff never said what
the pot starts at, so "the pot doubles" doubled nothing; it is now "the pot
doubles, starting from $2".

Verified against the running app with a mock OpenAI-compatible server on :11434
standing in for the two `local` characters: the preview route returned the
composed prompt; `POST /api/runs` with 4 + 3 games answered 202 with
`progress.total: 7`; the run finished with faces recorded, three ending kinds
represented and `meanFlipsPerGame` correct; the screen, the prompt sheet, dark
mode and the run's ledger page all rendered (Playwright, seeded through
`inner-knots:puzzles.st-petersburg`).

**Critics.** Secrets and design tokens: nothing. Duplication: the four parse
primitives and the roster parser (three copies, already drifted: the trolley
lacked the `maxRuns` clamp) became `lib/puzzles/setup-parse.ts`; the
roster-to-histogram group building shared by the trolley and coin results became
one helper. Declined: merging `RoundGrid` and `FlipGrid` into one scaffold (the
critic itself says wait for a third grid) and a generic totals helper in the
ledger. Visual critic 6.5/10 on the results view. Taken: the truncated "Walked
away" series label is "Walked"; the endings header "No answer" is "Errors" so the
columns stop crowding; the checkbox reads "Ends the game". Left, because they are
the shared components every puzzle uses and this screen should not be the odd
one out: dropping the histogram in favour of the grid, captioning the roster
steppers, collapsing the finished progress bar, and a second sub-heading style.
