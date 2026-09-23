/**
 * Run: one execution of a puzzle against a roster of characters.
 *
 * `config` is a full snapshot of the puzzle configuration, so a run stays
 * readable after the characters, objects or adventure it referenced change.
 * The run index (`data/runs/index.jsonl`) stores {@link RunEvent} lines rather
 * than whole runs, which keeps progress updates cheap to append.
 */
import { z } from "zod";

import { characterIdSchema } from "./character";

export const PUZZLE_IDS = ["trolley", "prisoners-dilemma", "st-petersburg", "adventure"] as const;
export type PuzzleId = (typeof PUZZLE_IDS)[number];

export const RUN_LIMITS = {
  minRuns: 1,
  maxRuns: 100,
  minRoster: 1,
  maxRoster: 5,
  minIterations: 1,
  maxIterations: 10,
  /** How many objects one trolley track holds, and how many a random draw puts there. */
  maxTrack: 5,
  crime: 1000,
  relationship: 250,
  payoff: 60,
  /** What one face of the St. Petersburg coin is worth, as prose. */
  facePayoff: 120,
  /** The most a numeric face may pay on the first flip, before any doubling. */
  maxAmount: 1_000_000,
  /** How many times one game of the coin may be flipped, at most. */
  minFlips: 1,
  maxFlips: 15,
} as const;

/** Prose for the crime when the user has not written their own. */
export const DEFAULT_CRIME =
  "a jewelry heist in which $5 million in gems was taken and nobody was hurt";

export const runCountSchema = z.number().int().min(RUN_LIMITS.minRuns).max(RUN_LIMITS.maxRuns);

/** One character on the roster, with how many times it should answer. */
export const rosterEntrySchema = z.object({
  characterId: characterIdSchema,
  runs: runCountSchema,
});
export type RosterEntry = z.infer<typeof rosterEntrySchema>;

const rosterSchema = z.array(rosterEntrySchema).min(RUN_LIMITS.minRoster).max(RUN_LIMITS.maxRoster);

// --- Trolley -----------------------------------------------------------------------

export const TROLLEY_VARIANTS = ["thought-experiment", "employee", "bystander"] as const;
export type TrolleyVariant = (typeof TROLLEY_VARIANTS)[number];

export const trolleyConfigSchema = z.object({
  variant: z.enum(TROLLEY_VARIANTS),
  /** Ids into the trolley-object collection. The trolley starts headed here. */
  track1: z.array(z.string().min(1)),
  track2: z.array(z.string().min(1)),
  roster: rosterSchema,
});
export type TrolleyConfig = z.infer<typeof trolleyConfigSchema>;

// --- Prisoner's dilemma ------------------------------------------------------------

export const PRISONERS_DILEMMA_VARIANTS = ["thought-experiment", "interrogation"] as const;
export type PrisonersDilemmaVariant = (typeof PRISONERS_DILEMMA_VARIANTS)[number];

/**
 * Payoffs are free text ("5 years", "walk free", "a $10,000 fine") because the
 * interesting variations are not all numeric.
 */
const payoffSchema = z.string().min(1).max(RUN_LIMITS.payoff);
const payoffPairSchema = z.object({ a: payoffSchema, b: payoffSchema });
export type PayoffPair = z.infer<typeof payoffPairSchema>;

export const symmetricPayoffsSchema = z.object({
  symmetric: z.literal(true),
  bothTestify: payoffSchema,
  bothSilent: payoffSchema,
  /** What the one who testifies gets when the other stays silent. */
  onlyTestifier: payoffSchema,
  /** What the one who stays silent gets when the other testifies. */
  onlySilent: payoffSchema,
});

export const asymmetricPayoffsSchema = z.object({
  symmetric: z.literal(false),
  /** When true, each player is told both players' payoffs rather than only their own. */
  playersAware: z.boolean(),
  bothTestify: payoffPairSchema,
  bothSilent: payoffPairSchema,
  onlyATestifies: payoffPairSchema,
  onlyBTestifies: payoffPairSchema,
});

export const payoffsSchema = z.discriminatedUnion("symmetric", [
  symmetricPayoffsSchema,
  asymmetricPayoffsSchema,
]);
export type Payoffs = z.infer<typeof payoffsSchema>;
export type SymmetricPayoffs = z.infer<typeof symmetricPayoffsSchema>;
export type AsymmetricPayoffs = z.infer<typeof asymmetricPayoffsSchema>;

export const prisonersDilemmaConfigSchema = z.object({
  variant: z.enum(PRISONERS_DILEMMA_VARIANTS),
  playerA: characterIdSchema,
  playerB: characterIdSchema,
  /** How player A relates to player B, in A's words. */
  relationshipA: z.string().max(RUN_LIMITS.relationship).optional(),
  relationshipB: z.string().max(RUN_LIMITS.relationship).optional(),
  relationshipsEnabled: z.boolean(),
  crime: z.string().max(RUN_LIMITS.crime).default(DEFAULT_CRIME),
  payoffs: payoffsSchema,
  iterations: z.number().int().min(RUN_LIMITS.minIterations).max(RUN_LIMITS.maxIterations),
  runs: runCountSchema,
});
export type PrisonersDilemmaConfig = z.infer<typeof prisonersDilemmaConfigSchema>;

// --- Adventure ---------------------------------------------------------------------

