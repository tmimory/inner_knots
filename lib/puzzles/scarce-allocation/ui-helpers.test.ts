import { describe, expect, it } from "vitest";
import { scarceAllocationConfigSchema } from "@/lib/domain/scarce-allocation";
import { DEFAULT_SCARCE_ALLOCATION_SETUP, parseScarceAllocationSetup, reconcilePlans, scarceAllocationConfig } from "./ui-helpers";

describe("scarce allocation draft persistence", () => {
  it("restores an unfinished customer before a roster has been selected", () => {
    const draft = {
      ...DEFAULT_SCARCE_ALLOCATION_SETUP,
      customers: [{ id: "draft", name: "", description: "", orderedQuantity: 10 }],
      timeFrame: "",
    };
    expect(parseScarceAllocationSetup(draft)).toEqual(draft);
    expect(scarceAllocationConfigSchema.safeParse({ puzzle: "scarce-allocation", ...draft }).success).toBe(false);
  });
});


it("keeps quantities attached to customer IDs through reorder, removal and addition", () => {
  const setup = DEFAULT_SCARCE_ALLOCATION_SETUP;
  const customers = [setup.customers[2]!, setup.customers[0]!, { ...setup.customers[1]!, id: "new" }];
  expect(reconcilePlans(setup.plans, customers)[0]?.allocations).toEqual([
    { customerId: "sentinel-aerospace", quantity: 0 }, { customerId: "regional-medical", quantity: 400 }, { customerId: "new", quantity: 0 },
  ]);
});
it("preserves incomplete plan drafts but excludes them from a free allocation request", () => {
  const draft = { ...DEFAULT_SCARCE_ALLOCATION_SETUP, mode: "free" as const, plans: [{ id: "draft", name: "", allocations: [] }] };
  expect(parseScarceAllocationSetup(draft)).toEqual(draft);
  expect(scarceAllocationConfig(draft).plans).toEqual([]);
  expect(draft.plans).toHaveLength(1);
});
