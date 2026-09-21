/**
 * One hard ceiling on output tokens, applied by every adapter.
 *
 * Puzzles want a choice, not an essay: a model that cannot write 4000 tokens cannot
 * spend the run's budget rationalizing. `MAX_OUTPUT_TOKENS` is the ceiling and a
 * character's own `maxTokens` can only lower it.
 */
import { maxOutputTokens } from "./env";

/** Below this a model cannot even emit `{"choice":"track1"}`. */
export const MIN_OUTPUT_TOKENS = 16;

/** The effective ceiling: the env value, never below `MIN_OUTPUT_TOKENS`. */
export function outputTokenCeiling(): number {
  return Math.max(MIN_OUTPUT_TOKENS, Math.floor(maxOutputTokens()));
}

/** Clamps a requested budget into `[MIN_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS]`. */
export function clampMaxTokens(requested?: number): number {
  const ceiling = outputTokenCeiling();
  if (requested === undefined || !Number.isFinite(requested)) return ceiling;
  return Math.max(MIN_OUTPUT_TOKENS, Math.min(Math.floor(requested), ceiling));
}
