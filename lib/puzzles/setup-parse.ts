/**
 * The distrustful readers every puzzle's persisted setup is rebuilt with.
 *
 * A stored value only counts when it has the right type; anything else takes the
 * default. Every screen remembers its setup across visits, and a setup written by
 * an older build — or edited by hand — arrives as `unknown`, so each field is
 * restored on its own rather than the whole screen resetting on one bad shape.
 * Pure and React-free: the puzzles' `ui-helpers` and the count stepper all read
 * their bounds from here.
 */
import { RUN_LIMITS, type RosterEntry } from "@/lib/domain/run";

/** The nearest whole count inside the bounds; anything unreadable falls to `min`. */
export function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** A stored value only counts when it is a string; anything else takes the default. */
export function parseText(value: unknown, fallback: string, limit: number): string {
  return typeof value === "string" ? value.slice(0, limit) : fallback;
}

/** A stored value only counts when it is a boolean; anything else takes the default. */
export function parseFlag(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/** A stored number, pulled inside the bounds; anything else takes the default. */
export function parseNumber(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" ? clampInt(value, min, max) : fallback;
}

/** How a roster entry's run count is restored. */
export type RosterRunsMode =
  /** Read the entry's own `runs`, pulled inside the run limits. */
  | "stored"
  /** Ignore whatever was stored: every seat runs once. */
  | "fixed";

export type ParseRosterOptions = {
  /** How many entries survive; the rest are dropped. */
  max: number;
  runs: RosterRunsMode;
};

/**
 * Reads a stored roster back: entries with an id, and counts the schema accepts.
 *
 * An entry needs a non-empty `characterId`, and under `runs: "stored"` a numeric
 * count, which is pulled inside the run limits rather than trusted — a stored
 * number the schema would now reject would fail the run instead of the reload.
 * Under `runs: "fixed"` the stored count is ignored entirely: the dilemma seats
 * two players and counts its games elsewhere.
 */
export function parseRoster(value: unknown, options: ParseRosterOptions): RosterEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((entry): RosterEntry[] => {
      if (typeof entry !== "object" || entry === null) return [];
      const { characterId, runs } = entry as { characterId?: unknown; runs?: unknown };
      if (typeof characterId !== "string" || characterId === "") return [];
      if (options.runs === "fixed") return [{ characterId, runs: RUN_LIMITS.minRuns }];
      if (typeof runs !== "number") return [];
      return [{ characterId, runs: clampInt(runs, RUN_LIMITS.minRuns, RUN_LIMITS.maxRuns) }];
    })
    .slice(0, options.max);
}
