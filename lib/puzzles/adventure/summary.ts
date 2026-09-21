/**
 * Folding adventure steps into the summary the screens read.
 *
 * A walk arrives one node at a time, so each event extends the path it belongs
 * to rather than replacing it, and the visit counts the React Flow overlay draws
 * (`nodeHits`, `optionHits`) are recomputed from the paths. `terminal` says the
 * walk ended where the graph said it should; a path that stopped because a
 * decision failed or because the step limit was reached is not terminal, and the
 * difference is visible in `perCharacter.completed`.
 */
import type { AdventureConfig } from "@/lib/domain/run";
import {
  type AdventureCharacterTally,
  type AdventurePathSummary,
  type AdventureStepSummary,
  type AdventureSummary,
} from "@/lib/domain/summary";
import type { DecisionEvent } from "@/lib/engine/types";

/** What the adventure runner attaches to each event. */
export type AdventureEventData = {
  characterId: string;
  /** 1-based index within that character's run count. */
  iteration: number;
  nodeId: string;
  /** True when this step ends the walk, whether by arriving or by giving up. */
  last: boolean;
  /** True when the walk ended on an option that leads nowhere, as designed. */
  terminal: boolean;
};

export type AdventureDecisionEvent = DecisionEvent<AdventureEventData>;

/** The zero summary: every character on the roster present, with no walks yet. */
export function emptySummary(config: Pick<AdventureConfig, "roster">): AdventureSummary {
  const perCharacter: Record<string, AdventureCharacterTally> = {};
  for (const entry of config.roster) perCharacter[entry.characterId] = { completed: 0, errors: 0 };
  return { kind: "adventure", paths: [], nodeHits: {}, optionHits: {}, perCharacter };
}

function countHits(paths: readonly AdventurePathSummary[]): Pick<AdventureSummary, "nodeHits" | "optionHits"> {
  const nodeHits: Record<string, number> = {};
  const optionHits: Record<string, Record<string, number>> = {};

  for (const step of paths.flatMap((path) => path.steps)) {
    nodeHits[step.nodeId] = (nodeHits[step.nodeId] ?? 0) + 1;
    if (step.optionId === undefined) continue;
    const perNode = optionHits[step.nodeId] ?? {};
    perNode[step.optionId] = (perNode[step.optionId] ?? 0) + 1;
    optionHits[step.nodeId] = perNode;
  }

  return { nodeHits, optionHits };
}

function tally(paths: readonly AdventurePathSummary[]): AdventureCharacterTally {
  return {
    completed: paths.filter((path) => path.terminal).length,
    errors: paths.flatMap((path) => path.steps).filter((step) => step.error !== undefined).length,
  };
}

/** Adds one finished step to the walk it belongs to. */
export function reduce(summary: AdventureSummary, event: AdventureDecisionEvent): AdventureSummary {
  const { characterId, iteration, nodeId, terminal } = event.data;
  const step: AdventureStepSummary = {
    nodeId,
    optionId: event.decision?.choice,
    weights: event.decision?.weights,
    confidence: event.decision?.confidence,
    latencyMs: event.decision?.latencyMs,
    error: event.error,
  };

  const index = summary.paths.findIndex(
    (path) => path.characterId === characterId && path.iteration === iteration,
  );
  const existing = summary.paths[index] ?? { characterId, iteration, steps: [], terminal: false };
  const updated: AdventurePathSummary = {
    ...existing,
    steps: [...existing.steps, step],
    terminal,
  };

  const paths = index === -1 ? [...summary.paths, updated] : summary.paths.map((path, position) => (position === index ? updated : path));

  return {
    ...summary,
    paths,
    ...countHits(paths),
    perCharacter: {
      ...summary.perCharacter,
      [characterId]: tally(paths.filter((path) => path.characterId === characterId)),
    },
  };
}
