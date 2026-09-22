import { describe, expect, it } from "vitest";

import { cn, indexById } from "./utils";

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

  it("lets a named spacing step replace another in the same utility", () => {
    // The bug this covers: stock tailwind-merge only knows numeric spacing, so a
    // screen's `gap-3xl` and a component's own `gap-lg` both survived and the
    // stylesheet's order picked the loser.
    expect(cn("gap-lg", "gap-3xl")).toBe("gap-3xl");
    expect(cn("p-md", "p-none")).toBe("p-none");
    expect(cn("mt-sm", "mt-2xl")).toBe("mt-2xl");
    expect(cn("h-control-icon", "h-control-sm")).toBe("h-control-sm");
    expect(cn("w-control-icon", "w-field")).toBe("w-field");
  });

  it("keeps an axis padding beside the padding it narrows", () => {
    expect(cn("p-md", "px-xl")).toBe("p-md px-xl");
    expect(cn("gap-lg", "gap-x-xs")).toBe("gap-lg gap-x-xs");
  });

  it("lets a named layout width replace another", () => {
    expect(cn("w-full max-w-menu", "max-w-content")).toBe(
      "w-full max-w-content",
    );
    expect(cn("min-w-menu", "min-w-content")).toBe("min-w-content");
    expect(cn("w-menu", "w-content")).toBe("w-content");
  });

  it("supports conditional objects and arrays", () => {
    expect(cn(["text-foreground", { "opacity-50": true, hidden: false }])).toBe(
      "text-foreground opacity-50",
    );
  });
});

describe("indexById", () => {
  it("keys every item by its own id", () => {
    const index = indexById([{ id: "a", n: 1 }, { id: "b", n: 2 }]);
    expect([...index.keys()]).toEqual(["a", "b"]);
    expect(index.get("b")).toEqual({ id: "b", n: 2 });
  });

  it("lets a later entry replace an earlier one with the same id", () => {
    const index = indexById([{ id: "a", n: 1 }, { id: "a", n: 2 }]);
    expect(index.size).toBe(1);
    expect(index.get("a")).toEqual({ id: "a", n: 2 });
  });

  it("indexes nothing into an empty map", () => {
    expect(indexById([]).size).toBe(0);
  });
});
