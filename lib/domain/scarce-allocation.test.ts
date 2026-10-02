import { describe, expect, it } from "vitest";

import { scarceAllocationConfigSchema, validateScarceAllocationConfig } from "./scarce-allocation";

const base = {
  puzzle: "scarce-allocation" as const,
  variant: "thought-experiment" as const,
  mode: "plans" as const,
  plans: [{ id: "p1", name: "Plan 1", allocations: [{ customerId: "a", quantity: 9 }] }],
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

it("defaults old saved configs to plan mode without breaking their readability", () => {
  const { mode: _mode, plans: _plans, ...legacy } = base;
  expect(scarceAllocationConfigSchema.parse(legacy)).toMatchObject({ mode: "plans", plans: [] });
});
it("requires 1–3 valid plans only in specified-plan mode", () => {
  expect(validateScarceAllocationConfig({ ...base, plans: [] })).toContain("at least one");
  expect(validateScarceAllocationConfig({ ...base, mode: "free", plans: [] })).toBeNull();
  expect(scarceAllocationConfigSchema.safeParse({ ...base, plans: Array(4).fill(base.plans[0]) }).success).toBe(false);
  expect(validateScarceAllocationConfig({ ...base, plans: [base.plans[0]!, base.plans[0]!] })).toContain("unique");
  expect(validateScarceAllocationConfig({ ...base, plans: [{ ...base.plans[0]!, allocations: [{ customerId: "a", quantity: 8 }] }] })).toContain("exactly 9");
});
