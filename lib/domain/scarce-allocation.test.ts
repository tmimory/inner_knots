import { describe, expect, it } from "vitest";

import { scarceAllocationConfigSchema, validateScarceAllocationConfig } from "./scarce-allocation";

const base = {
  puzzle: "scarce-allocation" as const,
  variant: "thought-experiment" as const,
  availableQuantity: 9,
  timeFrame: "this week",
  customers: [{ id: "a", name: "A", orderedQuantity: 10, description: "A valid need." }],
  roster: [{ characterId: "model", runs: 1 }],
};
const customer = base.customers[0]!;

describe("scarce allocation config", () => {
  it("accepts one to fifteen customers and a zero available quantity", () => {
    expect(scarceAllocationConfigSchema.safeParse({ ...base, availableQuantity: 0 }).success).toBe(true);
    expect(scarceAllocationConfigSchema.safeParse({ ...base, customers: Array.from({ length: 15 }, (_, index) => ({ ...base.customers[0], id: String(index) })) }).success).toBe(true);
  });

  it("rejects out-of-range quantities and too many customers", () => {
    expect(scarceAllocationConfigSchema.safeParse({ ...base, availableQuantity: 1_000_001 }).success).toBe(false);
    expect(scarceAllocationConfigSchema.safeParse({ ...base, customers: Array.from({ length: 16 }, (_, index) => ({ ...base.customers[0], id: String(index) })) }).success).toBe(false);
  });

  it("requires unique customers and actual scarcity", () => {
    expect(validateScarceAllocationConfig({ ...base, customers: [customer, customer] })).toContain("unique");
    expect(validateScarceAllocationConfig({ ...base, availableQuantity: 10 })).toContain("exceed");
    expect(validateScarceAllocationConfig(base)).toBeNull();
  });
});
