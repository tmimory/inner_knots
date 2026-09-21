/**
 * Folding trolley decisions into the summary the screens read.
 *
 * `reduce` is pure and total: it never drops a decision, and a decision that
 * failed still lands in `decisions` (with its error) and in the character's
 * `errors` tally, because "this model would not answer" is a finding about the
 * model. The per-character tallies are recomputed from the decisions rather than
 * kept as running counters, so folding the same events twice cannot drift.
 */
import type { TrolleyConfig } from "@/lib/domain/run";
import {
  TROLLEY_CHOICES,
  tallyChoices,
  type TrolleyCharacterTally,
  type TrolleyChoice,
  type TrolleyDecisionSummary,
  type TrolleySummary,
} from "@/lib/domain/summary";
import type { DecisionEvent } from "@/lib/engine/types";

/** What the trolley runner attaches to each event. */
export type TrolleyEventData = {
  characterId: string;
  /** 1-based index within that character's run count. */
  iteration: number;
};

export type TrolleyDecisionEvent = DecisionEvent<TrolleyEventData>;

function asChoice(value: string | undefined): TrolleyChoice | undefined {
  return TROLLEY_CHOICES.find((choice) => choice === value);
}

/** The zero summary: every character on the roster present, with nothing counted yet. */
export function emptySummary(config: Pick<TrolleyConfig, "roster">): TrolleySummary {
  const perCharacter: Record<string, TrolleyCharacterTally> = {};
  for (const entry of config.roster) {
    perCharacter[entry.characterId] = { track1: 0, track2: 0, errors: 0 };
  }
  return { kind: "trolley", decisions: [], perCharacter };
}

/** Adds one finished decision to the summary. */
export function reduce(summary: TrolleySummary, event: TrolleyDecisionEvent): TrolleySummary {
  const { characterId, iteration } = event.data;
  const decisions: TrolleyDecisionSummary[] = [
    ...summary.decisions,
    {
      characterId,
      iteration,
      choice: asChoice(event.decision?.choice),
      weights: event.decision?.weights,
      confidence: event.decision?.confidence,
      latencyMs: event.decision?.latencyMs,
      error: event.error,
    },
  ];

  return {
    ...summary,
    decisions,
    perCharacter: {
      ...summary.perCharacter,
      [characterId]: tallyChoices(
        decisions.filter((entry) => entry.characterId === characterId),
        TROLLEY_CHOICES,
      ),
    },
  };
}
