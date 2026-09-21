/**
 * The run engine: everything that happens between "start this run" and a summary.
 *
 * The engine knows nothing about trolleys or prisoners. A puzzle yields
 * {@link DecisionEvent}s and the engine does the same four things with each one,
 * in this order: write its spans, fold it into the summary, persist progress
 * *and the partial summary*, and log it. Persisting the summary after every
 * decision is what lets a screen animate a run while it is still going — a
 * poller sees the histogram fill rather than appear at the end.
 *
 * Failure is asymmetric on purpose. A decision that fails is recorded on its span
 * and counted in the summary, and the run continues: a model that refuses is
 * data. Only a failure to set the run up — an unknown character, an adventure
 * that does not validate — fails the run itself.
 */
import { newId } from "@/lib/domain/id";
import type { Run } from "@/lib/domain/run";
import type { LogLevel, SpanStatus } from "@/lib/domain/span";
import type { RunSummary } from "@/lib/domain/summary";
import { errorMessage } from "@/lib/errors";
import { createAdventureRunner } from "@/lib/puzzles/adventure/runner";
import { createPrisonersDilemmaRunner } from "@/lib/puzzles/prisoners-dilemma/runner";
import { createTrolleyRunner } from "@/lib/puzzles/trolley/runner";
import {
  appendLog,
  appendSpan,
  cancelRun,
  failRun,
  finishRun,
  updateRunProgress,
  updateRunSummary,
  updateSpan,
} from "@/lib/storage/runs";

import { cancellationRequested, watchForCancellation } from "./cancellation";
import { runConcurrency } from "./env";
import { prepareRun } from "./setup";
import type { DecisionEvent, PuzzleRunner, RunnerContext, SpanPathSegment } from "./types";

/** A span the engine has opened and will close when the run ends. */
type OpenSpan = {
  spanId: string;
  /** Decisions underneath it that produced an answer, and that did not. */
  ok: number;
  failed: number;
  endedAt: string;
  /** Leaf spans are closed with their decision as soon as it lands. */
  closed: boolean;
};

export type ExecuteRunOptions = {
  /**
   * Aborting it stops the run between decisions and marks it cancelled. It is the
   * in-process fast path; a cancellation asked for by another request is noticed
   * through the store (see `./cancellation`).
   */
  signal?: AbortSignal;
};

/** A span's status from what happened underneath it: an error only if nothing worked. */
function statusOf(span: OpenSpan): SpanStatus {
  return span.ok > 0 || span.failed === 0 ? "ok" : "error";
}

/** Executes a queued run to completion, writing spans, logs, progress and summaries. */
export async function executeRun(run: Run, options: ExecuteRunOptions = {}): Promise<void> {
  // The engine's own controller: it is aborted by the caller's signal, and by a
  // cancellation found in the store, so runners have one thing to watch.
  const stop = new AbortController();
  if (options.signal?.aborted) stop.abort();
  else options.signal?.addEventListener("abort", () => stop.abort());

  const log = async (level: LogLevel, message: string, data?: unknown): Promise<void> => {
    await appendLog(run.id, level, message, data);
  };

  const rootSpanId = newId("span");
  await appendSpan(run.id, {
    spanId: rootSpanId,
    name: "run",
    startedAt: new Date().toISOString(),
    status: "running",
  });
  await log("info", "run started", { puzzle: run.puzzle, total: run.progress.total });

  let plan;
  try {
    plan = await prepareRun(run.config);
  } catch (error) {
    const message = errorMessage(error);
    await updateSpan(run.id, rootSpanId, {
      status: "error",
      endedAt: new Date().toISOString(),
      error: message,
    });
    await log("error", "the run could not be set up", { error: message });
    await failRun(run.id, message);
    return;
  }

  const context: RunnerContext = { signal: stop.signal, log, concurrency: runConcurrency() };

  switch (plan.puzzle) {
    case "trolley":
      return drive(run, rootSpanId, createTrolleyRunner(plan), context, stop);
    case "prisoners-dilemma":
      return drive(run, rootSpanId, createPrisonersDilemmaRunner(plan), context, stop);
    case "adventure":
      return drive(run, rootSpanId, createAdventureRunner(plan), context, stop);
  }
}

/**
 * Consumes one runner's decisions. Generic over the puzzle so the summary and the
 * event payload stay typed end to end; nothing here is cast.
 */
