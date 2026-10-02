import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Character } from "@/lib/domain/character";
import type { RunnerContext } from "@/lib/engine/types";
import type { DecisionRequest, TraceContext } from "@/lib/providers/types";

const mocks = vi.hoisted((): {
  calls: number;
  select: (options: readonly { id: string }[]) => string;
} => ({
  calls: 0,
  select: (_options: readonly { id: string }[]) => "allocate",
}));
vi.mock("@/lib/providers/factory", () => ({
  createProvider: () => ({
    id: "local",
    decide: async (request: DecisionRequest, trace?: TraceContext) => {
      mocks.calls += 1;
      const choice = mocks.select(request.options);
      await trace?.onCall?.({ provider: "local", model: request.model, outputMode: request.outputMode, request, response: { choice }, startedAt: "a", endedAt: "b" });
      return { choice, latencyMs: 1 };
    },
  }),
}));

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

function plan(availableQuantity = 10, customerCount = 1) {
  const customers = Array.from({ length: customerCount }, (_, index) => ({
    id: `customer-${index}`,
    name: `Customer ${index}`,
    orderedQuantity: 1_000_000,
    description: "Needs mounting hardware.",
  }));
  return {
    puzzle: "scarce-allocation" as const,
    config: { puzzle: "scarce-allocation" as const, variant: "real-operator" as const, availableQuantity, timeFrame: "this month", customers, roster: [{ characterId: character.id, runs: 1 }] },
    total: 1,
    roster: [{ character, runs: 1 }],
  };
}

function context(controller = new AbortController()): RunnerContext {
  return { signal: controller.signal, concurrency: 1, log: async () => undefined };
}

async function eventsFor(inputPlan: ReturnType<typeof plan>, choose: (options: readonly { id: string }[]) => string) {
  mocks.select = choose;
  const events = [];
  for await (const event of allocationEvents(inputPlan, character, 1, context())) events.push(event);
  return events;
}

describe("scarce allocation runner", () => {
  beforeEach(() => {
    mocks.calls = 0;
    mocks.select = () => "allocate";
  });

  it("stops between calls when cancelled and leaves the partial decision incomplete", async () => {
    mocks.select = () => "allocate";
    const controller = new AbortController();
    const generator = allocationEvents(plan(), character, 1, context(controller));
    const strategy = await generator.next();
    expect(strategy.value?.data.complete).toBe(false);
    controller.abort();
    expect((await generator.next()).done).toBe(true);
    expect(mocks.calls).toBe(1);
  });

  it("finishes an invalid strategy as an incomplete error", async () => {
    mocks.select = () => "unknown";
    const events = [];
    for await (const event of allocationEvents(plan(), character, 1, context())) events.push(event);
    expect(events).toHaveLength(1);
    expect(events[0]?.progress).toBe(1);
    expect(events[0]?.data).toMatchObject({ complete: false, allocatedQuantity: 0 });
    expect(events[0]?.error).toMatch(/invalid allocation strategy/i);
  });

  it("completes zero stock without quantity calls", async () => {
    const events = await eventsFor(plan(0), (options) => options.some((option) => option.id === "allocate") ? "allocate" : options[0]!.id);
    expect(mocks.calls).toBe(1);
    expect(events.at(-1)?.data).toMatchObject({ complete: true, allocations: [{ customerId: "customer-0", quantity: 0 }], allocatedQuantity: 0 });
  });

  it("handles maximum stock across fifteen customers with trace choices matching decisions", async () => {
    const events = await eventsFor(plan(1_000_000, 15), (options) => options.some((option) => option.id === "allocate") ? "allocate" : options[0]!.id);
    const complete = events.at(-1)!;
    expect(complete.data.complete).toBe(true);
    expect(complete.data.allocations).toHaveLength(15);
    expect(complete.data.allocations.slice(0, -1).every((allocation) => allocation.quantity === 0)).toBe(true);
    expect(complete.data.allocations.at(-1)?.quantity).toBe(1_000_000);
    expect(complete.data.unallocatedQuantity).toBe(0);
    const upstream = events.filter((event) => event.calls.length > 0);
    for (const event of upstream) {
      expect(event.decision?.choice).toBe((event.calls[0]?.response as { choice: string }).choice);
      expect(event.path.at(-1)?.name).toBe("node");
    }
  });

  it("does not let later allocation mutation alter earlier partial summaries", async () => {
    const events = await eventsFor(plan(3, 2), (options) => options.some((option) => option.id === "allocate") ? "allocate" : options.at(-1)!.id);
    const beforeSecondCustomer = events.find((event) => event.data.allocations.length === 0)!;
    expect(beforeSecondCustomer.data.allocations).toEqual([]);
    expect(events.at(-1)?.data.allocations).toHaveLength(2);
  });
});
