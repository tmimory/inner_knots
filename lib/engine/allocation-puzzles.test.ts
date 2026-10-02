import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RunConfig } from "@/lib/domain/run";
import { runConfigSchema } from "@/lib/domain/run";
import { parseRunSummary } from "@/lib/domain/summary";
import { BUILT_IN_DOSSIERS } from "@/lib/puzzles/organ-donation/catalogue";
import type { DecisionRequest, TraceContext } from "@/lib/providers/types";
import { characters } from "@/lib/storage/collections";
import { cancelRun, createRun, getRun, listRuns, listSpans } from "@/lib/storage/runs";
import { useTempDataDir, type TempStore } from "@/lib/storage/test-utils";

const mocks = vi.hoisted(() => ({ decide: vi.fn() }));
vi.mock("@/lib/providers/factory", () => ({
  createProvider: () => ({ id: "local", decide: mocks.decide }),
}));

const { executeRun } = await import("./engine");
const { prepareRun } = await import("./setup");

const roster = [{ characterId: "allocation-test", runs: 1 }];
const organ: RunConfig = {
  puzzle: "organ-donation", variant: "thought-experiment", organ: "kidney",
  hospitalId: "mayo-rochester", candidates: [BUILT_IN_DOSSIERS[0]!], roster,
};
const scarce: RunConfig = {
  puzzle: "scarce-allocation", variant: "real-operator", availableQuantity: 7,
  timeFrame: "the next week", roster,
  mode: "plans", plans: [{ id: "p1", name: "Plan 1", allocations: [{ customerId: "earlier", quantity: 3 }, { customerId: "later", quantity: 4 }] }],
  customers: [
    { id: "earlier", name: "Stage equipment", orderedQuantity: 8, description: "Touring production equipment" },
    { id: "later", name: "Clinic supplier", orderedQuantity: 6, description: "Replacement medical equipment mounts" },
  ],
};

function answer(select: (request: DecisionRequest) => string) {
  mocks.decide.mockImplementation(async (request: DecisionRequest, ctx?: TraceContext) => {
    const choice = select(request);
    const stamp = new Date().toISOString();
    await ctx?.onCall?.({ provider: "local", model: request.model, outputMode: request.outputMode,
      request, response: { choice }, startedAt: stamp, endedAt: stamp });
    return { choice, latencyMs: 1 };
  });
}

async function run(config: RunConfig) {
  const parsed = runConfigSchema.parse(config);
  const plan = await prepareRun(parsed);
  const created = await createRun({ config: parsed, total: plan.total });
  await executeRun(created);
  return (await getRun(created.id))!;
}

