import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Character } from "@/lib/domain/character";
import type { RunnerContext } from "@/lib/engine/types";
import type { DecisionRequest, TraceContext } from "@/lib/providers/types";

const mocks = vi.hoisted(() => ({ decide: vi.fn() }));
vi.mock("@/lib/providers/factory", () => ({ createProvider: () => ({ id: "local", decide: mocks.decide }) }));

const { allocationEvents } = await import("./runner");

const character: Character = {
  id: "allocator",
  provider: "local",
  model: "mock",
  outputMode: "structured",
  avatar: { shape: "owl", color: "rubric" },
  steering: { mode: "raw", bio: "", principles: [], values: [] },
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

function plan(mode: "plans" | "free" = "plans") {
  return {
    puzzle: "scarce-allocation" as const,
    config: { puzzle: "scarce-allocation" as const, variant: "real-operator" as const, mode,
      availableQuantity: 7, timeFrame: "this month",
      customers: [{ id: "a", name: "A", orderedQuantity: 8, description: "Medical equipment" }, { id: "b", name: "B", orderedQuantity: 6, description: "Stage equipment" }],
      plans: [{ id: "p1", name: "Plan 1", allocations: [{ customerId: "a", quantity: 3 }, { customerId: "b", quantity: 4 }] }],
      roster: [{ characterId: character.id, runs: 1 }],
    }, total: 1, roster: [{ character, runs: 1 }],
  };
}
function context(controller = new AbortController()): RunnerContext {
  return { signal: controller.signal, concurrency: 1, log: async () => undefined };
}
async function eventsFor(mode: "plans" | "free" = "plans", actor = character) {
  return Array.fromAsync(allocationEvents(plan(mode), actor, 1, context()));
}
describe("scarce allocation runner", () => {
  beforeEach(() => {
    mocks.decide.mockReset();
    mocks.decide.mockImplementation(async (request: DecisionRequest, trace?: TraceContext) => {
      const record = { choice: "plan:p1", latencyMs: 1 };
      await trace?.onCall?.({ provider: "local", model: request.model, outputMode: request.outputMode, request, response: record, startedAt: "a", endedAt: "b" });
      return record;
    });
  });
  it("selects a complete plan in one call with its trace and plan identity", async () => {
    const events = await eventsFor();
    expect(mocks.decide).toHaveBeenCalledTimes(1);
    expect(events).toHaveLength(1);
    expect(events[0]?.calls).toHaveLength(1);
    expect(events[0]?.data).toMatchObject({ complete: true, selectedPlanId: "p1", allocations: plan().config.plans[0]!.allocations, unallocatedQuantity: 0 });
  });
  it("returns a full free allocation in one call", async () => {
    mocks.decide.mockResolvedValue({ choice: "allocate", allocations: [{ customerId: "a", quantity: 5 }, { customerId: "b", quantity: 2 }], latencyMs: 1 });
    const events = await eventsFor("free");
    expect(mocks.decide).toHaveBeenCalledTimes(1);
    expect(mocks.decide.mock.calls[0]?.[0].allocationConstraints).toBeDefined();
    expect(events[0]?.data).toMatchObject({ complete: true, allocatedQuantity: 7, allocations: [{ customerId: "a", quantity: 5 }, { customerId: "b", quantity: 2 }] });
  });
  it.each(["plans", "free"] as const)("allows raising prices in %s mode without quantities", async (mode) => {
    mocks.decide.mockResolvedValue({ choice: "raise-prices", allocations: [], latencyMs: 1 });
    expect((await eventsFor(mode))[0]?.data).toMatchObject({ complete: true, strategy: "raise-prices", allocations: [], unallocatedQuantity: 7 });
    expect(mocks.decide).toHaveBeenCalledTimes(1);
  });
  it("records invalid quantities as an error without refinement", async () => {
    mocks.decide.mockResolvedValue({ choice: "allocate", allocations: [{ customerId: "a", quantity: 8 }, { customerId: "b", quantity: 2 }], latencyMs: 1 });
    expect((await eventsFor("free"))[0]?.data).toMatchObject({ complete: false, error: expect.stringContaining("exactly 7") });
    expect(mocks.decide).toHaveBeenCalledTimes(1);
  });
  it("rejects unknown plans", async () => {
    mocks.decide.mockResolvedValue({ choice: "plan:missing", latencyMs: 1 });
    expect((await eventsFor())[0]?.error).toMatch(/invalid allocation/);
  });
  it("guards against TypeSafe in free mode but permits its plan choices", async () => {
    const actor = { ...character, provider: "typesafe" as const };
    expect((await eventsFor("free", actor))[0]?.error).toMatch(/TypeSafe/);
    expect(mocks.decide).not.toHaveBeenCalled();
    expect((await eventsFor("plans", actor))[0]?.data.complete).toBe(true);
  });
  it("makes no call when already cancelled", async () => {
    const controller = new AbortController(); controller.abort();
    expect(await Array.fromAsync(allocationEvents(plan(), character, 1, context(controller)))).toEqual([]);
    expect(mocks.decide).not.toHaveBeenCalled();
  });
});
