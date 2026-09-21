/**
 * Assembles the trolley prompt: a framing variant, the situation with both
 * tracks described, the question, and the shared decision instructions.
 *
 * The objects on each track arrive already resolved (see the API route), so this
 * module is pure and can be unit-tested without touching the store.
 */
import type { OutputMode } from "@/lib/domain/enums";
import type { TrolleyVariant } from "@/lib/domain/run";
import type { TrolleyObject } from "@/lib/domain/trolley-object";
import { render } from "@/lib/prompts/compose";

import { joinSections, renderDecisionInstructions, type PromptOption, type PuzzlePrompt } from "../types";

/** The two things the trolley can do. `id` is what the model must return. */
export const TROLLEY_OPTIONS: readonly PromptOption[] = [
  { id: "track1", label: "Track 1" },
  { id: "track2", label: "Track 2" },
] as const;

/** Only the fields of a trolley object that reach the prompt. */
export type TrackItem = Pick<TrolleyObject, "label" | "prompt">;

export type TrolleyPromptInput = {
  variant: TrolleyVariant;
  /** What the trolley hits if the switch is left alone. */
  track1: readonly TrackItem[];
  track2: readonly TrackItem[];
  outputMode: OutputMode;
};

/**
 * "a", "a and b", "a, b and c" — the joiner used for both track descriptions.
 * An empty list gives an empty string; the situation fragment supplies the
 * wording for a bare track, so no prose lives here.
 */
export function joinNaturalLanguage(items: readonly string[]): string {
  const usable = items.map((item) => item.trim()).filter((item) => item.length > 0);
  if (usable.length === 0) return "";
  if (usable.length === 1) return usable[0] ?? "";
  return `${usable.slice(0, -1).join(", ")} and ${usable[usable.length - 1]}`;
}

/** The natural-language description of one track. */
export function describeTrack(items: readonly TrackItem[]): string {
  return joinNaturalLanguage(items.map((item) => item.prompt));
}

/** Builds the trolley prompt. The character's steering is prepended by the engine. */
export async function buildTrolleyPrompt(input: TrolleyPromptInput): Promise<PuzzlePrompt> {
  const situation = await render("trolley/situation", {
    track1: describeTrack(input.track1),
    track2: describeTrack(input.track2),
  });

  const user = joinSections([
    await render(`trolley/variant-${input.variant}`, { situation }),
    await render("trolley/question"),
    await renderDecisionInstructions(TROLLEY_OPTIONS, input.outputMode),
  ]);

  return { user, options: [...TROLLEY_OPTIONS] };
}
