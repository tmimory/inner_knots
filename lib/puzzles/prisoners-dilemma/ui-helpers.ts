/**
 * The prisoner's dilemma screen's arithmetic and its defaults.
 *
 * Pure and React-free, so the parts worth getting right — what a stored setup is
 * allowed to become, which payoff matrix a toggle produces, what stops a run —
 * are tested without rendering anything. Nothing in here is prompt text: the
 * payoff defaults are values the user can overwrite, and the words around them
 * live in `prompts/prisoners-dilemma/*.md`.
 */
import { characterDisplayName, type Character } from "@/lib/domain/character";
import {
  DEFAULT_CRIME,
  PRISONERS_DILEMMA_VARIANTS,
  RUN_LIMITS,
  type PayoffPair,
  type Payoffs,
  type PrisonersDilemmaConfig,
  type PrisonersDilemmaVariant,
  type RosterEntry,
} from "@/lib/domain/run";

/** The two seats, in order, as the screen and the prompts name them. */
export const PLAYER_LABELS = ["Player A", "Player B"] as const;

/** Exactly two seats: Player A and Player B. */
export const PLAYER_COUNT = PLAYER_LABELS.length;

/** An iterated game is at least two rounds; one round is the single game. */
export const MIN_ITERATED_ROUNDS = 2;

/** How many games the round grid draws before deferring to the logs. */
export const ROUND_GRID_GAME_LIMIT = 20;

/** The four outcomes a symmetric matrix names, in the order the matrix reads. */
export const SYMMETRIC_PAYOFF_FIELDS = [
  "bothTestify",
  "onlyTestifier",
  "onlySilent",
  "bothSilent",
] as const;
export type SymmetricPayoffField = (typeof SYMMETRIC_PAYOFF_FIELDS)[number];

/** The four cells of an asymmetric matrix; each carries an A value and a B value. */
export const ASYMMETRIC_PAYOFF_FIELDS = [
  "bothTestify",
  "onlyATestifies",
  "onlyBTestifies",
  "bothSilent",
] as const;
export type AsymmetricPayoffField = (typeof ASYMMETRIC_PAYOFF_FIELDS)[number];

export type SymmetricPayoffValues = Record<SymmetricPayoffField, string>;
export type AsymmetricPayoffValues = Record<AsymmetricPayoffField, PayoffPair>;

/** One square of the two-by-two: who testifies in it, and what it stores. */
export type PayoffCell = {
  /** The asymmetric field this square stores, which is also its key. */
  field: AsymmetricPayoffField;
  /** Whether Player A testifies in this square. */
  a: boolean;
  /** Whether Player B testifies in this square. */
  b: boolean;
};

/**
 * The four squares in reading order: A's move down the side, B's across the top.
 *
 * The matrix, its headers and its accessibility labels all read off this one
 * list, so a square cannot mean one thing to the layout and another to the
 * sentence that describes it.
 */
export const PAYOFF_CELLS: readonly PayoffCell[] = [
  { field: "bothTestify", a: true, b: true },
  { field: "onlyATestifies", a: true, b: false },
  { field: "onlyBTestifies", a: false, b: true },
  { field: "bothSilent", a: false, b: false },
];

/** One player's move as a sentence: "Socrates testifies", "Hobbes stays silent". */
export function moveLabel(name: string, testifies: boolean): string {
  return testifies ? `${name} testifies` : `${name} stays silent`;
}

/**
 * What a square is about, in the words the cell's caption uses: "Both testify",
 * "Only Socrates testifies", "Both stay silent".
 */
export function scenarioLabel(cell: PayoffCell, names: { a: string; b: string }): string {
  if (cell.a && cell.b) return "Both testify";
  if (!cell.a && !cell.b) return "Both stay silent";
  return `Only ${cell.a ? names.a : names.b} testifies`;
}

/**
 * Which symmetric field a player collects, given their own move and the other's.
 *
 * A symmetric matrix stores one outcome per *pair* of moves rather than per
 * player, so the same four values are read eight times — once for each player of
 * each square — and this is the mapping that does it.
 */
export function symmetricFieldFor(mine: boolean, theirs: boolean): SymmetricPayoffField {
  if (mine) return theirs ? "bothTestify" : "onlyTestifier";
  return theirs ? "onlySilent" : "bothSilent";
}

/**
 * What the matrix starts as.
 *
 * The wording follows the fragments these values are injected into — the
 * symmetric one reads "you each get {{bothTestify}}", so the default is "5 years"
 * and not "5 years each" — which is why the defaults live beside the screen that
 * labels the fields rather than in the domain. All four are the same quantity for
 * the same reason: three sentences of years and one of "to walk free" made a
 * matrix whose cells could not be compared by looking at them, and the fragment
 * reads "gets 0 years" as happily as it reads "gets 5 years".
 */
