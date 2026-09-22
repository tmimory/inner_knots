/**
 * Schema pieces shared by the API route bodies.
 *
 * `lib/domain/enums.ts` is a contract file shared verbatim with the provider
 * layer, so route-level conveniences such as a default decision style live here
 * rather than being bolted onto it.
 */
import { z } from "zod";

import type { Character } from "@/lib/domain/character";
import { DECISION_STYLES, decisionStyleFor, type DecisionStyle } from "@/lib/domain/enums";

/**
 * The decision style a prompt preview should be composed for. Previews default
 * to structured output, which is what a character gets unless it says otherwise.
 */
export const previewDecisionStyleSchema = z.enum(DECISION_STYLES).default("structured");

/**
 * The style one panel of a preview is composed with: the seated character's own,
 * derived exactly as a run derives it, or the request's fallback while the seat
 * is empty and there is nobody to derive it from.
 *
 * A preview that named its own style could disagree with the run; a preview that
 * reads the roster cannot.
 */
export function previewDecisionStyle(
  character: Pick<Character, "provider" | "outputMode"> | undefined,
  fallback: DecisionStyle,
): DecisionStyle {
  if (!character) return fallback;
  return decisionStyleFor(character.provider, character.outputMode);
}
