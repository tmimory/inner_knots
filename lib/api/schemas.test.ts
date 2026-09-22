import { describe, expect, it } from "vitest";

import { previewDecisionStyle, previewDecisionStyleSchema } from "./schemas";

describe("previewDecisionStyleSchema", () => {
  it("defaults to structured", () => {
    expect(previewDecisionStyleSchema.parse(undefined)).toBe("structured");
  });

  it("rejects a style nobody composes", () => {
    expect(previewDecisionStyleSchema.safeParse("freeform").success).toBe(false);
  });
});

describe("previewDecisionStyle", () => {
  it("follows the seated character's output mode", () => {
    expect(previewDecisionStyle({ provider: "openai", outputMode: "structured" }, "tool")).toBe(
      "structured",
    );
    expect(previewDecisionStyle({ provider: "anthropic", outputMode: "tool" }, "structured")).toBe(
      "tool",
    );
  });

  it("gives a TypeSafe seat the judgment ending whatever its output mode says", () => {
    expect(previewDecisionStyle({ provider: "typesafe", outputMode: "structured" }, "tool")).toBe(
      "judgment",
    );
    expect(previewDecisionStyle({ provider: "typesafe", outputMode: "tool" }, "structured")).toBe(
      "judgment",
    );
  });

  it("falls back to the request's style while the seat is empty", () => {
    expect(previewDecisionStyle(undefined, "structured")).toBe("structured");
    expect(previewDecisionStyle(undefined, "judgment")).toBe("judgment");
  });
});
