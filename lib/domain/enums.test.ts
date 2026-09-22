import { describe, expect, it } from "vitest";

import { DECISION_STYLES, OUTPUT_MODES, PROVIDER_IDS, decisionStyleFor } from "./enums";

describe("decisionStyleFor", () => {
  it("is judgment for TypeSafe whatever the output mode says", () => {
    expect(decisionStyleFor("typesafe", "structured")).toBe("judgment");
    expect(decisionStyleFor("typesafe", "tool")).toBe("judgment");
  });

  it("is the output mode for every other provider", () => {
    for (const provider of PROVIDER_IDS.filter((id) => id !== "typesafe")) {
      for (const mode of OUTPUT_MODES) {
        expect(decisionStyleFor(provider, mode)).toBe(mode);
      }
    }
  });

  it("only ever returns a known style", () => {
    for (const provider of PROVIDER_IDS) {
      for (const mode of OUTPUT_MODES) {
        expect(DECISION_STYLES).toContain(decisionStyleFor(provider, mode));
      }
    }
  });

  it("extends the output modes rather than replacing them", () => {
    expect(DECISION_STYLES).toEqual(["structured", "tool", "judgment"]);
    for (const mode of OUTPUT_MODES) expect(DECISION_STYLES).toContain(mode);
  });
});
