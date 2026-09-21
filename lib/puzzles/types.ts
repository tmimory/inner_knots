/**
 * The shape every puzzle prompt builder returns.
 *
 * A builder produces the puzzle side of a call only. The character's steering
 * prompt is prepended as the system message by the run engine, so the same
 * puzzle prompt can be shown in the Prompt View without a character attached.
 */
import type { OutputMode } from "@/lib/domain/enums";
import { render } from "@/lib/prompts/compose";

/** One choice offered to the model. `id` is what comes back as the decision. */
export type PromptOption = { id: string; label: string };

export type PuzzlePrompt = {
  /** Set only when the puzzle itself needs a system message; usually absent. */
  system?: string;
  user: string;
  options: PromptOption[];
};

/**
 * The closing instructions shared by every puzzle: pick one option, answer only
 * through the structured output or the tool.
 */
export function renderDecisionInstructions(
  options: readonly PromptOption[],
  outputMode: OutputMode,
): Promise<string> {
  return render("shared/decision-instructions", {
    options,
    outputMode: { structured: outputMode === "structured", tool: outputMode === "tool" },
  });
}

/** Joins rendered sections with a blank line, dropping the ones that came out empty. */
export function joinSections(sections: readonly (string | null | undefined)[]): string {
  return sections
    .map((section) => section?.trim() ?? "")
    .filter((section) => section.length > 0)
    .join("\n\n");
}
