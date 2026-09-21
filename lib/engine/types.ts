/**
 * The contract between the engine and a puzzle.
 *
 * A puzzle knows how to turn its configuration into decisions; the engine knows
 * how to trace them, count them and store them. The two meet at
 * {@link DecisionEvent}: a puzzle yields one per decision it has finished, and
 * the engine does the same three things with every one of them whatever the
 * puzzle — write the spans, fold it into the summary, persist progress.
 *
 * `path` is what makes the span tree generic. Each event names the chain of
 * spans it belongs under (character, then iteration, or game then round, or
 * iteration then node); the engine opens each segment the first time it is
 * mentioned and closes it when the run ends.
 */
import type { LogLevel, SpanName } from "@/lib/domain/span";
import type { RunSummary } from "@/lib/domain/summary";
import type { DecisionRecord, ProviderCallRecord } from "@/lib/providers/types";

/** One span between the run span and the decision. */
export type SpanPathSegment = {
  /** Unique among its siblings. Two events with the same chain share a span. */
  key: string;
  name: SpanName;
  characterId?: string;
  iteration?: number;
  nodeId?: string;
};

/**
 * The span chain shared by every puzzle that runs a character a number of times:
 * the character, then the iteration. An adventure appends its node segment to it.
 */
export function characterIterationPath(characterId: string, iteration: number): SpanPathSegment[] {
  return [
    { key: characterId, name: "character", characterId },
    { key: String(iteration), name: "iteration", characterId, iteration },
  ];
}

/** One finished decision, with everything needed to record it. */
export type DecisionEvent<TData> = {
  /** Span chain under the run span; the last segment holds the decision. */
  path: SpanPathSegment[];
  /** Every upstream round trip the decision took, retries and fallbacks included. */
  calls: ProviderCallRecord[];
  /** Absent when the decision failed. */
  decision?: DecisionRecord;
  error?: string;
  startedAt: string;
  endedAt: string;
  /** What the puzzle's reducer needs to place this decision. */
  data: TData;
  /**
   * How much of `progress.total` this event completes. Defaults to 1; an
   * adventure step that is not the last of its path contributes 0, because a
   * path is the unit of progress there.
   */
  progress?: number;
};

/** What a runner is given: cancellation, the run's log, and how wide to go. */
export type RunnerContext = {
  signal: AbortSignal;
  log(level: LogLevel, message: string, data?: unknown): Promise<void>;
  concurrency: number;
};

/**
 * One puzzle's half of a run. `reduce` must be pure: the engine keeps the
 * summary in memory and persists the result of every call.
 */
export type PuzzleRunner<TData, TSummary extends RunSummary> = {
  /** Decisions the run expects to make, for the progress bar. */
  total: number;
  emptySummary(): TSummary;
  reduce(summary: TSummary, event: DecisionEvent<TData>): TSummary;
  decisions(ctx: RunnerContext): AsyncGenerator<DecisionEvent<TData>>;
};
