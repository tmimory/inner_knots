# Phase 11 — Six adjustments

Six complaints from using the app, requested 2026-09-22. Five implementers run in
parallel with disjoint file ownership; each item lands as its own commit once the
whole tree passes `typecheck`, `lint` and `test`. The three critics (duplication,
design-token, secrets) run once on the stable tree at the end.

## 1. Decision instructions per answer style

**Symptom.** Every prompt closes with "Answer only with the structured response…",
which is wrong for a tool call and meaningless for Jev, which takes no prompt at all:
it is handed state plus one `choice` question whose criteria are the options.

**Design.**
- A third value joins structured and tool: `judgment`, the Jev/TypeSafe style. The
  triple is `DecisionStyle = "structured" | "tool" | "judgment"`, derived by
  `decisionStyleFor(provider, outputMode)` (typesafe → `judgment`; otherwise the
  character's `outputMode`). `OutputMode` on the character stays as it is.
- Three fragments, not one with conditionals, and three for all puzzles rather than
  three per puzzle: `prompts/shared/decision-structured.md`, `decision-tool.md`,
  `decision-judgment.md`, each taking `options` only. `renderDecisionInstructions`
  picks `shared/decision-<style>`.
- The judgment fragment is written against the TypeSafe docs (choice primitive,
  state): it lists the options as what the decision may resolve to and keeps the
  "abstaining is not one of them" clause, but says nothing about a response format.
- Prompt builders take `decisionStyle`; runners derive it per character; the engine
  passes provider-appropriate text. Preview routes accept `decisionStyle` (default
  structured). Prompt View switching is a follow-up (touches every screen).

**Owner A.** `prompts/shared/**`, `lib/prompts/compose.test.ts`, `lib/puzzles/types.ts`,
`lib/puzzles/{trolley,prisoners-dilemma,adventure}/prompt.ts` (+tests),
`lib/puzzles/*/runner.ts` (+tests), `lib/engine/**`, `lib/domain/enums.ts`,
`lib/api/schemas.ts`, `app/api/prompts/**`, `app/api/providers/**`,
`lib/client/prompts.ts`, `lib/providers/typesafe.ts` (only if needed),
`docs/architecture.md`.

## 2. Objects stand on the track

**Symptom.** Placed objects are chips in a band above each rail; nothing is on the
track. At narrow widths the chips crowd.

**Design.**
- A placed object is drawn across its rail: the glyph centred on the rail's centre
  line. Its name sits above the rail on track 1 and below the rail on track 2.
- When the board is narrow (per-slot width under a threshold in `geometry.ts`) the
  names are hidden. Pressing a glyph opens a small popover with the name and a
  Remove action; this works at every width so removal has one gesture.
- Drag-and-drop, tap-to-place, empty slots while arming, and the trolley animation
  keep working. The palette's dragged tile is unchanged.

**Owner B.** `components/puzzles/trolley/{track-board,geometry,object-chip,
draggable-object,use-drop-zones,trolley-animation,results,index}.*` and any new file
in that folder except `object-creator.tsx`; `app/puzzles/trolley.tsx`.

## 3. Prisoner's dilemma payoffs, legible

**Symptom.** "Player A" / "Player B" over the grid do not line up with anything, a
cell does not say what each player gets, and the asymmetric case is worse.

**Design.**
- Every cell names its scenario ("Both testify", "Only Socrates testifies", …) and
  shows one line per player: "Socrates: 0 years" / "Hobbes: 10 years". Symmetric
  mode edits the four stored fields and shows the mirrored values derived and
  read-only; asymmetric mode edits both lines.
- Row and column headers read "<name> testifies / stays silent". Player names come
  from `playerNames()` everywhere on the screen once seats are filled, including the
  relationship labels and the results.

**Owner C.** `components/puzzles/prisoners-dilemma/**`,
`lib/puzzles/prisoners-dilemma/ui-helpers.ts` (+test), `app/puzzles/prisoners-dilemma.tsx`.

## 4. Adventures as a vertical tree

**Design.**
- Positions are derived at render time from the graph (dagre `rankdir: "TB"`), not
  read from the stored `position`; the field stays in the schema untouched. Nodes are
  not draggable; the "Auto-layout" button goes (the canvas has fit view).
- Edges enter a card at the top and leave from the bottom edge in the order of the
  option rows; the ending square marker survives.

## 5. Card colours in dark mode

**Cause, verified 2026-09-22 with headless Chromium.** `ThemeProvider` reads
NativeWind's `useColorScheme()`, which reports light on web (no `dark` class), while
`global.css` goes dark through `prefers-color-scheme`. Everything styled through
`useTheme()` (cards, rails, handles, charts) stays parchment while class-styled text
turns cream: light card, light text.

**Fix.** On web the provider follows `prefers-color-scheme` (React Native's
`useColorScheme`/`Appearance`, which RNW backs with `matchMedia`), so tokens and
CSS agree. Verified by screenshot in both schemes.

**Owner D (4 and 5).** `lib/puzzles/adventure/{layout,edits}.ts` (+tests),
`components/flow/**`, `theme/provider.tsx`, `app/puzzles/adventure/**`.

## 6. Character counters

**Design.** Every field with a domain limit shows "X / Y" all the time, on `Input` as
well as `Textarea`. The focus/four-fifths reveal rule goes. Fields that had a limit
but no `maxLength` (character name, id) get one.

**Owner E.** `components/ui/**`, `components/characters/**`,
`components/puzzles/trolley/object-creator.tsx`, `components/puzzles/adventure/**`,
`components/puzzles/{count-stepper,roster-bar,section,subsection,variant-select,prompt-view,run-progress}.tsx`.

## 7. Prompt View shows each character's own ending

**Symptom.** The Prompt View always shows the structured ending, even with a
TypeSafe character seated, because the screens post no style and the preview routes
default to structured. Runs are unaffected: the runner derives the style per character.

**Design.**
- The preview is composed *as* a character. `usePromptPreview` takes the roster's
  characters as viewpoints; the Prompt View shows a selector ("Viewing as") when
  there is more than one and recomposes on change. With an empty roster the preview
  falls back to structured and says so.
- Trolley and adventure: one panel, selector over the roster.
- Prisoner's dilemma: two panels already, one per seat, each composed with its own
  seated character's style (the route takes a style per side); no selector.

**Owner F (foundation).** `components/puzzles/prompt-view.tsx`,
`lib/client/use-prompt-preview.ts`, `lib/client/prompts.ts`, `lib/api/schemas.ts`,
`app/api/prompts/prisoners-dilemma+api.ts`, `app/puzzles/prisoners-dilemma.tsx`.
**Owners G and H (after F).** `app/puzzles/trolley.tsx`; `app/puzzles/adventure/[id]/run.tsx`.

## Done

All six landed 2026-09-22; the whole tree passed typecheck, lint and 342 tests before
the per-item commits.

- [x] **1.** `prompts/shared/decision-{structured,tool,judgment}.md` replace
      `decision-instructions.md`. `DECISION_STYLES` / `decisionStyleFor()` in
      `lib/domain/enums.ts`; builders take `decisionStyle`; runners derive it per
      character; preview routes accept `decisionStyle` (default structured). The
      judgment fragment follows the TypeSafe choice/state docs: options as what the
      decision resolves to, no format wording. Follow-up: a style switch in the
      Prompt View so a Jev roster previews its own ending.
- [x] **2.** `track-object.tsx` (figure on the rail, name band, popover), geometry
      rewritten (rail y 96/228, board 298 high, `icon-lg` glyphs, `nameMinSlot`
      threshold via `showsNames()`), `ObjectChip` is palette-only. Tap-to-place and
      popover Remove were driven in the browser; real drag-and-drop was not (the
      gesture-handler pan does not respond to Playwright's synthetic mouse) and the
      zone wiring is unchanged. Known: glyph baselines vary per artwork; the wagon is
      smaller than the figures.
- [x] **3.** Payoff block: named row/column headers ("Socrates testifies"), a card per
      scenario with one line per player (avatar, name, value); symmetric mode edits
      A's four lines and mirrors B's read-only; asymmetric edits both. `PlayerFace`
      shared with `PendingAnswers`; relationship labels use the seated names.
- [x] **4.** `adventureLayout()` returns derived TB positions keyed by
      `adventureShape()`; `node.position` is ignored (schema untouched), nodes are
      not draggable, the Auto-layout button is gone, structural edits re-frame.
      Handles: target top-centre, one source per option along the bottom edge in row
      order, rows numbered when there is more than one. Known: dagre does not order
      by handle, so one crossing remains on adv-ledger.
- [x] **5.** `theme/provider.tsx` resolves the scheme from React Native Web's
      `useColorScheme` (matchMedia) on web; dark cards now measure rgb(37,32,25)
      with cream text, and the trolley rails take the night palette.
- [x] **6.** `Input` and `Textarea` show "X / Y" whenever `maxLength` is set
      (`showCount={false}` opts out; `components/ui/text-field.tsx` holds the shared
      counter and field classes; `splitLayoutClasses` keeps callers' flex/width
      classes working). The focus/four-fifths reveal rule is gone. Character id and
      trolley tags gained their limits. `vitest.config.mts` now collects
      `components/**/*.test.ts`.
- [x] **7.** `viewpointsOf()` / `seatedCharacters()` in `lib/client/viewpoints.ts`;
      `usePromptPreview` holds the selected viewpoint and recomposes on change;
      `PromptView` shows a "Viewing as" chip row (static line for one character,
      fallback line for none) and a meta line naming the provider and style. The
      trolley and adventure run screens pass the roster's characters; the dilemma
      route derives each seat's style from its character server-side and returns
      `decisionStyles`, shown as a meta line per panel. Verified in the browser for
      structured, tool and judgment endings on all three screens.
