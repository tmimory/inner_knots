# Phase 15 — The coin pays money, and two framings

Three fixes to the Coin of St. Petersburg, requested 2026-09-23 after phase 14:

1. **An escalating payoff.** A face's payoff can be money: a numeric amount with
   a "double each flip" checkbox, toggled against the free-text kind. The
   default is the paradox itself: heads wins $2, doubling each flip; tails
   forfeits the pot and ends the game.
2. **Two framings.** A thought experiment, and the encounter as it is now.
3. **Order.** The coin sits between the prisoner's dilemma and the adventure in
   the menu, the ledger's filter, and the docs.

Three owners run in parallel with disjoint file ownership against the contract
below, which is already landed. One commit once the tree passes `typecheck`,
`lint` and `test`; the critics run on the stable tree.

## The contract (landed)

`lib/domain/run.ts`

- `PUZZLE_IDS = ["trolley", "prisoners-dilemma", "st-petersburg", "adventure"]`
  (the ledger's filter menu derives from this order).
- `RUN_LIMITS.maxAmount = 1_000_000`.
- `ST_PETERSBURG_VARIANTS = ["thought-experiment", "encounter"]`.
- `CoinPayoff` is a discriminated union on `kind`:
  `{ kind: "text", text }` (prose, 1..facePayoff), `{ kind: "amount", amount: 0..maxAmount, doubles: boolean }`,
  `{ kind: "forfeit" }`. `coinPayoffSchema` preprocesses a bare string into
  `text`, so phase-14 runs still parse. `COIN_PAYOFF_KINDS` lists the three.
- `CoinFaceRule = { payoff: CoinPayoff, endsGame }` (unchanged shape otherwise).
- `StPetersburgConfig` gains `variant` (defaulting to `"encounter"` on read, so
  older runs parse).

`lib/domain/summary.ts`

- A flip gains `won?: number`: what the toss did to the pot when the face is
  priced (the amount with doubling applied, or minus the whole pot for a
  forfeit); absent for a walk, a failure, or a prose face.
- A game gains `winnings: number` (default 0): the pot as it stands, Σ `won`.
- A tally gains `meanWinnings?: number`: mean final pot over finished games,
  absent while none has finished or when neither face is priced.

## The arithmetic (Owner A, shared)

`lib/puzzles/st-petersburg/payoff.ts` (pure, tested):

- `isPriced(faces)` — true when either face is `amount` or `forfeit`.
- `payoutFor(payoff, flip, pot)` — `text` → `undefined`; `amount` →
  `amount × (doubles ? 2^(flip − 1) : 1)`; `forfeit` → `−pot`. `flip` is the
  1-based turn number, so a doubling $2 pays $2, $4, $8… on flips 1, 2, 3.

`lib/format.ts` gains `formatMoney(amount)`: `$2`, `$2.50`, `$1,024` (en-US
grouping, at most two decimals, no trailing `.00`). Owners B and C import it.

## Owner A — prompts, runner, summary, preview

**Owns:** `prompts/st-petersburg/**`, `lib/puzzles/st-petersburg/{payoff,prompt,runner,summary}.ts`
(+ tests), `lib/format.ts` (+ its test), `app/api/prompts/st-petersburg+api.ts`,
`lib/client/prompts.ts`. Read-only elsewhere.

**Prompts.** `situation.md` splits into a framing and the terms:

- `variant-thought-experiment.md` — a philosophical thought experiment, stated
  as one (no coin exists, nobody is paying, answer as yourself), then the
  setup: a coin, and a voice that names the terms.
- `variant-encounter.md` — the walking-along opening as it is now (the coin on
  the ground, warmer than the ground, the voice from nowhere in particular).
- `terms.md` — the per-face lines, the flip limit, and the walking-away
  paragraph, as now. `heads` and `tails` are **rendered clauses** handed in by
  the builder, not raw payoff text.
- `payoff-text.md` (`{{text}}`), `payoff-amount.md` (`amount`, `doubles`,
  `second`, `third` — "you win {{amount}}" and, when doubling, "…doubled for
  every flip after the first: {{amount}} on the first, {{second}} on the
  second, {{third}} on the third, and so on"), `payoff-forfeit.md` ("you lose
  everything you have won so far"). Money arrives already formatted.
- `history.md` — each toss lists a rendered `outcome` clause
  (`toss-won.md` "you won {{amount}}", `toss-forfeit.md` "the {{amount}} you
  had won was taken back", or the prose text) and, when the coin is priced,
  closes with the pot: "Your winnings stand at {{pot}}." Variables: `flip`,
  `maxFlips`, `tosses: { flip, face, outcome }[]`, `pot` (formatted, or `""`
  when unpriced so the `{{#if}}` drops the line).
- `question.md` unchanged.

**`prompt.ts`.** `buildStPetersburgPrompt({ config, decisionStyle, flip, history })`
where `config` is `Pick<StPetersburgConfig, "variant" | "faces" | "maxFlips">`
and `TossRecord = { flip, face, won? }`; the builder computes the pot from the
history's `won`s.

**`runner.ts`.** Tracks `pot` per game: `won = payoutFor(faces[face].payoff, flip, pot)`
after a toss, `pot += won ?? 0`; event data gains `won?` and `priced` (from
`isPriced`). Everything else as phase 14.

**`summary.ts`.** `reduce` writes `won` onto the flip, keeps `winnings` as the
running sum, and sets `meanWinnings` on the tally over finished games when the
run is priced (`event.data.priced`), else leaves it absent.

**Preview.** The route's body schema and `StPetersburgPromptRequest` gain
`variant`. `previewStPetersburgPrompt({ variant, faces, maxFlips, decisionStyle? })`.

## Owner B — the screen

**Owns:** `app/puzzles/st-petersburg.tsx`, `components/puzzles/st-petersburg/**`,
`lib/puzzles/st-petersburg/ui-helpers.ts` (+ test), `components/shell/nav-items.ts`.
Read-only elsewhere. Imports `formatMoney` from `@/lib/format` and the new
`previewStPetersburgPrompt` shape from Owner A (write against the signatures
above).

- **ui-helpers.** `StPetersburgSetup` gains `variant` (default
  `"thought-experiment"`, as the other puzzles default). `DEFAULT_FACES`: heads
  `{ kind: "amount", amount: 2, doubles: true }`, not ending; tails
  `{ kind: "forfeit" }`, ending. `parseSetup` upgrades a stored string payoff to
  `text`, accepts only the three kinds, clamps `amount` to `0..maxAmount`
  (non-finite → default), reads `doubles` as a flag. `blockedReason` still
  refuses a blank `text` payoff. `puzzleConfig` includes `variant`.
- **Framing.** A `Subsection` "Framing" at the top of "The coin" with a
  `VariantSelect` over the two framings (UI copy only; the prose is in the
  fragments): thought experiment — "A gamble stated as one. There is no coin
  and nobody is paying."; encounter — "You are walking somewhere ordinary and
  there is a coin on the ground.". "View prompt" stays on the section heading.
- **FacePanel.** Under the face's title, a `Segmented` (label "What heads
  pays") over "In words" / "An amount" / "Forfeit". Then, by kind: `text` → the
  `Textarea` as now; `amount` → an `Input` with a "$" prefix, `keyboardType`
  decimal, keeping what was typed the way `CountStepper` does and committing
  the parsed number clamped to `0..maxAmount`, and beneath it a checkbox row
  "Double each flip"; `forfeit` → one muted sentence "Everything won so far is
  taken back.". Then the "Ends the game" checkbox row as now. The checkbox row
  is used twice, so it becomes one small component in the folder (same
  pressable-row implementation as today).
- **Results.** The endings table gains a "μ won" column (`formatMoney`) when
  any tally carries `meanWinnings`; the flip grid's row ending shows the final
  pot after the ending word when the game has any priced flip ("coin · $6").
- **Menu.** The leaf moves between the prisoner's dilemma and the adventure.

## Owner C — ledger and docs

**Owns:** `components/logs/**`, `app/logs/[id].tsx`, `docs/architecture.md`,
`README.md`. Read-only elsewhere. Imports `formatMoney` from `@/lib/format`.

- `labels.ts`: `VARIANT_LABELS.encounter = "Encounter"`.
- `app/logs/[id].tsx` `configVariant`: the coin has a framing now; return its
  label like the trolley and the dilemma.
- `config-view.tsx`: each face's payoff in one line — the text; "$2, doubling
  each flip" / "$2 each flip"; "forfeits the pot" — over "ends the game" /
  "play on".
- `summary-view.tsx`: the coin's table gains "μ won" (`formatMoney` or
  `UNKNOWN`) after "μ flips"; the existing empty-column drop handles an unpriced
  run.
- `docs/architecture.md`: the coin listed before the adventure wherever the
  puzzles are enumerated (directory layout, prompts directory, the Run union,
  the puzzle-prompts list, the `progress.total` sentence); the config sentence
  describes the three payoff kinds and the two framings; the prompts listing
  names the new fragments.
- `README.md`: the coin's bullet moves before the adventure's and says a face
  pays prose, money (optionally doubling each flip) or the forfeit of the pot,
  under either framing.

## Done

Landed 2026-09-23 in one commit, the same way as phase 14: contract first, three
owners in parallel on disjoint files, typecheck, lint and the suite (460 tests)
clean on the merged tree, the four critics on the stable tree.

- [x] **Owner A.** `payoff.ts` (`isPriced`, `payoutFor`), `formatMoney`, the
      fragments split into two framings plus `terms.md` and the per-kind payoff
      and toss clauses, the pot threaded through prompt, runner and summary, the
      preview taking `variant`. Deviations: `formatMoney` keeps two decimals
      whenever there are any ("$1,024.50"); a priced coin's first turn reads
      "Your winnings stand at $0.", which tells the model there is a pot.
- [x] **Owner B.** Framing subsection; the face panel's segmented kind switch,
      the stake field with "Double each flip", the forfeit sentence; `CheckRow`
      extracted; "μ won" in the endings table and the final pot after the
      ending word in the grid; the menu order. Deviations: the stake rounds to
      the cent; each face remembers the last prose and the last stake so
      switching kinds and back loses nothing; the money columns are `w-seat`
      wide because "$1,048,576" does not fit a count column.
- [x] **Owner C.** "Encounter" label, the framing shown for coin runs, payoff
      sentences in the config view, "μ won" in the ledger's table, the coin
      before the adventure everywhere the docs and README list the puzzles.

Found in the browser after the implementers finished: the flip grid drew games
in the order their first turn came back, so a character's games read 3, 1, 2, 4.
The grid now takes the roster's order from the results and sorts by game. And
the footer said "9 flips recorded" under bars that counted 7, because it was
counting turns; it says turns now.

Verified against the running app with the mock local model: the default coin's
prompt under both framings; a 7-game run in which heads paid $2 then $4, a
forfeit took back $6, and a walk after two heads kept $6, with `meanWinnings`
right in the summary; the screen, the stake field (typing "2.5" keeps the text
and stores 2.5), the ledger page.

**Critics.** Secrets and design tokens: nothing. Duplication: one finding, taken:
the keep-what-was-typed number field is now `useTypedNumber` in `lib/client/`,
used by the count stepper and the stake. Visual critic 7.5/10 (from 6.5).
Taken: rows sorted by game, the footer's wording. Left, as in phase 14, because
they are the shared components every puzzle uses: the finished progress bar, the
status pill's colour, section heading sizes, roster stepper captions, the grid's
cell size, and the "μ" headers, which match the ledger's other tables.
