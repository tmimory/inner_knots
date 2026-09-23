/**
 * The coin screen's arithmetic and its defaults.
 *
 * Pure and React-free, so the parts worth getting right — what a stored setup is
 * allowed to become, what the run and the preview are both sent, what stops a
 * run — are tested without rendering anything. Nothing in here is prompt text:
 * a prose payoff is a value the user writes, and the sentences it lands in live
 * in `prompts/st-petersburg/*.md`.
 */
import {
  COIN_FACES,
  COIN_PAYOFF_KINDS,
  RUN_LIMITS,
  ST_PETERSBURG_VARIANTS,
  type CoinFace,
  type CoinFaceRule,
  type CoinPayoff,
  type CoinPayoffKind,
  type RosterEntry,
  type StPetersburgConfig,
  type StPetersburgVariant,
} from "@/lib/domain/run";
import { parseFlag, parseNumber, parseRoster, parseText } from "@/lib/puzzles/setup-parse";

/** What the voice promises for each face, and which face ends the game. */
export type CoinFaces = StPetersburgConfig["faces"];

/** How many games the flip grid draws before deferring to the logs. */
export const FLIP_GRID_GAME_LIMIT = 20;

/**
 * What a face starts paying when it is switched to money: the paradox's own
 * stake, and the number the amount field falls back to when what is stored
 * cannot be read as one.
 */
export const DEFAULT_AMOUNT = 2;

/**
 * The paradox as Bernoulli put it, now in the currency it was written in: heads
 * pays $2 and doubles on every flip after the first, and the game goes on; tails
 * takes back everything won so far and the game is over.
 *
 * Both defaults are priced, so the first run shows the escalation the puzzle is
 * named for without anyone having to describe it in prose. Either face can still
 * be written in words instead.
 */
export const DEFAULT_FACES: CoinFaces = {
  heads: { payoff: { kind: "amount", amount: DEFAULT_AMOUNT, doubles: true }, endsGame: false },
  tails: { payoff: { kind: "forfeit" }, endsGame: true },
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
  /** Which framing the voice arrives in: a stated gamble, or a coin on the ground. */
  variant: StPetersburgVariant;
  faces: CoinFaces;
  /** The most times one game may flip the coin. */
  maxFlips: number;
};

export const DEFAULT_SETUP: StPetersburgSetup = {
  roster: [],
  variant: "thought-experiment",
  faces: DEFAULT_FACES,
  maxFlips: DEFAULT_MAX_FLIPS,
};

/** The prose of a payoff, or the empty string for one that is not written in words. */
export function payoffText(payoff: CoinPayoff): string {
  return payoff.kind === "text" ? payoff.text : "";
}

/**
 * A stake pulled inside the limits the schema will hold it to.
 *
 * Anything unreadable — a lost field, `NaN`, an infinity — takes the default
 * stake rather than the floor, because a payoff silently becoming $0 is a
 * different puzzle. Rounded to the cent: money below one is not something
 * `formatMoney` can show, and a config that says more than the screen does is a
 * drift waiting to be reported as a bug.
 */
export function clampAmount(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_AMOUNT;
  const inside = Math.min(RUN_LIMITS.maxAmount, Math.max(0, value));
  return Math.round(inside * 100) / 100;
}

/** A stored kind only counts when it is one of the three the domain knows. */
function parseKind(value: unknown): CoinPayoffKind | undefined {
  return COIN_PAYOFF_KINDS.find((kind) => kind === value);
}

/**
 * One payoff, restored without trusting any of it.
 *
 * A payoff stored before the kinds existed was a bare string, and is read as
 * prose — the same upgrade `coinPayoffSchema` does on the wire, so a setup and a
 * run made from it agree. A kind nobody recognises takes the face's default
 * whole, since a half-read discriminated union has no meaning to fall back to.
 */
function parsePayoff(value: unknown, fallback: CoinPayoff): CoinPayoff {
  if (typeof value === "string") return { kind: "text", text: value.slice(0, RUN_LIMITS.facePayoff) };
  if (typeof value !== "object" || value === null) return fallback;

  const stored = value as { kind?: unknown; text?: unknown; amount?: unknown; doubles?: unknown };
  const kind = parseKind(stored.kind);
  if (kind === undefined) return fallback;

  if (kind === "text") {
    return {
      kind: "text",
      text: parseText(stored.text, payoffText(fallback), RUN_LIMITS.facePayoff),
    };
  }
  if (kind === "forfeit") return { kind: "forfeit" };

  return {
    kind: "amount",
    amount:
      typeof stored.amount === "number"
        ? clampAmount(stored.amount)
        : fallback.kind === "amount"
          ? fallback.amount
          : DEFAULT_AMOUNT,
    doubles: parseFlag(stored.doubles, fallback.kind === "amount" ? fallback.doubles : false),
  };
}

/** One face, restored half at a time: a lost payoff does not cost the flag beside it. */
function parseFace(value: unknown, fallback: CoinFaceRule): CoinFaceRule {
  if (typeof value !== "object" || value === null) return fallback;
  const { payoff, endsGame } = value as { payoff?: unknown; endsGame?: unknown };
  return {
    payoff: parsePayoff(payoff, fallback.payoff),
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
    variant:
      ST_PETERSBURG_VARIANTS.find((entry) => entry === value.variant) ?? DEFAULT_SETUP.variant,
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

/** Prose is trimmed on the way out; a price has nothing to trim. */
function sentPayoff(payoff: CoinPayoff): CoinPayoff {
  return payoff.kind === "text" ? { kind: "text", text: payoff.text.trim() } : payoff;
}

/**
 * The puzzle half of the config — everything but who is playing.
 *
 * The Prompt View sends exactly this and a run sends it with the roster added, so
 * a preview and a run cannot drift. Prose payoffs are trimmed here rather than in
 * the field, so trailing space while typing does not fight the cursor.
 */
export function puzzleConfig(setup: StPetersburgSetup): Omit<StPetersburgConfig, "roster"> {
  return {
    variant: setup.variant,
    faces: Object.fromEntries(
      COIN_FACES.map((face): [CoinFace, CoinFaceRule] => [
        face,
        { payoff: sentPayoff(setup.faces[face].payoff), endsGame: setup.faces[face].endsGame },
      ]),
    ) as CoinFaces,
    maxFlips: setup.maxFlips,
  };
}

/** Why the run button is off, or `null` when it is not. */
export function blockedReason(setup: StPetersburgSetup): string | null {
  if (setup.roster.length === 0) return "Put at least one character on the roster.";
  if (
    COIN_FACES.some((face) => {
      const payoff = setup.faces[face].payoff;
      return payoff.kind === "text" && payoff.text.trim() === "";
    })
  ) {
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
