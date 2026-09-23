/**
 * Assembles one turn of the St. Petersburg coin.
 *
 * The prompt is rebuilt from scratch on every turn rather than appended to,
 * because the only thing that changes between turns is which flip this is and
 * how the coin has come down so far: the voice's terms are restated each time,
 * exactly as they were the first time.
 *
 * Two framings open it — a thought experiment and the encounter — and the terms
 * read the same after either. A face's payoff reaches the terms as a rendered
 * clause rather than raw text, so prose, money and the forfeit all land in the
 * same sentence. Money is the one thing the engine does arithmetic on: when a
 * face is priced the history carries what each toss won and the pot as it
 * stands, because a sum the voice itself would have named is not the model's
 * homework. A coin whose faces are prose gets no pot at all.
 */
import type { DecisionStyle } from "@/lib/domain/enums";
import type { CoinFace, CoinPayoff, StPetersburgConfig } from "@/lib/domain/run";
import { formatMoney } from "@/lib/format";
import { render } from "@/lib/prompts/compose";

import { joinSections, renderDecisionInstructions, type PromptOption, type PuzzlePrompt } from "../types";
import { isPriced, payoutFor } from "./payoff";

/** The two answers available on every turn. */
export const ST_PETERSBURG_OPTIONS: readonly PromptOption[] = [
  { id: "flip", label: "Flip the coin" },
  { id: "walk", label: "Walk away" },
] as const;

/** One flip already made: how it landed and what it did to the pot, if anything. */
export type TossRecord = { flip: number; face: CoinFace; won?: number };

/** What the prompt needs from the config; the roster plays no part in it. */
export type StPetersburgPromptConfig = Pick<StPetersburgConfig, "variant" | "faces" | "maxFlips">;

export type StPetersburgPromptInput = {
  config: StPetersburgPromptConfig;
  decisionStyle: DecisionStyle;
  /** 1-based turn number. Defaults to the first turn. */
  flip?: number;
  /** The flips already made, oldest first. Empty on turn 1. */
  history?: readonly TossRecord[];
};

/** One face's payoff as the voice states it in the terms. */
function payoffClause(payoff: CoinPayoff): Promise<string> {
  switch (payoff.kind) {
    case "text":
      return render("st-petersburg/payoff-text", { text: payoff.text });
    case "amount":
      // The first three flips are spelled out, which is what makes the doubling
      // concrete; "and so on" carries the rest.
      return render("st-petersburg/payoff-amount", {
        amount: formatMoney(payoff.amount),
        doubles: payoff.doubles,
        second: formatMoney(payoff.amount * 2),
        third: formatMoney(payoff.amount * 4),
      });
    case "forfeit":
      return render("st-petersburg/payoff-forfeit");
  }
}

/** What one toss did, as the history lists it. `pot` is the pot before this toss. */
function outcomeClause(payoff: CoinPayoff, won: number | undefined, pot: number): Promise<string> {
  switch (payoff.kind) {
    case "text":
      return Promise.resolve(payoff.text);
    case "amount":
      return render("st-petersburg/toss-won", { amount: formatMoney(won ?? 0) });
    case "forfeit":
      return render("st-petersburg/toss-forfeit", { amount: formatMoney(pot) });
  }
}

/** Builds the prompt for one turn of one game. */
export async function buildStPetersburgPrompt(input: StPetersburgPromptInput): Promise<PuzzlePrompt> {
  const { config, decisionStyle } = input;
  const flip = input.flip ?? 1;
  const history = input.history ?? [];

  // The pot is replayed from the history rather than passed in, so a preview and
  // a live turn compose the same prompt from the same facts.
  let pot = 0;
  const tosses: { flip: number; face: CoinFace; outcome: string }[] = [];
  for (const toss of history) {
    const payoff = config.faces[toss.face].payoff;
    const won = toss.won ?? payoutFor(payoff, toss.flip, pot);
    tosses.push({ flip: toss.flip, face: toss.face, outcome: await outcomeClause(payoff, won, pot) });
    pot += won ?? 0;
  }

  const question = await render("st-petersburg/question");

  const sections = [
    await render(`st-petersburg/variant-${config.variant}`),
    await render("st-petersburg/terms", {
      heads: await payoffClause(config.faces.heads.payoff),
      tails: await payoffClause(config.faces.tails.payoff),
      headsEnds: config.faces.heads.endsGame,
      tailsEnds: config.faces.tails.endsGame,
      maxFlips: config.maxFlips,
    }),
    await render("st-petersburg/history", {
      flip,
      maxFlips: config.maxFlips,
      tosses,
      // Empty for a coin nobody can count, which drops the line entirely.
      pot: isPriced(config.faces) ? formatMoney(pot) : "",
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
