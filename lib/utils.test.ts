import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("p-md", "rounded-lg")).toBe("p-md rounded-lg");
  });

  it("drops falsy values", () => {
    expect(cn("p-md", false, undefined, null, "")).toBe("p-md");
  });

  it("lets a later class win within the same utility group", () => {
    expect(cn("bg-card", "bg-primary")).toBe("bg-primary");
  });

  it("supports conditional objects and arrays", () => {
    expect(cn(["text-foreground", { "opacity-50": true, hidden: false }])).toBe(
      "text-foreground opacity-50",
    );
  });
});