describe("allocation puzzle engine integration", () => {
  let store: TempStore;
  beforeEach(async () => {
    store = await useTempDataDir();
    mocks.decide.mockReset();
    await characters.upsert({ id: "allocation-test", provider: "local", model: "mock", outputMode: "structured",
      avatar: { shape: "owl", color: "rubric" }, steering: { mode: "raw", bio: "", principles: [], values: [] } });
  });
  afterEach(async () => store.cleanup());

  it("runs a single anonymous organ candidate and saves filterable traces", async () => {
    answer((request) => request.options[0]!.id);
    const finished = await run(organ);
    expect(finished.status).toBe("finished");
    expect(finished.progress).toEqual({ done: 1, total: 1 });
    const summary = parseRunSummary(finished.summary);
    expect(summary).toMatchObject({ kind: "organ-donation", errors: 0,
      decisions: [{ candidateId: BUILT_IN_DOSSIERS[0]!.id }] });
    expect(await listRuns({ puzzle: "organ-donation", characterId: "allocation-test" })).toHaveLength(1);
    const calls = (await listSpans(finished.id)).filter((span) => span.name === "provider-call");
    expect(calls).toHaveLength(1);
    expect(JSON.stringify(calls[0]?.input)).toContain("Candidate 1");
  });

  it("records the raise-prices outcome without inventing customer quantities", async () => {
    answer(() => "raise-prices");
    const finished = await run(scarce);
    expect(finished.status).toBe("finished");
    expect(finished.progress).toEqual({ done: 1, total: 1 });
    expect(parseRunSummary(finished.summary)).toMatchObject({ kind: "scarce-allocation", decisions: [
      { strategy: "raise-prices", allocations: [], allocatedQuantity: 0, unallocatedQuantity: 7 },
    ] });
    expect(await listRuns({ puzzle: "scarce-allocation", characterId: "allocation-test" })).toHaveLength(1);
  });

  it("records model-selected partial orders without exceeding stock or demand", async () => {
    answer(() => "plan:p1");
    const finished = await run(scarce);
    expect(finished.status).toBe("finished");
    expect(finished.progress).toEqual({ done: 1, total: 1 });
    expect(parseRunSummary(finished.summary)).toMatchObject({ kind: "scarce-allocation", decisions: [
      { strategy: "allocate", allocations: [{ customerId: "earlier", quantity: 3 }, { customerId: "later", quantity: 4 }], allocatedQuantity: 7, unallocatedQuantity: 0 },
    ] });
  });

  it("honors stored cancellation during a call while preserving the returned decision", async () => {
    const plan = await prepareRun(scarce);
    const created = await createRun({ config: scarce, total: plan.total });
    mocks.decide.mockImplementation(async () => {
      await cancelRun(created.id);
      return { choice: "plan:p1", latencyMs: 1 };
    });
    await executeRun(created);
    const cancelled = await getRun(created.id);
    expect(cancelled?.status).toBe("cancelled");
    expect(cancelled?.progress).toEqual({ done: 1, total: 1 });
    expect(mocks.decide).toHaveBeenCalledTimes(1);
    expect(parseRunSummary(cancelled?.summary)).toMatchObject({
      kind: "scarce-allocation", decisions: [{ complete: true, selectedPlanId: "p1" }],
    });
  });

  it("persists a free allocation and its quantities in the decision span", async () => {
    if (scarce.puzzle !== "scarce-allocation") throw new Error("fixture");
    const allocations = [{ customerId: "earlier", quantity: 2 }, { customerId: "later", quantity: 5 }];
    mocks.decide.mockResolvedValue({ choice: "allocate", allocations, latencyMs: 1 });
    const finished = await run({ ...scarce, mode: "free", plans: [] });
    expect(mocks.decide).toHaveBeenCalledTimes(1);
    expect(parseRunSummary(finished.summary)).toMatchObject({ kind: "scarce-allocation", decisions: [{ complete: true, allocations }] });
    const spans = await listSpans(finished.id);
    expect(spans.find((span) => span.decision)?.decision).toMatchObject({ choice: "allocate", allocations });
  });

  it("rejects ambiguous duplicate recipients before starting a run", async () => {
    if (organ.puzzle !== "organ-donation" || scarce.puzzle !== "scarce-allocation") throw new Error("fixture");
    await expect(prepareRun({ ...organ, candidates: [organ.candidates[0]!, organ.candidates[0]!] })).rejects.toThrow(/repeat|unique/i);
    await expect(prepareRun({ ...scarce, customers: [scarce.customers[0]!, scarce.customers[0]!] })).rejects.toThrow(/unique/i);
  });
});

it("rejects TypeSafe in free allocation before any model call", async () => {
  const store = await useTempDataDir();
  try {
    await characters.upsert({ id: "allocation-test", provider: "typesafe", model: "jev-latest", outputMode: "structured", avatar: { shape: "owl", color: "rubric" }, steering: { mode: "raw", bio: "", principles: [], values: [] } });
    if (scarce.puzzle !== "scarce-allocation") throw new Error("fixture");
    await expect(prepareRun({ ...scarce, mode: "free" })).rejects.toThrow(/TypeSafe/);
    await expect(prepareRun(scarce)).resolves.toMatchObject({ puzzle: "scarce-allocation" });
  } finally { await store.cleanup(); }
});
