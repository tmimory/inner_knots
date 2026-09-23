/**
 * Run summaries: the reducer output a run carries in `Run.summary`.
 *
 * The engine persists the summary after every decision, not only at the end, so
 * a screen polling `GET /api/runs/:id` can animate a run as it fills in. That
 * makes these schemas the contract between the engine's reducers
 * (`lib/puzzles/<puzzle>/summary.ts`) and every screen that renders a result,
 * which is why they live in the domain rather than beside a puzzle.
 *
 * A summary is always complete in shape and partial in content: the tallies of a
 * run that has made three of thirty decisions are the tallies of those three.
 */
import { z } from "zod";

import { COIN_FACES } from "./run";

/** Per-option probability mass, when the provider reports a distribution (Jev). */
const weightsSchema = z.record(z.string(), z.number());

// --- Trolley -----------------------------------------------------------------------

export const TROLLEY_CHOICES = ["track1", "track2"] as const;
export type TrolleyChoice = (typeof TROLLEY_CHOICES)[number];

/** One character's answer on one iteration. `choice` is absent when it failed. */
export const trolleyDecisionSummarySchema = z.object({
  characterId: z.string(),
  /** 1-based index within that character's run count. */
  iteration: z.number().int(),
  choice: z.enum(TROLLEY_CHOICES).optional(),
  weights: weightsSchema.optional(),
  confidence: z.number().optional(),
  latencyMs: z.number().optional(),
  error: z.string().optional(),
});
export type TrolleyDecisionSummary = z.infer<typeof trolleyDecisionSummarySchema>;

export const trolleyCharacterTallySchema = z.object({
  track1: z.number().int(),
  track2: z.number().int(),
  errors: z.number().int(),
  /** Mean of the reported weights, over the decisions that reported any. */
  meanWeights: z.object({ track1: z.number(), track2: z.number() }).optional(),
});
export type TrolleyCharacterTally = z.infer<typeof trolleyCharacterTallySchema>;

export const trolleySummarySchema = z.object({
  kind: z.literal("trolley"),
  /** Every decision, in the order it completed. */
  decisions: z.array(trolleyDecisionSummarySchema),
  perCharacter: z.record(z.string(), trolleyCharacterTallySchema),
});
export type TrolleySummary = z.infer<typeof trolleySummarySchema>;

// --- Prisoner's dilemma ------------------------------------------------------------

export const PRISONERS_DILEMMA_CHOICES = ["testify", "silent"] as const;
export type PrisonersDilemmaChoice = (typeof PRISONERS_DILEMMA_CHOICES)[number];

/** One player's answer in one round. Every field but the tallies may be absent. */
export const playerDecisionSummarySchema = z.object({
  choice: z.enum(PRISONERS_DILEMMA_CHOICES).optional(),
  weights: weightsSchema.optional(),
  confidence: z.number().optional(),
  latencyMs: z.number().optional(),
  error: z.string().optional(),
});
export type PlayerDecisionSummary = z.infer<typeof playerDecisionSummarySchema>;

export const prisonersDilemmaRoundSchema = z.object({
  /** 1-based round number within the game. */
  round: z.number().int(),
  a: playerDecisionSummarySchema,
  b: playerDecisionSummarySchema,
});
export type PrisonersDilemmaRound = z.infer<typeof prisonersDilemmaRoundSchema>;

export const prisonersDilemmaGameSchema = z.object({
  /** 1-based game number. A game is one full sequence of rounds. */
  game: z.number().int(),
  rounds: z.array(prisonersDilemmaRoundSchema),
});
export type PrisonersDilemmaGame = z.infer<typeof prisonersDilemmaGameSchema>;

export const playerTallySchema = z.object({
  testify: z.number().int(),
  silent: z.number().int(),
  errors: z.number().int(),
  meanWeights: z.object({ testify: z.number(), silent: z.number() }).optional(),
});
export type PlayerTally = z.infer<typeof playerTallySchema>;

/** How the rounds came out. `incomplete` counts rounds missing an answer. */
export const prisonersDilemmaOutcomesSchema = z.object({
  bothTestify: z.number().int(),
  bothSilent: z.number().int(),
  onlyATestifies: z.number().int(),
  onlyBTestifies: z.number().int(),
  incomplete: z.number().int(),
});
export type PrisonersDilemmaOutcomes = z.infer<typeof prisonersDilemmaOutcomesSchema>;

export const prisonersDilemmaSummarySchema = z.object({
  kind: z.literal("prisoners-dilemma"),
  games: z.array(prisonersDilemmaGameSchema),
  perPlayer: z.object({ a: playerTallySchema, b: playerTallySchema }),
  outcomes: prisonersDilemmaOutcomesSchema,
});
export type PrisonersDilemmaSummary = z.infer<typeof prisonersDilemmaSummarySchema>;

// --- Adventure ---------------------------------------------------------------------

/** One node visited on one walk through the graph. */
export const adventureStepSummarySchema = z.object({
  nodeId: z.string(),
  /** The option taken. Absent when the decision failed. */
  optionId: z.string().optional(),
  weights: weightsSchema.optional(),
  confidence: z.number().optional(),
  latencyMs: z.number().optional(),
  error: z.string().optional(),
});
export type AdventureStepSummary = z.infer<typeof adventureStepSummarySchema>;

export const adventurePathSummarySchema = z.object({
  characterId: z.string(),
  /** 1-based index within that character's run count. */
  iteration: z.number().int(),
  steps: z.array(adventureStepSummarySchema),
  /** True when the walk ended on an option with no next node. */
  terminal: z.boolean(),
});
export type AdventurePathSummary = z.infer<typeof adventurePathSummarySchema>;

