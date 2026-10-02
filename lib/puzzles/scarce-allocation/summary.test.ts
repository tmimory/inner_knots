import { describe, expect, it } from "vitest";

import { emptySummary, reduce } from "./summary";

describe("scarce allocation summary", () => {
  it("records a complete allocation decision", () => {
    const summary = emptySummary({ roster: [{ characterId: "c", runs: 1 }] });
    const next = reduce(summary, {
      path: [], calls: [], startedAt: "a", endedAt: "b",
      data: { characterId: "c", iteration: 1, strategy: "allocate", allocations: [{ customerId: "x", quantity: 4 }], allocatedQuantity: 4, unallocatedQuantity: 1, complete: false },
    });
    expect(next.decisions).toHaveLength(1);
    expect(next.decisions[0]?.allocations).toEqual([{ customerId: "x", quantity: 4 }]);

    const complete = reduce(next, {
      path: [], calls: [], startedAt: "a", endedAt: "b", progress: 1,
      data: { characterId: "c", iteration: 1, strategy: "allocate", allocations: [{ customerId: "x", quantity: 5 }], allocatedQuantity: 5, unallocatedQuantity: 0, complete: true },
    });
    expect(complete.decisions).toHaveLength(1);
    expect(complete.decisions[0]?.allocatedQuantity).toBe(5);
  });
});
