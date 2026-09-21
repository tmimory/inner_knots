import { describe, expect, it } from "vitest";

import { checkFragments, render, renderMany } from "./compose";
import { getFragment, listFragments, PromptError } from "./loader";

describe("prompt fragments", () => {
  it("loads every fragment on disk without error", async () => {
    const ids = await checkFragments();
    expect(ids).toContain("characters/bio");
    expect(ids).toContain("shared/decision-instructions");
    expect(ids.length).toBeGreaterThan(15);
  });

  it("gives each fragment an id matching its path, and a description", async () => {
    for (const fragment of await listFragments()) {
      expect(fragment.file.endsWith(`${fragment.id}.md`)).toBe(true);
      expect(fragment.description.length).toBeGreaterThan(0);
    }
  });

  it("renders a fragment by id", async () => {
    expect(await render("characters/bio", { bio: "a stoic philosopher." })).toBe(
      "You are a stoic philosopher.",
    );
  });

  it("throws when a declared variable is missing", async () => {
    await expect(render("characters/bio", {})).rejects.toThrow(PromptError);
    await expect(render("characters/bio", {})).rejects.toThrow(/"bio"/);
  });

  it("accepts an empty string as a supplied value", async () => {
    await expect(render("characters/bio", { bio: "" })).resolves.toBe("You are");
  });

  it("throws for an unknown fragment id", async () => {
    await expect(render("nope/missing")).rejects.toThrow(PromptError);
  });

  it("joins several fragments, dropping empty ones", async () => {
    const text = await renderMany([
      { id: "characters/bio", vars: { bio: "a stoic." } },
      { id: "characters/principles", vars: { principles: [] } },
      { id: "characters/values", vars: { values: ["calm"] } },
    ]);
    expect(text).toBe("You are a stoic.\n\nYour values are as follows:\n\n- calm");
  });

  it("caches a fragment and re-reads it when the file changes", async () => {
    const first = await getFragment("characters/bio");
    const second = await getFragment("characters/bio");
    expect(second).toBe(first);
  });

  it("renders the shared decision instructions for both output modes", async () => {
    const options = [{ id: "track1", label: "Track 1" }];
    const tool = await render("shared/decision-instructions", {
      options,
      outputMode: { tool: true, structured: false },
    });
    const structured = await render("shared/decision-instructions", {
      options,
      outputMode: { tool: false, structured: true },
    });

    expect(tool).toContain("`track1` — Track 1");
    expect(tool).toContain("calling the tool");
    expect(tool).not.toContain("`choice` field");
    expect(structured).toContain("`choice` field");
    expect(structured).not.toContain("calling the tool");
  });
});
