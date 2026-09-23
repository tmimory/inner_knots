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
  "st-petersburg": "Coin of St. Petersburg",
};

/** The puzzles in menu order, as the `{ value, label }` pairs a Select takes. */
export const PUZZLE_OPTIONS = PUZZLE_IDS.map((id) => ({ value: id, label: PUZZLE_LABELS[id] }));

/**
 * What each framing is called in prose.
 *
 * The stored id (`employee`) is a key: a run header that prints it makes the
 * reader remember which of three prompts it stood for. The wording follows the
 * puzzle screens' own variant list, shortened to the two or three words a
 * metadata column can hold.
 */
export const VARIANT_LABELS: Record<string, string> = {
  "thought-experiment": "Thought experiment",
  employee: "Employee framing",
  bystander: "Bystander framing",
  interrogation: "Interrogation room",
  encounter: "Encounter",
};

/** A run config's framing in prose, or the raw id when the puzzle has none. */
export function variantLabel(variant: string): string {
  return VARIANT_LABELS[variant] ?? variant;
}