export const DEFAULT_SYMMETRIC_PAYOFFS: SymmetricPayoffValues = {
  bothTestify: "5 years",
  onlyTestifier: "0 years",
  onlySilent: "10 years",
  bothSilent: "1 year",
};

export const DEFAULT_ASYMMETRIC_PAYOFFS: AsymmetricPayoffValues = {
  bothTestify: { a: "5 years", b: "5 years" },
  onlyATestifies: { a: "0 years", b: "10 years" },
  onlyBTestifies: { a: "10 years", b: "0 years" },
  bothSilent: { a: "1 year", b: "1 year" },
};

/** Everything the screen remembers between visits. */
export type PrisonersDilemmaSetup = {
  /** Two seats, in order: `[0]` is Player A. Run counts are unused here. */
  roster: RosterEntry[];
  variant: PrisonersDilemmaVariant;
  relationshipsEnabled: boolean;
  relationshipA: string;
  relationshipB: string;
  crime: string;
  /** False while the crime field is locked to whatever it currently holds. */
  crimeUnlocked: boolean;
  symmetric: boolean;
  /** Only read when `symmetric` is false. */
  playersAware: boolean;
  symmetricPayoffs: SymmetricPayoffValues;
  asymmetricPayoffs: AsymmetricPayoffValues;
  iterated: boolean;
  /** Rounds per game while `iterated`; a single game is one round. */
  rounds: number;
  /** How many games are played, each from a clean slate. */
  runs: number;
};

export const DEFAULT_SETUP: PrisonersDilemmaSetup = {
  roster: [],
  variant: "thought-experiment",
  relationshipsEnabled: false,
  relationshipA: "",
  relationshipB: "",
  crime: DEFAULT_CRIME,
  crimeUnlocked: false,
  symmetric: true,
  playersAware: true,
  symmetricPayoffs: DEFAULT_SYMMETRIC_PAYOFFS,
  asymmetricPayoffs: DEFAULT_ASYMMETRIC_PAYOFFS,
  iterated: false,
  rounds: MIN_ITERATED_ROUNDS,
  runs: 1,
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** A stored value only counts when it is a string; anything else takes the default. */
function text(value: unknown, fallback: string, limit: number): string {
  return typeof value === "string" ? value.slice(0, limit) : fallback;
}

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function number(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" ? clamp(value, min, max) : fallback;
}

function pair(value: unknown, fallback: PayoffPair): PayoffPair {
  if (typeof value !== "object" || value === null) return fallback;
  const { a, b } = value as { a?: unknown; b?: unknown };
  return {
    a: text(a, fallback.a, RUN_LIMITS.payoff),
    b: text(b, fallback.b, RUN_LIMITS.payoff),
  };
}

function parseRoster(value: unknown): RosterEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((entry): RosterEntry[] => {
      if (typeof entry !== "object" || entry === null) return [];
      const { characterId } = entry as { characterId?: unknown };
      if (typeof characterId !== "string" || characterId === "") return [];
      return [{ characterId, runs: RUN_LIMITS.minRuns }];
    })
    .slice(0, PLAYER_COUNT);
}

/**
 * Reads back a setup written by an older build without trusting any of it.
 *
 * Every field falls back to its default on its own, so an entry that has lost one
 * shape still restores the rest rather than the whole screen resetting.
 */
export function parseSetup(raw: unknown): PrisonersDilemmaSetup | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const value = raw as Partial<Record<keyof PrisonersDilemmaSetup, unknown>>;

  const symmetricPayoffs = (value.symmetricPayoffs ?? {}) as Record<string, unknown>;
  const asymmetricPayoffs = (value.asymmetricPayoffs ?? {}) as Record<string, unknown>;

  return {
    roster: parseRoster(value.roster),
    variant:
      PRISONERS_DILEMMA_VARIANTS.find((entry) => entry === value.variant) ?? DEFAULT_SETUP.variant,
    relationshipsEnabled: flag(value.relationshipsEnabled, DEFAULT_SETUP.relationshipsEnabled),
    relationshipA: text(value.relationshipA, "", RUN_LIMITS.relationship),
    relationshipB: text(value.relationshipB, "", RUN_LIMITS.relationship),
    crime: text(value.crime, DEFAULT_CRIME, RUN_LIMITS.crime),
    crimeUnlocked: flag(value.crimeUnlocked, DEFAULT_SETUP.crimeUnlocked),
    symmetric: flag(value.symmetric, DEFAULT_SETUP.symmetric),
    playersAware: flag(value.playersAware, DEFAULT_SETUP.playersAware),
    symmetricPayoffs: Object.fromEntries(
      SYMMETRIC_PAYOFF_FIELDS.map((field) => [
        field,
        text(symmetricPayoffs[field], DEFAULT_SYMMETRIC_PAYOFFS[field], RUN_LIMITS.payoff),
      ]),
    ) as SymmetricPayoffValues,
    asymmetricPayoffs: Object.fromEntries(
      ASYMMETRIC_PAYOFF_FIELDS.map((field) => [
        field,
        pair(asymmetricPayoffs[field], DEFAULT_ASYMMETRIC_PAYOFFS[field]),
      ]),
    ) as AsymmetricPayoffValues,
    iterated: flag(value.iterated, DEFAULT_SETUP.iterated),
    rounds: number(
      value.rounds,
      DEFAULT_SETUP.rounds,
      MIN_ITERATED_ROUNDS,
      RUN_LIMITS.maxIterations,
    ),
    runs: number(value.runs, DEFAULT_SETUP.runs, RUN_LIMITS.minRuns, RUN_LIMITS.maxRuns),
  };
}

