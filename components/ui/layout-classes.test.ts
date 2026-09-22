import { describe, expect, it } from "vitest";

import { isLayoutClass, splitLayoutClasses } from "./layout-classes";

describe("isLayoutClass", () => {
  it("claims the classes that place a control in its parent", () => {
    for (const token of [
      "flex-1",
      "flex-none",
      "grow",
      "shrink-0",
      "basis-full",
      "w-card",
      "w-full",
      "min-w-menu",
      "max-w-inspector",
      "self-start",
      "mt-xs",
      "-mt-xs",
      "wide:w-card",
      "web:hover:max-w-inspector",
    ]) {
      expect(isLayoutClass(token), token).toBe(true);
    }
  });

  it("leaves the classes that paint the control alone", () => {
    for (const token of [
      "h-control-sm",
      "px-xs",
      "pr-control-icon",
      "pl-2xl",
      "text-center",
      "tabular",
      "font-mono",
      "text-sm",
      "flex-row",
      "flex-wrap",
      "border-border",
      "web:hover:border-ring",
      "transition-colors",
      "duration-fast",
    ]) {
      expect(isLayoutClass(token), token).toBe(false);
    }
  });
});

describe("splitLayoutClasses", () => {
  it("sends each half where it belongs and keeps the written order", () => {
    expect(splitLayoutClasses("max-w-inspector flex-1 font-mono text-sm")).toEqual({
      container: "max-w-inspector flex-1",
      field: "font-mono text-sm",
    });
  });

  it("reports an empty half as undefined, so cn() sees nothing", () => {
    expect(splitLayoutClasses("h-control-sm text-center")).toEqual({
      container: undefined,
      field: "h-control-sm text-center",
    });
    expect(splitLayoutClasses("flex-1")).toEqual({ container: "flex-1", field: undefined });
    expect(splitLayoutClasses(undefined)).toEqual({ container: undefined, field: undefined });
    expect(splitLayoutClasses("   ")).toEqual({ container: undefined, field: undefined });
  });
});
