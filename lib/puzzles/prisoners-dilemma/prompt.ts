/**
 * Assembles one player's prisoner's dilemma prompt.
 *
 * Each player gets their own prompt: the payoffs are re-expressed from that
 * player's side ("you" and "your partner"), and in the asymmetric case a player
 * may be shown only their own consequences. In an iterated run the prompt also
 * carries the rounds already played.
 */
import type { DecisionStyle } from "@/lib/domain/enums";
import type { PrisonersDilemmaConfig } from "@/lib/domain/run";
import { render } from "@/lib/prompts/compose";

import { joinSections, renderDecisionInstructions, type PromptOption, type PuzzlePrompt } from "../types";

/** The two answers available to a player. */
export const PRISONERS_DILEMMA_OPTIONS: readonly PromptOption[] = [
  { id: "testify", label: "Testify" },
  { id: "silent", label: "Stay silent" },
] as const;

export type PrisonersDilemmaChoice = "testify" | "silent";

/** Which side of the table this prompt is for. */
export type PlayerSlot = "a" | "b";

/** One completed round, as the player being prompted experienced it. */
export type RoundRecord = { round: number; you: PrisonersDilemmaChoice; partner: PrisonersDilemmaChoice };

export type PrisonersDilemmaPromptInput = {
  config: PrisonersDilemmaConfig;
  player: PlayerSlot;
  decisionStyle: DecisionStyle;
  /** 1-based round number. Defaults to the first round. */
  round?: number;
  /** The rounds already played, oldest first. Empty in round 1. */
  history?: readonly RoundRecord[];
};

function labelFor(choice: PrisonersDilemmaChoice): string {
  return PRISONERS_DILEMMA_OPTIONS.find((option) => option.id === choice)?.label ?? choice;
}

/** Turns the stored payoff matrix into the fragment and variables for one player. */
async function renderPayoffs(config: PrisonersDilemmaConfig, player: PlayerSlot): Promise<string> {
  const { payoffs } = config;

  if (payoffs.symmetric) {
    return render("prisoners-dilemma/payoffs-symmetric", {
      bothTestify: payoffs.bothTestify,
      bothSilent: payoffs.bothSilent,
      onlyTestifier: payoffs.onlyTestifier,
      onlySilent: payoffs.onlySilent,
    });
  }

  // Re-key the a/b matrix as you/partner for whichever side is being prompted.
  const mine = player === "a" ? ("a" as const) : ("b" as const);
  const theirs = player === "a" ? ("b" as const) : ("a" as const);
  const pair = (value: { a: string; b: string }) => ({ you: value[mine], partner: value[theirs] });

  const youTestifyOnly = player === "a" ? payoffs.onlyATestifies : payoffs.onlyBTestifies;
  const partnerTestifyOnly = player === "a" ? payoffs.onlyBTestifies : payoffs.onlyATestifies;

  const sides = {
    bothTestify: pair(payoffs.bothTestify),
    bothSilent: pair(payoffs.bothSilent),
    youTestifyOnly: pair(youTestifyOnly),
    partnerTestifyOnly: pair(partnerTestifyOnly),
  };

  if (payoffs.playersAware) return render("prisoners-dilemma/payoffs-asymmetric-aware", sides);

  return render("prisoners-dilemma/payoffs-asymmetric-own", {
    bothTestify: sides.bothTestify.you,
    bothSilent: sides.bothSilent.you,
    youTestifyOnly: sides.youTestifyOnly.you,
    partnerTestifyOnly: sides.partnerTestifyOnly.you,
  });
}

/** Builds one player's prompt for one round. */
export async function buildPrisonersDilemmaPrompt(
  input: PrisonersDilemmaPromptInput,
): Promise<PuzzlePrompt> {
  const { config, player, decisionStyle } = input;
  const round = input.round ?? 1;
  const history = input.history ?? [];

  const relationship = config.relationshipsEnabled
    ? (player === "a" ? config.relationshipA : config.relationshipB)?.trim()
    : undefined;

  const question = await render("prisoners-dilemma/question");

  const sections = [
    await render(`prisoners-dilemma/variant-${config.variant}`),
    await render("prisoners-dilemma/crime", { crime: config.crime }),
    relationship ? await render("prisoners-dilemma/relationship", { relationship }) : null,
    await renderPayoffs(config, player),
    config.iterations > 1
      ? await render("prisoners-dilemma/history", {
          round,
          total: config.iterations,
          rounds: history.map((entry) => ({
            round: entry.round,
            you: labelFor(entry.you),
            partner: labelFor(entry.partner),
          })),
        })
      : null,
    question,
    await renderDecisionInstructions(PRISONERS_DILEMMA_OPTIONS, decisionStyle),
  ];

  return {
    user: joinSections(sections),
    options: [...PRISONERS_DILEMMA_OPTIONS],
    question: question.trim(),
  };
}