export const adventureCharacterTallySchema = z.object({
  completed: z.number().int(),
  errors: z.number().int(),
});
export type AdventureCharacterTally = z.infer<typeof adventureCharacterTallySchema>;

export const adventureSummarySchema = z.object({
  kind: z.literal("adventure"),
  paths: z.array(adventurePathSummarySchema),
  /** How many times each node was visited. */
  nodeHits: z.record(z.string(), z.number()),
  /** How many times each option of each node was taken. */
  optionHits: z.record(z.string(), z.record(z.string(), z.number())),
  perCharacter: z.record(z.string(), adventureCharacterTallySchema),
});
export type AdventureSummary = z.infer<typeof adventureSummarySchema>;

// --- St. Petersburg ----------------------------------------------------------------

export const ST_PETERSBURG_CHOICES = ["flip", "walk"] as const;
export type StPetersburgChoice = (typeof ST_PETERSBURG_CHOICES)[number];

/**
 * Why a game stopped. `walked`: the character chose not to flip. `face`: the coin
 * landed on a face that ends the game. `limit`: it flipped the last allowed time.
 * `error`: a decision produced no answer. Absent while the game is still going.
 */
export const ST_PETERSBURG_ENDINGS = ["walked", "face", "limit", "error"] as const;
export type StPetersburgEnding = (typeof ST_PETERSBURG_ENDINGS)[number];

/** One turn of one game: the decision, and the face the coin showed if it was flipped. */
export const stPetersburgFlipSummarySchema = z.object({
  /** 1-based turn within the game. */
  flip: z.number().int(),
  choice: z.enum(ST_PETERSBURG_CHOICES).optional(),
  /** Set only when the character chose to flip and the coin was tossed. */
  face: z.enum(COIN_FACES).optional(),
  weights: weightsSchema.optional(),
  confidence: z.number().optional(),
  latencyMs: z.number().optional(),
  error: z.string().optional(),
});
export type StPetersburgFlipSummary = z.infer<typeof stPetersburgFlipSummarySchema>;

export const stPetersburgGameSummarySchema = z.object({
  characterId: z.string(),
  /** 1-based index within that character's run count. */
  iteration: z.number().int(),
  /** Every turn so far, in order. */
  flips: z.array(stPetersburgFlipSummarySchema),
  ending: z.enum(ST_PETERSBURG_ENDINGS).optional(),
});
export type StPetersburgGameSummary = z.infer<typeof stPetersburgGameSummarySchema>;

export const stPetersburgCharacterTallySchema = z.object({
  /** Turns on which the character chose to flip, and on which it walked away. */
  flip: z.number().int(),
  walk: z.number().int(),
  errors: z.number().int(),
  /** How the coin landed, over every toss this character made. */
  heads: z.number().int(),
  tails: z.number().int(),
  /** Finished games, by how they ended. */
  endings: z.object({
    walked: z.number().int(),
    face: z.number().int(),
    limit: z.number().int(),
    error: z.number().int(),
  }),
  /** Mean number of tosses per finished game, over games that finished. */
  meanFlipsPerGame: z.number().optional(),
  meanWeights: z.object({ flip: z.number(), walk: z.number() }).optional(),
});
export type StPetersburgCharacterTally = z.infer<typeof stPetersburgCharacterTallySchema>;

export const stPetersburgSummarySchema = z.object({
  kind: z.literal("st-petersburg"),
  /** Every game started so far, in the order each first turn completed. */
  games: z.array(stPetersburgGameSummarySchema),
  perCharacter: z.record(z.string(), stPetersburgCharacterTallySchema),
});
export type StPetersburgSummary = z.infer<typeof stPetersburgSummarySchema>;

// --- Union -------------------------------------------------------------------------

export const runSummarySchema = z.discriminatedUnion("kind", [
  trolleySummarySchema,
  prisonersDilemmaSummarySchema,
  adventureSummarySchema,
  stPetersburgSummarySchema,
]);
export type RunSummary = z.infer<typeof runSummarySchema>;

/**
 * A stored summary, typed by its `kind`, or `undefined` when the run has not
 * produced one yet. Screens read `Run.summary` through this rather than casting.
 */
export function parseRunSummary(value: unknown): RunSummary | undefined {
  const parsed = runSummarySchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

/** What both per-choice tallies count: one answer, or the reason there was none. */
export type ChoiceRecord<C extends string> = {
  choice?: C;
  weights?: Record<string, number>;
  error?: string;
};

/**
 * Counts answers per choice, plus the failures and the mean reported weights.
 *
 * It works for the trolley and the dilemma because both tallies name their fields
 * after the choices themselves (`track1`/`track2`, `testify`/`silent`). An
 * adventure tally counts whole walks rather than choices, so it does not come
 * through here.
 */
export function tallyChoices<C extends string>(
  records: readonly ChoiceRecord<C>[],
  choices: readonly C[],
): Record<C, number> & { errors: number; meanWeights?: Record<C, number> } {
  const counts = {} as Record<C, number>;
  for (const choice of choices) {
    counts[choice] = records.filter((record) => record.choice === choice).length;
  }
  return {
    ...counts,
    errors: records.filter((record) => record.error !== undefined).length,
    meanWeights: meanOf(
      records.map((record) => record.weights),
      choices,
    ),
  };
}

/** The arithmetic mean of each key, over the records that carry it. */
export function meanOf<K extends string>(
  records: readonly (Record<string, number> | undefined)[],
  keys: readonly K[],
): Record<K, number> | undefined {
  const usable = records.filter((record): record is Record<string, number> => record !== undefined);
  if (usable.length === 0) return undefined;
  const mean = {} as Record<K, number>;
  for (const key of keys) {
    const total = usable.reduce((sum, record) => sum + (record[key] ?? 0), 0);
    mean[key] = total / usable.length;
  }
  return mean;
}
