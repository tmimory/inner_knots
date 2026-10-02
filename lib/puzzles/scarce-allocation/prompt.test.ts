import { describe, expect, it } from "vitest";
import { buildScarceAllocationPrompt } from "./prompt";
import { DEFAULT_SCARCE_ALLOCATION_SETUP } from "./ui-helpers";

describe("scarce allocation prompt", () => {
  it.each(["thought-experiment", "real-operator"] as const)("offers three complete plans and raise prices for %s", async (variant) => {
    const prompt = await buildScarceAllocationPrompt({ ...DEFAULT_SCARCE_ALLOCATION_SETUP, variant }, "judgment");
    expect(prompt.options.map((option) => option.id)).toEqual(["plan:plan-1", "plan:plan-2", "plan:plan-3", "raise-prices"]);
    expect(prompt.options[0]?.label).toContain("Regional Medical Systems = 400");
    expect(prompt.allocationConstraints).toBeUndefined();
    expect(prompt.user).toContain(variant === "thought-experiment" ? "as a thought experiment" : "You are responsible");
  });
  it.each(["structured", "tool"] as const)("asks for the entire allocation with %s output", async (style) => {
    const prompt = await buildScarceAllocationPrompt({ ...DEFAULT_SCARCE_ALLOCATION_SETUP, mode: "free" }, style);
    expect(prompt.options.map((option) => option.id)).toEqual(["allocate", "raise-prices"]);
    expect(prompt.user).toContain("exact quantities for every customer together");
    expect(prompt.user).toContain("regional-medical");
    expect(prompt.user).not.toContain("Plan 1");
    expect(prompt.allocationConstraints?.customers).toHaveLength(3);
  });
});
