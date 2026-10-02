import { describe, expect, it } from "vitest";
import { scarceAllocationConfigSchema } from "@/lib/domain/scarce-allocation";
import { DEFAULT_SCARCE_ALLOCATION_SETUP, parseScarceAllocationSetup } from "./ui-helpers";

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