/** The matrix the toggles currently select, in the shape the domain stores. */
export function payoffsOf(setup: PrisonersDilemmaSetup): Payoffs {
  if (setup.symmetric) return { symmetric: true, ...setup.symmetricPayoffs };
  return { symmetric: false, playersAware: setup.playersAware, ...setup.asymmetricPayoffs };
}

/** How many rounds one game runs: a single game is one round, iterated is `rounds`. */
export function iterationsOf(setup: PrisonersDilemmaSetup): number {
  return setup.iterated ? setup.rounds : 1;
}

/** A relationship reaches the prompt only when the switch is on and it says something. */
function relationshipOf(enabled: boolean, value: string): string | undefined {
  const trimmed = value.trim();
  return enabled && trimmed !== "" ? trimmed : undefined;
}

/**
 * The puzzle half of the config — everything but who is sitting in the two rooms.
 *
 * The Prompt View sends exactly this (the route defaults the players), and a run
 * sends it with `playerA`/`playerB` added, so a preview and a run cannot drift.
 */
export function puzzleConfig(
  setup: PrisonersDilemmaSetup,
): Omit<PrisonersDilemmaConfig, "playerA" | "playerB"> {
  return {
    variant: setup.variant,
    relationshipsEnabled: setup.relationshipsEnabled,
    relationshipA: relationshipOf(setup.relationshipsEnabled, setup.relationshipA),
    relationshipB: relationshipOf(setup.relationshipsEnabled, setup.relationshipB),
    crime: setup.crime.trim(),
    payoffs: payoffsOf(setup),
    iterations: iterationsOf(setup),
    runs: setup.runs,
  };
}

/** The two seated characters, or `undefined` while a seat is empty. */
export function playersOf(
  setup: PrisonersDilemmaSetup,
): { playerA: string; playerB: string } | undefined {
  const [a, b] = setup.roster;
  if (!a || !b) return undefined;
  return { playerA: a.characterId, playerB: b.characterId };
}

/** Every payoff the selected matrix will send, for the "is anything blank?" check. */
function payoffValues(setup: PrisonersDilemmaSetup): string[] {
  if (setup.symmetric) return SYMMETRIC_PAYOFF_FIELDS.map((f) => setup.symmetricPayoffs[f]);
  return ASYMMETRIC_PAYOFF_FIELDS.flatMap((f) => [
    setup.asymmetricPayoffs[f].a,
    setup.asymmetricPayoffs[f].b,
  ]);
}

/** Why the run button is off, or `null` when it is not. */
export function blockedReason(setup: PrisonersDilemmaSetup): string | null {
  if (playersOf(setup) === undefined) return "Seat both players.";
  if (setup.crime.trim() === "") return "The charge cannot be empty.";
  if (payoffValues(setup).some((value) => value.trim() === "")) {
    return "Every cell of the matrix needs an outcome.";
  }
  return null;
}

/** Decisions a run will ask for: games × rounds × the two players. */
export function decisionTotal(setup: PrisonersDilemmaSetup): number {
  return setup.runs * iterationsOf(setup) * PLAYER_COUNT;
}

/**
 * What to call the two players: their own names once they are seated, and the
 * seat's name until then.
 *
 * The screen, the prompt preview and the results all label the same two people,
 * and a fallback spelled three times is a fallback that drifts, so the pair is
 * derived in one place.
 */
export function playerNames(players: {
  a?: Pick<Character, "id" | "name">;
  b?: Pick<Character, "id" | "name">;
}): { a: string; b: string } {
  return {
    a: players.a ? characterDisplayName(players.a) : PLAYER_LABELS[0],
    b: players.b ? characterDisplayName(players.b) : PLAYER_LABELS[1],
  };
}
