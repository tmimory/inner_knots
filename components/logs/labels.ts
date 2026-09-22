import { PUZZLE_IDS, type PuzzleId } from "@/lib/domain/run";

/**
 * What each puzzle is called wherever the ledger names one.
 *
 * The stored id (`prisoners-dilemma`) is a key, not a name, and a screen that
 * prints the key makes the reader translate. One table, so the run list, the run
 * header, the filter menu and the empty state cannot disagree about what a
 * puzzle is called.
 */
export const PUZZLE_LABELS: Record<PuzzleId, string> = {
  trolley: "Trolley problem",
  "prisoners-dilemma": "Prisoner's dilemma",
  adventure: "Adventure",
};

/** The puzzles in menu order, as the `{ value, label }` pairs a Select takes. */
export const PUZZLE_OPTIONS = PUZZLE_IDS.map((id) => ({ value: id, label: PUZZLE_LABELS[id] }));
