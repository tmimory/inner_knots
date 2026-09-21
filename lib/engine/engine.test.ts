import fs from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CharacterInput } from "@/lib/domain/character";
import type { RunConfig } from "@/lib/domain/run";
import { parseRunSummary } from "@/lib/domain/summary";
import { ProviderError, type DecisionRequest, type TraceContext } from "@/lib/providers/types";
import { characters, trolleyObjects } from "@/lib/storage/collections";
import { runsIndexFile } from "@/lib/storage/paths";
import { cancelRun, createRun, getRun, listLogs, listSpans } from "@/lib/storage/runs";
import { useTempDataDir, type TempStore } from "@/lib/storage/test-utils";

const mocks = vi.hoisted(() => ({ decide: vi.fn() }));

vi.mock("@/lib/providers/factory", () => ({
  createProvider: (id: string) => ({
    id,
    label: id,
    listModels: async () => [],
    decide: mocks.decide,
  }),
}));

const { executeRun } = await import("./engine");

function character(id: string): CharacterInput {
  return {
    id,
    avatar: { shape: "owl", color: "rubric" },
    provider: "local",
    model: "anything",
    outputMode: "structured",
    steering: { mode: "bio", bio: `${id}, a philosopher`, principles: [], values: [] },
  };
}

const config: RunConfig = {
  puzzle: "trolley",
  variant: "bystander",
  track1: ["one-cow"],
  track2: ["one-pile-of-money"],
  roster: [
    { characterId: "zeno", runs: 2 },
    { characterId: "hume", runs: 1 },
  ],
};

/** Answers every call with `choice`, recording one provider call as an adapter would. */
function answerWith(choice: string): void {
  mocks.decide.mockImplementation(async (request: DecisionRequest, ctx?: TraceContext) => {
    await ctx?.onCall?.({
      provider: "local",
      model: request.model,
      outputMode: request.outputMode,
      request: { model: request.model, system: request.system, messages: request.messages },
      response: { choice },
      startedAt: "2026-01-01T00:00:00.000Z",
      endedAt: "2026-01-01T00:00:01.000Z",
    });
    return { choice, latencyMs: 7, weights: { track1: 0.6, track2: 0.4 } };
  });
}

