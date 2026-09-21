import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { RunConfig } from "@/lib/domain/run";

import {
  appendLog,
  appendSpan,
  cancelRun,
  createRun,
  failRun,
  finishRun,
  getRun,
  listLogs,
  listRuns,
  listSpans,
  updateRunProgress,
  updateRunSummary,
  updateSpan,
} from "./runs";
import { useTempDataDir, type TempStore } from "./test-utils";

const trolleyConfig: RunConfig = {
  puzzle: "trolley",
  variant: "bystander",
  track1: ["cow"],
  track2: ["money"],
  roster: [{ characterId: "zeno", runs: 3 }],
};

const dilemmaConfig: RunConfig = {
  puzzle: "prisoners-dilemma",
  variant: "interrogation",
  playerA: "zeno",
  playerB: "hume",
  relationshipsEnabled: false,
  crime: "a heist",
  payoffs: { symmetric: true, bothTestify: "2 years", bothSilent: "1 year", onlyTestifier: "walk free", onlySilent: "5 years" },
  iterations: 1,
  runs: 1,
};

describe("run store", () => {
  let store: TempStore;

  beforeEach(async () => {
    store = await useTempDataDir();
  });

  afterEach(async () => {
    await store.cleanup();
  });

  it("creates a queued run and reads it back", async () => {
    const run = await createRun({ config: trolleyConfig, total: 3 });
    expect(run.status).toBe("queued");
    expect(run.progress).toEqual({ done: 0, total: 3 });
    expect(await getRun(run.id)).toEqual(run);
  });

  it("replays progress, finish, failure and cancellation", async () => {
    const run = await createRun({ config: trolleyConfig, total: 3 });
    await updateRunProgress(run.id, { done: 1, total: 3 });
    expect((await getRun(run.id))?.status).toBe("running");

    await finishRun(run.id, { track1: 2, track2: 1 });
    const finished = await getRun(run.id);
    expect(finished?.status).toBe("finished");
    expect(finished?.summary).toEqual({ track1: 2, track2: 1 });
    expect(finished?.progress.done).toBe(3);

    const failing = await createRun({ config: trolleyConfig, total: 1 });
    await failRun(failing.id, "the provider refused");
    expect((await getRun(failing.id))?.error).toBe("the provider refused");

    const cancelled = await createRun({ config: trolleyConfig, total: 1 });
    await cancelRun(cancelled.id);
    expect((await getRun(cancelled.id))?.status).toBe("cancelled");
  });

  it("rewrites the summary without changing the status", async () => {
    const run = await createRun({ config: trolleyConfig, total: 3 });
    await updateRunProgress(run.id, { done: 1, total: 3 });
    await updateRunSummary(run.id, { kind: "trolley", decisions: [1] });

    const running = await getRun(run.id);
    expect(running?.status).toBe("running");
    expect(running?.summary).toEqual({ kind: "trolley", decisions: [1] });

    await updateRunSummary(run.id, { kind: "trolley", decisions: [1, 2] });
    expect((await getRun(run.id))?.summary).toEqual({ kind: "trolley", decisions: [1, 2] });
  });

  it("lists runs newest first and filters them", async () => {
    const first = await createRun({ config: trolleyConfig, total: 1 });
    await new Promise((resolve) => setTimeout(resolve, 2));
    const second = await createRun({ config: dilemmaConfig, total: 1 });

    expect((await listRuns()).map((run) => run.id)).toEqual([second.id, first.id]);
    expect((await listRuns({ puzzle: "trolley" })).map((run) => run.id)).toEqual([first.id]);
    expect((await listRuns({ characterId: "hume" })).map((run) => run.id)).toEqual([second.id]);
    expect((await listRuns({ status: "queued", limit: 1 })).map((run) => run.id)).toEqual([second.id]);
    expect(await listRuns({ characterId: "nobody" })).toEqual([]);
  });

  it("merges span patches by spanId", async () => {
    const run = await createRun({ config: trolleyConfig, total: 1 });
    await appendSpan(run.id, {
      spanId: "s1",
      name: "provider-call",
      startedAt: "2026-01-01T00:00:00.000Z",
      status: "running",
      input: { model: "test" },
    });
    await updateSpan(run.id, "s1", {
      status: "ok",
      endedAt: "2026-01-01T00:00:01.000Z",
      decision: { choice: "track2", latencyMs: 42 },
    });

    const spans = await listSpans(run.id);
    expect(spans).toHaveLength(1);
    expect(spans[0]).toMatchObject({
      spanId: "s1",
      status: "ok",
      input: { model: "test" },
      decision: { choice: "track2", latencyMs: 42 },
    });
  });

  it("appends and filters logs", async () => {
    const run = await createRun({ config: trolleyConfig, total: 1 });
    await appendLog(run.id, "info", "started");
    await appendLog(run.id, "error", "boom", { code: 500 });

    expect(await listLogs(run.id)).toHaveLength(2);
    expect((await listLogs(run.id, { level: "error" }))[0]?.data).toEqual({ code: 500 });
    expect((await listLogs(run.id, { limit: 1 }))[0]?.message).toBe("boom");
  });
});
