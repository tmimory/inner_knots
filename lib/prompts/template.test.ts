import { describe, expect, it } from "vitest";

import { parseTemplate, renderSource, templateVariables, TemplateError } from "./template";

describe("template", () => {
  it("substitutes plain variables without escaping", () => {
    expect(renderSource("Hello {{name}} & <you>", { name: "Zeno & co" })).toBe("Hello Zeno & co & <you>");
  });

  it("renders a missing variable as nothing", () => {
    expect(renderSource("[{{nope}}]", {})).toBe("[]");
  });

  it("includes an if block only when the value is truthy", () => {
    const source = "a{{#if x}}B{{/if}}c";
    expect(renderSource(source, { x: true })).toBe("aBc");
    expect(renderSource(source, { x: false })).toBe("ac");
    expect(renderSource(source, { x: "" })).toBe("ac");
    expect(renderSource(source, { x: "   " })).toBe("ac");
    expect(renderSource(source, { x: [] })).toBe("ac");
    expect(renderSource(source, { x: ["one"] })).toBe("aBc");
  });

  it("falls through to an else branch", () => {
    const source = "On track: {{#if items}}{{items}}{{else}}nothing at all{{/if}}.";
    expect(renderSource(source, { items: "a cow" })).toBe("On track: a cow.");
    expect(renderSource(source, { items: "" })).toBe("On track: nothing at all.");
  });

  it("repeats an each block over a list", () => {
    expect(renderSource("{{#each xs}}- {{this}}\n{{/each}}", { xs: ["a", "b"] })).toBe("- a\n- b");
  });

  it("reads fields of the current item", () => {
    const source = "{{#each rounds}}Round {{this.n}}: {{this.you}}\n{{/each}}";
    expect(renderSource(source, { rounds: [{ n: 1, you: "Testify" }, { n: 2, you: "Stay silent" }] })).toBe(
      "Round 1: Testify\nRound 2: Stay silent",
    );
  });

  it("renders an empty each as nothing", () => {
    expect(renderSource("x{{#each xs}}{{this}}{{/each}}y", { xs: [] })).toBe("xy");
  });

  it("nests blocks", () => {
    const source = "{{#if xs}}Have:\n{{#each xs}}- {{this}}\n{{/each}}{{/if}}";
    expect(renderSource(source, { xs: ["a"] })).toBe("Have:\n- a");
    expect(renderSource(source, { xs: [] })).toBe("");
  });

  it("drops the line a standalone block tag sits on", () => {
    const source = "one\n{{#if x}}\ntwo\n{{/if}}\nthree";
    expect(renderSource(source, { x: false })).toBe("one\nthree");
    expect(renderSource(source, { x: true })).toBe("one\ntwo\nthree");
  });

  it("rejects an unknown block", () => {
    expect(() => parseTemplate("{{#unless x}}a{{/unless}}")).toThrow(TemplateError);
  });

  it("rejects an unclosed block", () => {
    expect(() => parseTemplate("{{#if x}}a")).toThrow(/never closed/);
  });

  it("rejects a mismatched close", () => {
    expect(() => parseTemplate("{{#if x}}a{{/each}}")).toThrow(TemplateError);
  });

  it("rejects an else outside an if", () => {
    expect(() => parseTemplate("{{#each xs}}{{else}}{{/each}}")).toThrow(/only allowed inside/);
  });

  it("rejects this outside an each", () => {
    expect(() => renderSource("{{this}}", {})).toThrow(TemplateError);
  });

  it("rejects an each over a non-list", () => {
    expect(() => renderSource("{{#each xs}}{{this}}{{/each}}", { xs: "not a list" })).toThrow(/needs a list/);
  });

  it("reports the top-level variables a template reads", () => {
    const nodes = parseTemplate("{{a}}{{#if b}}{{c.d}}{{else}}{{e}}{{/if}}{{#each f}}{{this.g}}{{/each}}");
    expect(templateVariables(nodes).sort()).toEqual(["a", "b", "c", "e", "f"]);
  });
});
