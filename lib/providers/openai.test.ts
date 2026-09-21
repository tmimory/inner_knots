import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createOpenAIAdapter, isReasoningModel, mapEffort } from "./openai";
import { ProviderError, type DecisionOption, type DecisionRequest, type ProviderCallRecord } from "./types";

const mocks = vi.hoisted(() => ({
  responsesCreate: vi.fn(),
  modelsList: vi.fn(),
  constructed: vi.fn(),
}));

vi.mock("openai", () => ({
  default: class MockOpenAI {
    responses = { create: mocks.responsesCreate };
    models = { list: mocks.modelsList };
    constructor(options: unknown) {
      mocks.constructed(options);
    }
  },
}));

const OPTIONS: DecisionOption[] = [
  { id: "three", label: "Three" },
  { id: "seven", label: "Seven" },
];

function request(overrides: Partial<DecisionRequest> = {}): DecisionRequest {
  return {
    model: "gpt-4o",
    system: "You are terse.",
    messages: [{ role: "user", content: "Which is larger, 3 or 7?" }],
    options: OPTIONS,
    outputMode: "structured",
    ...overrides,
  };
}

let savedKey: string | undefined;
let savedMax: string | undefined;

beforeEach(() => {
  savedKey = process.env.OPENAI_API_KEY;
  savedMax = process.env.MAX_OUTPUT_TOKENS;
  process.env.OPENAI_API_KEY = "sk-test";
  process.env.MAX_OUTPUT_TOKENS = "256";
  mocks.responsesCreate.mockReset();
  mocks.modelsList.mockReset();
  mocks.constructed.mockReset();
});

afterEach(() => {
  if (savedKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = savedKey;
  if (savedMax === undefined) delete process.env.MAX_OUTPUT_TOKENS;
  else process.env.MAX_OUTPUT_TOKENS = savedMax;
});

describe("effort mapping", () => {
  it("recognises the reasoning families", () => {
    expect(isReasoningModel("o3-mini")).toBe(true);
    expect(isReasoningModel("gpt-5.1")).toBe(true);
    expect(isReasoningModel("gpt-4o")).toBe(false);
  });

  it("ignores effort on a non-reasoning model", () => {
    expect(mapEffort("gpt-4o", "high")).toBeUndefined();
  });

  it("maps none to the lowest level the family has", () => {
    expect(mapEffort("gpt-5.1", "none")).toBe("minimal");
    expect(mapEffort("o3-mini", "none")).toBeUndefined();
    expect(mapEffort("o3-mini", "low")).toBe("low");
  });
});

describe("decide", () => {
  it("sends a strict json_schema format in structured mode and clamps the budget", async () => {
    mocks.responsesCreate.mockResolvedValue({
      output_text: '{"choice":"seven","rationale":"7 > 3"}',
      usage: { input_tokens: 12, output_tokens: 6 },
    });

    const calls: ProviderCallRecord[] = [];
    const record = await createOpenAIAdapter().decide(request({ maxTokens: 9999 }), {
      onCall: (call) => {
        calls.push(call);
      },
    });

    const body = mocks.responsesCreate.mock.calls[0]?.[0];
    expect(body.max_output_tokens).toBe(256);
    expect(body.instructions).toBe("You are terse.");
    expect(body.text.format).toMatchObject({ type: "json_schema", name: "decision", strict: true });
    expect(body.text.format.schema.properties.choice.enum).toEqual(["three", "seven"]);
    expect(body.tools).toBeUndefined();

    expect(record.choice).toBe("seven");
    expect(record.rationale).toBe("7 > 3");
    expect(record.usage).toEqual({ inputTokens: 12, outputTokens: 6 });
    expect(record.latencyMs).toBeGreaterThanOrEqual(0);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.provider).toBe("openai");
    expect(calls[0]?.outputMode).toBe("structured");
    expect(calls[0]?.request).toBe(body);
    expect(calls[0]?.response).toHaveProperty("output_text");
    expect(calls[0]?.error).toBeUndefined();
  });

  it("forces the choose tool in tool mode and reads its arguments", async () => {
    mocks.responsesCreate.mockResolvedValue({
      output: [{ type: "function_call", name: "choose", arguments: '{"choice":"three"}' }],
    });

    const record = await createOpenAIAdapter().decide(request({ outputMode: "tool" }));
    const body = mocks.responsesCreate.mock.calls[0]?.[0];
    expect(body.tool_choice).toEqual({ type: "function", name: "choose" });
    expect(body.tools[0]).toMatchObject({ type: "function", name: "choose", strict: true });
    expect(body.text).toBeUndefined();
    expect(record.choice).toBe("three");
  });

  it("adds reasoning.effort only for reasoning models", async () => {
    mocks.responsesCreate.mockResolvedValue({ output_text: '{"choice":"seven"}' });
    await createOpenAIAdapter().decide(request({ model: "o3", effort: "high" }));
    expect(mocks.responsesCreate.mock.calls[0]?.[0].reasoning).toEqual({ effort: "high" });

    mocks.responsesCreate.mockClear();
    await createOpenAIAdapter().decide(request({ effort: "high" }));
    expect(mocks.responsesCreate.mock.calls[0]?.[0].reasoning).toBeUndefined();
  });

  it("normalizes an upstream failure and still records the call", async () => {
    mocks.responsesCreate.mockRejectedValue(Object.assign(new Error("rate limited"), { status: 429 }));
    const calls: ProviderCallRecord[] = [];

    await expect(
      createOpenAIAdapter().decide(request(), {
        onCall: (call) => {
          calls.push(call);
        },
      }),
    ).rejects.toMatchObject({ name: "ProviderError", status: 429, retryable: true });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.error).toBe("rate limited");
    expect(calls[0]?.response).toMatchObject({ status: 429 });
  });

  it("fails clearly when the model produced no usable output", async () => {
    mocks.responsesCreate.mockResolvedValue({ output: [], status: "incomplete" });
    await expect(createOpenAIAdapter().decide(request())).rejects.toThrow(ProviderError);
  });

  it("refuses to build a client without a key", async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(createOpenAIAdapter().decide(request())).rejects.toMatchObject({ status: 401, retryable: false });
  });
});

describe("listModels", () => {
  it("keeps chat models, drops other modalities, and reports effort levels", async () => {
    mocks.modelsList.mockResolvedValue({
      data: [
        { id: "gpt-4o" },
        { id: "gpt-4o-audio-preview" },
        { id: "o3-mini" },
        { id: "gpt-5.1" },
        { id: "text-embedding-3-small" },
        { id: "dall-e-3" },
      ],
    });

    const models = await createOpenAIAdapter().listModels();
    expect(models.map((model) => model.id)).toEqual(["gpt-4o", "gpt-5.1", "o3-mini"]);
    expect(models[0]?.capabilities).toEqual({ structuredOutput: true, toolCalls: true, effort: [] });
    expect(models[1]?.capabilities.effort).toEqual(["none", "low", "medium", "high"]);
    expect(models[2]?.capabilities.effort).toEqual(["low", "medium", "high"]);
  });
});
