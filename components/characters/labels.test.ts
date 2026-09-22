import { describe, expect, it } from "vitest";

import type { Character } from "@/lib/domain";

import { characterMetaParts, ignoredConvictionsNote } from "./labels";

function character(steering: Character["steering"]): Character {
  return {
    id: "zeno",
    avatar: { shape: "owl", color: "olive" },
    provider: "anthropic",
    model: "claude-sonnet-5",
    outputMode: "structured",
    steering,
    createdAt: "2026-09-22T00:00:00.000Z",
    updatedAt: "2026-09-22T00:00:00.000Z",
  };
}

describe("characterMetaParts", () => {
  it("counts the convictions a full character sends", () => {
    const meta = characterMetaParts(
      character({ mode: "full", principles: ["endure", "reason"], values: ["calm"] }),
    );
    expect(meta.convictions).toBe("3 convictions");
    expect(meta.convictionsIgnored).toBe(false);
  });

  it("says a character with none has none, whatever the mode", () => {
    const meta = characterMetaParts(character({ mode: "raw", principles: [], values: [] }));
    expect(meta.convictions).toBe("no convictions");
    expect(meta.convictionsIgnored).toBe(false);
  });

  it("marks convictions a raw or bio character keeps but does not send", () => {
    const raw = characterMetaParts(character({ mode: "raw", principles: ["endure"], values: [] }));
    expect(raw.convictions).toBe("ignores 1 conviction");
    expect(raw.convictionsIgnored).toBe(true);

    const bio = characterMetaParts(
      character({ mode: "bio", bio: "a stoic.", principles: ["endure"], values: ["calm"] }),
    );
    expect(bio.convictions).toBe("ignores 2 convictions");
    expect(bio.convictionsIgnored).toBe(true);
  });
});

describe("ignoredConvictionsNote", () => {
  it("says nothing when the mode sends the lists, or there is nothing in them", () => {
    expect(ignoredConvictionsNote({ mode: "full", principles: ["endure"], values: [] })).toBeUndefined();
    expect(ignoredConvictionsNote({ mode: "raw", principles: [], values: [] })).toBeUndefined();
  });

  it("names what is kept and where to go to send it", () => {
    expect(ignoredConvictionsNote({ mode: "bio", principles: ["endure"], values: [] })).toBe(
      "1 principle is kept but ignored until the mode is Full.",
    );
    expect(
      ignoredConvictionsNote({ mode: "raw", principles: ["endure", "reason"], values: ["calm"] }),
    ).toBe(
      "2 principles and 1 value are kept but ignored until the mode is Full.",
    );
  });
});
