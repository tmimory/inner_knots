import { describe, expect, it } from "vitest";

import type { Character } from "@/lib/domain/character";

import { composeSteeringPrompt } from "./steering";

function character(steering: Character["steering"]): Pick<Character, "steering"> {
  return { steering };
}

describe("composeSteeringPrompt", () => {
  it("returns null in raw mode, whatever else is filled in", async () => {
    const prompt = await composeSteeringPrompt(
      character({ mode: "raw", bio: "a stoic.", principles: ["endure"], values: ["calm"] }),
    );
    expect(prompt).toBeNull();
  });

  it("uses only the bio in bio mode", async () => {
    const prompt = await composeSteeringPrompt(
      character({ mode: "bio", bio: "a stoic philosopher.", principles: ["endure"], values: ["calm"] }),
    );
    expect(prompt).toBe("You are a stoic philosopher.");
  });

  it("lowers a bio that was typed as its own sentence, but not an acronym", async () => {
    const sentence = await composeSteeringPrompt(
      character({ mode: "bio", bio: "An old questioner of the agora.", principles: [], values: [] }),
    );
    expect(sentence).toBe("You are an old questioner of the agora.");

    const acronym = await composeSteeringPrompt(
      character({ mode: "bio", bio: "GPT-5 in a toga.", principles: [], values: [] }),
    );
    expect(acronym).toBe("You are GPT-5 in a toga.");

    const article = await composeSteeringPrompt(
      character({ mode: "bio", bio: "A freed slave.", principles: [], values: [] }),
    );
    expect(article).toBe("You are a freed slave.");
  });

  it("stacks bio, principles and values in full mode", async () => {
    const prompt = await composeSteeringPrompt(
      character({
        mode: "full",
        bio: "a stoic philosopher.",
        principles: ["Endure.", "Do not complain."],
        values: ["Calm", "Duty"],
      }),
    );
    expect(prompt).toBe(
      [
        "You are a stoic philosopher.",
        "",
        "You are guided by the following principles:",
        "",
        "- Endure.",
        "- Do not complain.",
        "",
        "Your values are as follows:",
        "",
        "- Calm",
        "- Duty",
      ].join("\n"),
    );
  });

  it("omits an empty principles section", async () => {
    const prompt = await composeSteeringPrompt(
      character({ mode: "full", bio: "a stoic.", principles: [], values: ["Calm"] }),
    );
    expect(prompt).not.toContain("principles");
    expect(prompt).toContain("Your values are as follows:");
  });

  it("omits blank entries and an all-blank list", async () => {
    const prompt = await composeSteeringPrompt(
      character({ mode: "full", bio: "a stoic.", principles: ["  ", "Endure."], values: ["   "] }),
    );
    expect(prompt).toContain("- Endure.");
    expect(prompt).not.toContain("Your values");
  });

  it("returns null when every section is empty", async () => {
    expect(await composeSteeringPrompt(character({ mode: "full", principles: [], values: [] }))).toBeNull();
    expect(await composeSteeringPrompt(character({ mode: "bio", bio: "  ", principles: [], values: [] }))).toBeNull();
  });
});
