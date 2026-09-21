/**
 * Assembles the prompt for one node of an adventure.
 *
 * The briefing is repeated on every node because each call is stateless. The
 * history of earlier choices is included unless the run is set to amnesia, in
 * which case the character meets every node as if for the first time.
 */
import type { AdventureNode } from "@/lib/domain/adventure";
import type { OutputMode } from "@/lib/domain/enums";
import { render } from "@/lib/prompts/compose";

import { joinSections, renderDecisionInstructions, type PromptOption, type PuzzlePrompt } from "../types";

/** One step already taken, as the character experienced it. */
export type AdventureStep = {
  /** The question that node asked. */
  decision: string;
  /** The label of the option taken. */
  choice: string;
  /** The outcome narration attached to that option, if it had one. */
  outcome?: string;
};

export type AdventurePromptInput = {
  briefing: string;
  node: Pick<AdventureNode, "context" | "decision" | "options">;
  /** Steps already taken, oldest first. Ignored when `amnesia` is true. */
  history?: readonly AdventureStep[];
  amnesia: boolean;
  outputMode: OutputMode;
};

/** The options of a node, in the order the builder laid them out. */
export function adventureOptions(node: Pick<AdventureNode, "options">): PromptOption[] {
  return node.options.map((option) => ({ id: option.id, label: option.label }));
}

/** Builds the prompt for one node. */
export async function buildAdventurePrompt(input: AdventurePromptInput): Promise<PuzzlePrompt> {
  const options = adventureOptions(input.node);
  const history = input.amnesia ? [] : (input.history ?? []);
  const briefing = input.briefing.trim();

  const sections = [
    briefing.length > 0 ? await render("adventure/briefing", { briefing }) : null,
    history.length > 0 ? await render("adventure/history", { steps: history }) : null,
    await render("adventure/node", { context: input.node.context, decision: input.node.decision }),
    await renderDecisionInstructions(options, input.outputMode),
  ];

  return { user: joinSections(sections), options };
}
