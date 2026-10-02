import { z } from "zod";
import { characterIdSchema } from "./character";

export const RUN_LIMITS = {
  minRuns: 1,
  maxRuns: 100,
  minRoster: 1,
  maxRoster: 5,
  minIterations: 1,
  maxIterations: 10,
  /** How many objects one trolley track holds, and how many a random draw puts there. */
  maxTrack: 5,
  switchTradeoff: 2000,
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

export const rosterSchema = z.array(rosterEntrySchema).min(RUN_LIMITS.minRoster).max(RUN_LIMITS.maxRoster);