async function drive<TData, TSummary extends RunSummary>(
  run: Run,
  rootSpanId: string,
  runner: PuzzleRunner<TData, TSummary>,
  ctx: RunnerContext,
  stop: AbortController,
): Promise<void> {
  const cancelled = watchForCancellation(run.id);
  const open = new Map<string, OpenSpan>();
  let summary = runner.emptySummary();
  let done = 0;
  let failure: string | undefined;

  await updateRunProgress(run.id, { done: 0, total: runner.total }, "running");
  await updateRunSummary(run.id, summary);

  try {
    for await (const event of runner.decisions(ctx)) {
      await writeSpans(run.id, rootSpanId, open, event);

      summary = runner.reduce(summary, event);
      done = Math.min(done + (event.progress ?? 1), runner.total);
      await updateRunProgress(run.id, { done, total: runner.total }, "running");
      await updateRunSummary(run.id, summary);

      const leaf = event.path[event.path.length - 1];
      const where = { characterId: leaf?.characterId, iteration: leaf?.iteration, nodeId: leaf?.nodeId };
      if (event.error === undefined) {
        await ctx.log("info", "a decision was recorded", { ...where, choice: event.decision?.choice });
      } else {
        await ctx.log("error", "a decision failed", { ...where, error: event.error });
      }

      if (!stop.signal.aborted && (await cancelled())) {
        await ctx.log("info", "a cancellation was requested", { done, total: runner.total });
        stop.abort();
      }
      if (stop.signal.aborted) break;
    }
  } catch (error) {
    failure = errorMessage(error);
  }

  const endedAt = new Date().toISOString();
  for (const span of open.values()) {
    if (span.closed) continue;
    await updateSpan(run.id, span.spanId, { status: statusOf(span), endedAt: span.endedAt });
  }

  if (failure !== undefined) {
    await updateSpan(run.id, rootSpanId, { status: "error", endedAt, error: failure });
    await ctx.log("error", "the run stopped on an unexpected failure", { error: failure });
    await failRun(run.id, failure);
    return;
  }

  // One last look, for a cancellation that arrived during the final decision or
  // before the first one: a run must never report itself finished after that.
  if (stop.signal.aborted || (await cancellationRequested(run.id))) {
    await updateSpan(run.id, rootSpanId, { status: "ok", endedAt });
    await ctx.log("info", "the run was cancelled", { done, total: runner.total });
    await cancelRun(run.id);
    return;
  }

  await updateSpan(run.id, rootSpanId, { status: "ok", endedAt });
  await ctx.log("info", "run finished", { done, total: runner.total });
  await finishRun(run.id, summary);
}

/**
 * Writes one event into the span tree: opens whatever part of its path does not
 * exist yet, appends one span per provider call underneath it, and closes the
 * span the decision belongs to.
 */
async function writeSpans<TData>(
  runId: string,
  rootSpanId: string,
  open: Map<string, OpenSpan>,
  event: DecisionEvent<TData>,
): Promise<void> {
  let parentSpanId = rootSpanId;
  let key = "";
  let leafSpan: OpenSpan | undefined;
  let leafSegment: SpanPathSegment | undefined;

  for (const segment of event.path) {
    key = `${key}/${segment.key}`;
    let span = open.get(key);
    if (!span) {
      const spanId = newId("span");
      await appendSpan(runId, {
        spanId,
        parentSpanId,
        name: segment.name,
        characterId: segment.characterId,
        iteration: segment.iteration,
        nodeId: segment.nodeId,
        startedAt: event.startedAt,
        status: "running",
      });
      span = { spanId, ok: 0, failed: 0, endedAt: event.endedAt, closed: false };
      open.set(key, span);
    }

    if (event.error === undefined) span.ok += 1;
    else span.failed += 1;
    span.endedAt = event.endedAt;

    parentSpanId = span.spanId;
    leafSpan = span;
    leafSegment = segment;
  }

  // The decision belongs to the last successful call; a retry leaves both records.
  const lastSuccess = event.calls.reduce(
    (index, record, position) => (record.error === undefined ? position : index),
    -1,
  );

  for (const [position, record] of event.calls.entries()) {
    await appendSpan(runId, {
      spanId: newId("span"),
      parentSpanId,
      name: "provider-call",
      characterId: leafSegment?.characterId,
      iteration: leafSegment?.iteration,
      nodeId: leafSegment?.nodeId,
      startedAt: record.startedAt,
      endedAt: record.endedAt,
      status: record.error === undefined ? "ok" : "error",
      input: record.request,
      output: record.response,
      decision: position === lastSuccess ? event.decision : undefined,
      error: record.error,
    });
  }

  if (!leafSpan) return;
  leafSpan.closed = true;
  await updateSpan(runId, leafSpan.spanId, {
    status: event.error === undefined ? "ok" : "error",
    endedAt: event.endedAt,
    decision: event.decision,
    error: event.error,
  });
}
