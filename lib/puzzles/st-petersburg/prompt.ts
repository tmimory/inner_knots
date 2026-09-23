/**
 * Assembles one turn of the St. Petersburg coin.
 *
 * The prompt is rebuilt from scratch on every turn rather than appended to,
 * because the only thing that changes between turns is which flip this is and
 * how the coin has come down so far: the voice's terms are restated each time,
 * exactly as they were the first time. The history carries each face's payoff
 * prose rather than a running total, so the model has to hold the pot in its own
 * head — doing the arithmetic for it would answer part of the question the
 * puzzle is asking.
 */
import type { DecisionStyle } from "@/lib/domain/enums";
import type { CoinFace, StPetersburgConfig } from "@/lib/domain/run";
import { render } from "@/lib/prompts/compose";

import { joinSections, renderDecisionInstructions, type PromptOption, type PuzzlePrompt } from "../types";

/** The two answers available on every turn. */
export const ST_PETERSBURG_OPTIONS: readonly PromptOption[] = [
  { id: "flip", label: "Flip the coin" },
  { id: "walk", label: "Walk away" },
] as const;

/** One flip already made, as the character saw it land. */
export type TossRecord = { flip: number; face: CoinFace };

/** What the prompt needs from the config; the roster plays no part in it. */
export type StPetersburgPromptConfig = Pick<StPetersburgConfig, "faces" | "maxFlips">;

export type StPetersburgPromptInput = {
  config: StPetersburgPromptConfig;
  decisionStyle: DecisionStyle;
  /** 1-based turn number. Defaults to the first turn. */
  flip?: number;
  /** The flips already made, oldest first. Empty on turn 1. */
  history?: readonly TossRecord[];
};

/** Builds the prompt for one turn of one game. */
export async function buildStPetersburgPrompt(input: StPetersburgPromptInput): Promise<PuzzlePrompt> {
  const { config, decisionStyle } = input;
  const flip = input.flip ?? 1;
  const history = input.history ?? [];

  const question = await render("st-petersburg/question");

  const sections = [
    await render("st-petersburg/situation", {
      heads: config.faces.heads.payoff,
      tails: config.faces.tails.payoff,
      headsEnds: config.faces.heads.endsGame,
      tailsEnds: config.faces.tails.endsGame,
      maxFlips: config.maxFlips,
    }),
    await render("st-petersburg/history", {
      flip,
      maxFlips: config.maxFlips,
      tosses: history.map((toss) => ({
        flip: toss.flip,
        face: toss.face,
        payoff: config.faces[toss.face].payoff,
      })),
    }),
    question,
    await renderDecisionInstructions(ST_PETERSBURG_OPTIONS, decisionStyle),
  ];

  return {
    user: joinSections(sections),
    options: [...ST_PETERSBURG_OPTIONS],
    question: question.trim(),
  };
}
