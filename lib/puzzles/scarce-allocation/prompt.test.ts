import { describe, expect, it } from "vitest";

import { buildScarceAllocationStrategyPrompt, parseRangeChoice, partitionIntegerRange } from "./prompt";

const config = {
  variant: "real-operator" as const,
  availableQuantity: 75,
  timeFrame: "during the next two weeks",
  customers: [
    { id: "clinic", name: "Aster Clinic", orderedQuantity: 50, description: "Mounts diagnostic displays." },
    { id: "studio", name: "Bluebird Studio", orderedQuantity: 60, description: "Needs mounts for a touring production." },
  ],
};

describe("scarce allocation prompt", () => {
  it("includes capacity, ordered customers, and both strategies", async () => {
    const prompt = await buildScarceAllocationStrategyPrompt(config, "structured");
    expect(prompt.user).toContain("75 units");
    expect(prompt.user.indexOf("Aster Clinic")).toBeLessThan(prompt.user.indexOf("Bluebird Studio"));
    expect(prompt.options.map((option) => option.id)).toEqual(["allocate", "raise-prices"]);
  });

  it("partitions every integer exactly once and parses only offered ranges", () => {
    const ranges = partitionIntegerRange(0, 103);
    expect(ranges).toHaveLength(5);
    expect(ranges[0]).toEqual({ min: 0, max: 20 });
    expect(ranges.at(-1)).toEqual({ min: 84, max: 103 });
    expect(parseRangeChoice("21:41", ranges)).toEqual({ min: 21, max: 41 });
    expect(parseRangeChoice("0:103", ranges)).toBeUndefined();
  });
});