/** Every line of the run index, so the order events were written can be asserted. */
function indexEvents(): { type: string }[] {
  return fs
    .readFileSync(runsIndexFile(), "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as { type: string });
}

describe("run engine", () => {
  let store: TempStore;

  beforeEach(async () => {
    store = await useTempDataDir();
    mocks.decide.mockReset();
    answerWith("track1");
    await characters.upsert(character("zeno"));
    await characters.upsert(character("hume"));
    await trolleyObjects.upsert({
      id: "one-cow",
      label: "A cow",
      prompt: "a cow",
      icon: "cow",
      builtIn: false,
      tags: [],
    });
    await trolleyObjects.upsert({
      id: "one-pile-of-money",
      label: "A million dollars",
      prompt: "a million dollars",
      icon: "money",
      builtIn: false,
      tags: [],
    });
  });

  afterEach(async () => {
    await store.cleanup();
  });

  it("runs a trolley configuration end to end", async () => {
    const run = await createRun({ config, total: 3 });
    await executeRun(run);

    const finished = await getRun(run.id);
    expect(finished?.status).toBe("finished");
    expect(finished?.progress).toEqual({ done: 3, total: 3 });
    expect(mocks.decide).toHaveBeenCalledTimes(3);

    const summary = parseRunSummary(finished?.summary);
    expect(summary?.kind).toBe("trolley");
    if (summary?.kind !== "trolley") throw new Error("expected a trolley summary");
    expect(summary.decisions).toHaveLength(3);
    expect(summary.perCharacter.zeno).toMatchObject({ track1: 2, track2: 0, errors: 0 });
    expect(summary.perCharacter.hume).toMatchObject({ track1: 1, track2: 0, errors: 0 });
    expect(summary.perCharacter.zeno?.meanWeights?.track1).toBeCloseTo(0.6);
  });

  it("writes the span tree, with the request and response on every provider call", async () => {
    const run = await createRun({ config, total: 3 });
    await executeRun(run);

    const spans = await listSpans(run.id);
    const byId = new Map(spans.map((span) => [span.spanId, span]));
    const root = spans.find((span) => span.name === "run");
    expect(root?.parentSpanId).toBeUndefined();
    expect(root?.status).toBe("ok");

    const characterSpans = spans.filter((span) => span.name === "character");
    expect(characterSpans.map((span) => span.characterId).sort()).toEqual(["hume", "zeno"]);
    expect(characterSpans.every((span) => span.parentSpanId === root?.spanId)).toBe(true);

    const iterations = spans.filter((span) => span.name === "iteration");
    expect(iterations).toHaveLength(3);
    expect(iterations.every((span) => byId.get(span.parentSpanId ?? "")?.name === "character")).toBe(true);
    expect(iterations.every((span) => span.decision?.choice === "track1")).toBe(true);
    expect(iterations.every((span) => span.status === "ok" && span.endedAt !== undefined)).toBe(true);

    const calls = spans.filter((span) => span.name === "provider-call");
    expect(calls).toHaveLength(3);
    expect(calls.every((span) => byId.get(span.parentSpanId ?? "")?.name === "iteration")).toBe(true);
    const first = calls[0];
    expect(first?.input).toMatchObject({ model: "anything" });
    expect(first?.output).toEqual({ choice: "track1" });
    expect(first?.decision).toMatchObject({ choice: "track1", latencyMs: 7 });
  });

  it("persists a partial summary as it goes, before the run finishes", async () => {
    const run = await createRun({ config, total: 3 });
    await executeRun(run);

    const types = indexEvents().map((event) => event.type);
    const finishedAt = types.indexOf("finished");
    expect(finishedAt).toBeGreaterThan(-1);
    expect(types.slice(0, finishedAt).filter((type) => type === "summary").length).toBeGreaterThan(1);
    expect(types.slice(0, finishedAt).filter((type) => type === "progress").length).toBeGreaterThan(1);
  });

  it("records a failing decision without failing the run", async () => {
    mocks.decide.mockImplementation(async (request: DecisionRequest) => {
      if (request.system?.includes("hume")) {
        throw new ProviderError("local", "the model refused", { retryable: false });
      }
      return { choice: "track2", latencyMs: 3 };
    });

    const run = await createRun({ config, total: 3 });
    await executeRun(run);

    const finished = await getRun(run.id);
    expect(finished?.status).toBe("finished");
    expect(finished?.progress.done).toBe(3);

    const summary = parseRunSummary(finished?.summary);
    if (summary?.kind !== "trolley") throw new Error("expected a trolley summary");
    expect(summary.perCharacter.hume).toMatchObject({ track1: 0, track2: 0, errors: 1 });
    expect(summary.perCharacter.zeno).toMatchObject({ track2: 2, errors: 0 });

    const spans = await listSpans(run.id);
    const failed = spans.find((span) => span.name === "iteration" && span.characterId === "hume");
    expect(failed?.status).toBe("error");
    expect(failed?.error).toBe("the model refused");
    expect(spans.find((span) => span.name === "run")?.status).toBe("ok");
    expect((await listLogs(run.id, { level: "error" })).length).toBe(1);
  });

  it("fails the run when its configuration cannot be resolved", async () => {
    const run = await createRun({
      config: { ...config, roster: [{ characterId: "nobody", runs: 1 }] },
      total: 1,
    });
    await executeRun(run);

    const failed = await getRun(run.id);
    expect(failed?.status).toBe("failed");
    expect(failed?.error).toContain("nobody");
    expect(mocks.decide).not.toHaveBeenCalled();
  });

  it("stops when a cancellation is written to the store by another request", async () => {
    const run = await createRun({ config, total: 3 });
    mocks.decide.mockImplementation(async () => {
      // What `POST /api/runs/:id/cancel` does, from outside this run's process.
      await cancelRun(run.id);
      return { choice: "track1", latencyMs: 1 };
    });

    await executeRun(run);

    const cancelled = await getRun(run.id);
    expect(cancelled?.status).toBe("cancelled");
    expect(cancelled?.progress.done).toBeLessThan(3);
    expect((await listLogs(run.id)).some((line) => line.message.includes("cancellation"))).toBe(true);
  });

  it("does not report itself finished when it was cancelled before it started", async () => {
    const run = await createRun({ config, total: 3 });
    await cancelRun(run.id);

    const controller = new AbortController();
    controller.abort();
    await executeRun(run, { signal: controller.signal });

    expect(mocks.decide).not.toHaveBeenCalled();
    expect((await getRun(run.id))?.status).toBe("cancelled");
  });

  it("stops between decisions when cancelled in process and keeps what it has", async () => {
    const controller = new AbortController();
    mocks.decide.mockImplementation(async () => {
      controller.abort();
      return { choice: "track1", latencyMs: 1 };
    });

    const run = await createRun({ config, total: 3 });
    await executeRun(run, { signal: controller.signal });

    const cancelled = await getRun(run.id);
    expect(cancelled?.status).toBe("cancelled");
    expect(cancelled?.progress.done).toBeLessThan(3);

    const summary = parseRunSummary(cancelled?.summary);
    if (summary?.kind !== "trolley") throw new Error("expected a trolley summary");
    expect(summary.decisions.length).toBeLessThan(3);
    expect(summary.decisions.length).toBeGreaterThan(0);
  });
});
