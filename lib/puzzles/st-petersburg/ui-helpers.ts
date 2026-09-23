/**
 * The coin screen's arithmetic and its defaults.
 *
 * Pure and React-free, so the parts worth getting right — what a stored setup is
 * allowed to become, what the run and the preview are both sent, what stops a
 * run — are tested without rendering anything. Nothing in here is prompt text:
 * the two payoffs are values the user overwrites, and the sentences they land in
 * live in `prompts/st-petersburg/*.md`.
 */
import {
  COIN_FACES,
  RUN_LIMITS,
  type CoinFace,
  type CoinFaceRule,
  type RosterEntry,
  type StPetersburgConfig,
} from "@/lib/domain/run";
import { parseFlag, parseNumber, parseRoster, parseText } from "@/lib/puzzles/setup-parse";

/** What the voice promises for each face, and which face ends the game. */
export type CoinFaces = StPetersburgConfig["faces"];

/** How many games the flip grid draws before deferring to the logs. */
export const FLIP_GRID_GAME_LIMIT = 20;

/**
 * The paradox as Bernoulli put it: heads doubles the pot and the game goes on,
 * tails takes everything and the game is over. The pot's starting value rides in
 * the heads payoff, since the situation fragment never names one: a pot that
 * "doubles" from nothing stays nothing, and the model would be right to notice.
 * Written to sit inside the voice's sentence in `situation.md` ("if it comes up
 * heads, the pot doubles…"), which is why the wording lives beside the screen
 * that labels the fields rather than in the domain — the user is free to replace
 * either half.
 */
export const DEFAULT_FACES: CoinFaces = {
  heads: { payoff: "the pot doubles, starting from $2", endsGame: false },
  tails: { payoff: "you lose everything in the pot", endsGame: true },
};

/**
 * Where the flip cap starts: well inside the hard maximum, so the first run is a
 * game long enough to show a compounding pot and short enough to finish.
 */
const DEFAULT_MAX_FLIPS = 10;

/** Everything the screen remembers between visits. */
export type StPetersburgSetup = {
  /** The cast; each entry's `runs` is how many games that character plays. */
  roster: RosterEntry[];
  faces: CoinFaces;
  /** The most times one game may flip the coin. */
  maxFlips: number;
};

export const DEFAULT_SETUP: StPetersburgSetup = {
  roster: [],
  faces: DEFAULT_FACES,
  maxFlips: DEFAULT_MAX_FLIPS,
};

/** One face, restored half at a time: a lost payoff does not cost the flag beside it. */
function parseFace(value: unknown, fallback: CoinFaceRule): CoinFaceRule {
  if (typeof value !== "object" || value === null) return fallback;
  const { payoff, endsGame } = value as { payoff?: unknown; endsGame?: unknown };
  return {
    payoff: parseText(payoff, fallback.payoff, RUN_LIMITS.facePayoff),
    endsGame: parseFlag(endsGame, fallback.endsGame),
  };
}

/**
 * Reads back a setup written by an older build without trusting any of it.
 *
 * Every field falls back to its default on its own, so an entry that has lost one
 * shape still restores the rest rather than the whole screen resetting.
 */
export function parseSetup(raw: unknown): StPetersburgSetup | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const value = raw as Partial<Record<keyof StPetersburgSetup, unknown>>;
  const faces = (value.faces ?? {}) as Record<string, unknown>;

  return {
    roster: parseRoster(value.roster, { max: RUN_LIMITS.maxRoster, runs: "stored" }),
    faces: Object.fromEntries(
      COIN_FACES.map((face) => [face, parseFace(faces[face], DEFAULT_FACES[face])]),
    ) as CoinFaces,
    maxFlips: parseNumber(
      value.maxFlips,
      DEFAULT_SETUP.maxFlips,
      RUN_LIMITS.minFlips,
      RUN_LIMITS.maxFlips,
    ),
  };
}

/**
 * The puzzle half of the config — everything but who is playing.
 *
 * The Prompt View sends exactly this and a run sends it with the roster added, so
 * a preview and a run cannot drift. Payoffs are trimmed here rather than in the
 * field, so trailing space while typing does not fight the cursor.
 */
export function puzzleConfig(setup: StPetersburgSetup): Omit<StPetersburgConfig, "roster"> {
  return {
    faces: Object.fromEntries(
      COIN_FACES.map((face): [CoinFace, CoinFaceRule] => [
        face,
        { payoff: setup.faces[face].payoff.trim(), endsGame: setup.faces[face].endsGame },
      ]),
    ) as CoinFaces,
    maxFlips: setup.maxFlips,
  };
}

/** Why the run button is off, or `null` when it is not. */
export function blockedReason(setup: StPetersburgSetup): string | null {
  if (setup.roster.length === 0) return "Put at least one character on the roster.";
  if (COIN_FACES.some((face) => setup.faces[face].payoff.trim() === "")) {
    return "Say what each face pays.";
  }
  return null;
}

/** Games a run will play: one per run count on the roster. */
export function gameTotal(setup: StPetersburgSetup): number {
  return setup.roster.reduce((sum, entry) => sum + entry.runs, 0);
}

/**
 * Whether the game-by-game grid earns its space.
 *
 * One game of one flip is the histogram written a second time, and nothing else.
 * Anything more — a roster answering twice, or one game that may run to ten — is
 * a shape worth laying out as rows.
 */
export function showsFlipGrid(games: number, maxFlips: number): boolean {
  return games > 1 || maxFlips > 1;
}
