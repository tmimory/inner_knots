import { describe, expect, it } from "vitest";

import { ProviderError, type DecisionOption } from "../types";
import {
  DECISION_TOOL_NAME,
  buildDecisionSchema,
  buildDecisionTool,
  buildStrictDecisionSchema,
  describeOptions,
  parseChoice,
} from "./decision-schema";
import { FALLBACK_USER_TURN, renderTranscript, splitSystem, withSystemMessage } from "./messages";

const OPTIONS: DecisionOption[] = [
  { id: "track1", label: "Track 1", description: "Five workers." },
  { id: "track2", label: "Track 2" },
];

describe("buildDecisionSchema", () => {
  it("enumerates the option ids and forbids extra keys", () => {
    const schema = buildDecisionSchema(OPTIONS);
    expect(schema.properties.choice.enum).toEqual(["track1", "track2"]);
    expect(schema.required).toEqual(["choice"]);
    expect(schema.additionalProperties).toBe(false);
  });

  it("makes rationale nullable-and-required in strict mode", () => {
    const schema = buildStrictDecisionSchema(OPTIONS);
    expect(schema.required).toEqual(["choice", "rationale"]);
    expect(schema.properties.rationale.type).toEqual(["string", "null"]);
  });

  it("names the tool consistently", () => {
    const tool = buildDecisionTool(OPTIONS);
    expect(tool.name).toBe(DECISION_TOOL_NAME);
    expect(tool.parameters.properties.choice.enum).toEqual(["track1", "track2"]);
  });

  it("describes options with their descriptions when present", () => {
    expect(describeOptions(OPTIONS)).toBe("- track1: Track 1 — Five workers.\n- track2: Track 2");
  });
});

describe("parseChoice", () => {
  it("reads an object answer", () => {
    expect(parseChoice({ choice: "track2", rationale: "Fewer die." }, OPTIONS, "openai")).toEqual({
      choice: "track2",
      rationale: "Fewer die.",
    });
  });

  it("reads a JSON string answer", () => {
    expect(parseChoice('{"choice":"track1"}', OPTIONS, "openai")).toEqual({ choice: "track1" });
  });

  it("falls back to a case-insensitive label match", () => {
    expect(parseChoice({ choice: "TRACK 2" }, OPTIONS, "anthropic")).toEqual({ choice: "track2" });
  });

  it("accepts a bare, punctuated reply", () => {
    expect(parseChoice("track1.", OPTIONS, "local")).toEqual({ choice: "track1" });
  });

  it("drops a null or blank rationale", () => {
    expect(parseChoice({ choice: "track1", rationale: null }, OPTIONS, "openai")).toEqual({ choice: "track1" });
    expect(parseChoice({ choice: "track1", rationale: "  " }, OPTIONS, "openai")).toEqual({ choice: "track1" });
  });

  it("rejects a choice that is not on offer", () => {
    expect(() => parseChoice({ choice: "track9" }, OPTIONS, "openai")).toThrow(ProviderError);
    try {
      parseChoice({ choice: "track9" }, OPTIONS, "openai");
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError);
      expect((error as ProviderError).retryable).toBe(false);
      expect((error as ProviderError).provider).toBe("openai");
    }
  });

  it("rejects an empty response", () => {
    expect(() => parseChoice("", OPTIONS, "local")).toThrow(/empty/i);
  });
});

describe("messages", () => {
  it("prepends the system prompt as a message", () => {
    expect(withSystemMessage("Be terse.", [{ role: "user", content: "Hi" }])).toEqual([
      { role: "system", content: "Be terse." },
      { role: "user", content: "Hi" },
    ]);
  });

  it("leaves the conversation alone when there is no system prompt", () => {
    expect(withSystemMessage(undefined, [{ role: "user", content: "Hi" }])).toEqual([{ role: "user", content: "Hi" }]);
  });

  it("hoists every system turn out of the conversation", () => {
    const result = splitSystem("Steering.", [
      { role: "system", content: "Extra." },
      { role: "user", content: "Hi" },
    ]);
    expect(result.system).toBe("Steering.\n\nExtra.");
    expect(result.messages).toEqual([{ role: "user", content: "Hi" }]);
  });

  it("always leaves at least one user turn", () => {
    const result = splitSystem("Steering.", [{ role: "system", content: "Extra." }]);
    expect(result.messages).toEqual([{ role: "user", content: FALLBACK_USER_TURN }]);
  });

  it("renders a role-labelled transcript", () => {
    expect(renderTranscript([{ role: "user", content: "Hi" }, { role: "assistant", content: "Ok" }])).toBe(
      "User: Hi\n\nAssistant: Ok",
    );
  });
});