export const adventureConfigSchema = z.object({
  adventureId: z.string().min(1),
  /** When true, each node is answered without the history of earlier choices. */
  amnesia: z.boolean(),
  roster: rosterSchema,
});
export type AdventureConfig = z.infer<typeof adventureConfigSchema>;

// --- St. Petersburg ----------------------------------------------------------------

export const ST_PETERSBURG_VARIANTS = ["thought-experiment", "encounter"] as const;
export type StPetersburgVariant = (typeof ST_PETERSBURG_VARIANTS)[number];

export const COIN_FACES = ["heads", "tails"] as const;
export type CoinFace = (typeof COIN_FACES)[number];

/**
 * What one face pays. `text` is prose the voice says verbatim ("a sandwich");
 * `amount` is money, paid on every flip that lands this way and, when `doubles`,
 * doubled for each flip after the first (so $2, $4, $8… — the escalation the
 * paradox is named for); `forfeit` takes back everything won so far.
 *
 * A stored payoff from before the kinds existed was a plain string; it is read
 * as `text`, so an older run's config still parses.
 */
export const COIN_PAYOFF_KINDS = ["text", "amount", "forfeit"] as const;
export type CoinPayoffKind = (typeof COIN_PAYOFF_KINDS)[number];

const coinPayoffUnionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), text: z.string().min(1).max(RUN_LIMITS.facePayoff) }),
  z.object({
    kind: z.literal("amount"),
    amount: z.number().min(0).max(RUN_LIMITS.maxAmount),
    doubles: z.boolean(),
  }),
  z.object({ kind: z.literal("forfeit") }),
]);
export const coinPayoffSchema = z.preprocess(
  (value) => (typeof value === "string" ? { kind: "text", text: value } : value),
  coinPayoffUnionSchema,
);
export type CoinPayoff = z.infer<typeof coinPayoffUnionSchema>;

/** One face of the coin: what it pays, and whether landing this way ends the game. */
export const coinFaceRuleSchema = z.object({
  payoff: coinPayoffSchema,
  endsGame: z.boolean(),
});
export type CoinFaceRule = z.infer<typeof coinFaceRuleSchema>;

export const stPetersburgConfigSchema = z.object({
  /** Older runs were all framed as an encounter; a config without one reads as that. */
  variant: z.enum(ST_PETERSBURG_VARIANTS).default("encounter"),
  faces: z.object({ heads: coinFaceRuleSchema, tails: coinFaceRuleSchema }),
  /** The most times one game may flip the coin; the game ends after this many. */
  maxFlips: z.number().int().min(RUN_LIMITS.minFlips).max(RUN_LIMITS.maxFlips),
  /** Each entry's `runs` is how many games that character plays. */
  roster: rosterSchema,
});
export type StPetersburgConfig = z.infer<typeof stPetersburgConfigSchema>;

// --- Run ---------------------------------------------------------------------------

export const RUN_STATUSES = ["queued", "running", "finished", "failed", "cancelled"] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

/** The statuses a run never leaves. Polling stops when one is reached. */
export const TERMINAL_RUN_STATUSES = ["finished", "failed", "cancelled"] as const;

/** Whether a run has settled, one way or another. */
export function isTerminalRunStatus(status: RunStatus): boolean {
  return (TERMINAL_RUN_STATUSES as readonly string[]).includes(status);
}

export const runProgressSchema = z.object({
  done: z.number().int().min(0),
  total: z.number().int().min(0),
});
export type RunProgress = z.infer<typeof runProgressSchema>;

export const runConfigSchema = z.discriminatedUnion("puzzle", [
  z.object({ puzzle: z.literal("trolley"), ...trolleyConfigSchema.shape }),
  z.object({ puzzle: z.literal("prisoners-dilemma"), ...prisonersDilemmaConfigSchema.shape }),
  z.object({ puzzle: z.literal("st-petersburg"), ...stPetersburgConfigSchema.shape }),
  z.object({ puzzle: z.literal("adventure"), ...adventureConfigSchema.shape }),
]);
export type RunConfig = z.infer<typeof runConfigSchema>;

export const runSchema = z.object({
  id: z.string().min(1),
  puzzle: z.enum(PUZZLE_IDS),
  config: runConfigSchema,
  status: z.enum(RUN_STATUSES),
  progress: runProgressSchema,
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  error: z.string().optional(),
  /** Puzzle-specific reducer output; typed per puzzle in `lib/puzzles`. */
  summary: z.unknown().optional(),
  createdAt: z.string(),
});
export type Run = z.infer<typeof runSchema>;

/** One line of `data/runs/index.jsonl`. Replaying them rebuilds every run. */
export const runEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("created"), run: runSchema }),
  z.object({
    type: z.literal("progress"),
    runId: z.string(),
    progress: runProgressSchema,
    status: z.enum(RUN_STATUSES),
  }),
  z.object({
    /** The partial summary, rewritten after each decision so pollers can animate. */
    type: z.literal("summary"),
    runId: z.string(),
    summary: z.unknown(),
  }),
  z.object({
    type: z.literal("finished"),
    runId: z.string(),
    summary: z.unknown().optional(),
    finishedAt: z.string(),
  }),
  z.object({ type: z.literal("failed"), runId: z.string(), error: z.string(), finishedAt: z.string() }),
  z.object({ type: z.literal("cancelled"), runId: z.string(), finishedAt: z.string() }),
]);
export type RunEvent = z.infer<typeof runEventSchema>;
