import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MIN_THINKING_BUDGET, createAnthropicAdapter, effortStyle, planEffort } from "./anthropic";
import type { DecisionOption, DecisionRequest, ProviderCallRecord } from "./types";

const mocks = vi.hoisted(() => ({
  messagesCreate: vi.fn(),
  modelsList: vi.fn(),
  constructed: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: mocks.messagesCreate };
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
    model: "claude-sonnet-5",
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
  savedKey = process.env.ANTHROPIC_API_KEY;
  savedMax = process.env.MAX_OUTPUT_TOKENS;
  process.env.ANTHROPIC_API_KEY = "sk-ant-test";
  process.env.MAX_OUTPUT_TOKENS = "300";
  mocks.messagesCreate.mockReset();
  mocks.modelsList.mockReset();
  mocks.constructed.mockReset();
});

afterEach(() => {
  if (savedKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = savedKey;
  if (savedMax === undefined) delete process.env.MAX_OUTPUT_TOKENS;
  else process.env.MAX_OUTPUT_TOKENS = savedMax;
});

describe("effort planning", () => {
  it("picks the control the model understands", () => {
    expect(effortStyle("claude-sonnet-5")).toBe("output_config");
    expect(effortStyle("claude-opus-4-5")).toBe("output_config");
    expect(effortStyle("claude-sonnet-4-0")).toBe("thinking");
    expect(effortStyle("claude-3-5-haiku-latest")).toBe("none");
  });

  it("uses a named level on current models", () => {
    expect(planEffort("claude-sonnet-5", "high", 1024)).toEqual({ outputConfigEffort: "high" });
  });

  it("uses a thinking budget on older models when it fits", () => {
    expect(planEffort("claude-3-7-sonnet-latest", "low", 4096)).toEqual({
      thinking: { type: "enabled", budget_tokens: MIN_THINKING_BUDGET },
    });
  });

  it("drops thinking rather than exceeding the token clamp", () => {
    const plan = planEffort("claude-3-7-sonnet-latest", "low", 300);
    expect(plan.thinking).toBeUndefined();
    expect(plan.dropped).toMatch(/does not fit/);
  });

  it("ignores effort none", () => {
    expect(planEffort("claude-sonnet-5", "none", 4096)).toEqual({});
  });
});

describe("decide", () => {
  it("sends a json_schema output_config in structured mode with the system hoisted out", async () => {
    mocks.messagesCreate.mockResolvedValue({
      content: [{ type: "text", text: '{"choice":"seven","rationale":"7 > 3"}' }],
      usage: { input_tokens: 20, output_tokens: 8 },
    });

    const calls: ProviderCallRecord[] = [];
    const record = await createAnthropicAdapter().decide(request({ effort: "medium", maxTokens: 8000 }), {
      onCall: (call) => {
        calls.push(call);
      },
    });

    const body = mocks.messagesCreate.mock.calls[0]?.[0];
    expect(body.max_tokens).toBe(300);
    expect(body.system).toBe("You are terse.");
    expect(body.messages).toEqual([{ role: "user", content: "Which is larger, 3 or 7?" }]);
    expect(body.output_config.format.type).toBe("json_schema");
    expect(body.output_config.format.schema.properties.choice.enum).toEqual(["three", "seven"]);
    expect(body.output_config.effort).toBe("medium");
    expect(body.tools).toBeUndefined();

    expect(record).toMatchObject({ choice: "seven", rationale: "7 > 3", usage: { inputTokens: 20, outputTokens: 8 } });
    expect(calls).toHaveLength(1);
  });

  it("forces the choose tool in tool mode and reads its input object", async () => {
    mocks.messagesCreate.mockResolvedValue({
      content: [{ type: "tool_use", name: "choose", input: { choice: "three" } }],
    });

    const record = await createAnthropicAdapter().decide(request({ outputMode: "tool" }));
    const body = mocks.messagesCreate.mock.calls[0]?.[0];
    expect(body.tool_choice).toEqual({ type: "tool", name: "choose" });
    expect(body.tools[0].input_schema.required).toEqual(["choice"]);
    expect(body.output_config).toBeUndefined();
    expect(record.choice).toBe("three");
  });

  it("falls back to a forced tool call when the model has no structured output", async () => {
    mocks.messagesCreate
      .mockRejectedValueOnce(Object.assign(new Error("output_config.format is not supported"), { status: 400 }))
      .mockResolvedValueOnce({ content: [{ type: "tool_use", name: "choose", input: { choice: "seven" } }] });

    const calls: ProviderCallRecord[] = [];
    const record = await createAnthropicAdapter().decide(request(), {
      onCall: (call) => {
        calls.push(call);
      },
    });

    expect(record.choice).toBe("seven");
    expect(calls).toHaveLength(2);
    expect(calls[0]?.error).toMatch(/output_config/);
    expect(calls[1]?.outputMode).toBe("structured");
    expect(calls[1]?.request).toMatchObject({ structuredVia: "forced-tool" });
    expect(mocks.messagesCreate.mock.calls[1]?.[0].output_config).toBeUndefined();
  });

  it("notes a dropped thinking budget in the recorded request", async () => {
    mocks.messagesCreate.mockResolvedValue({
      content: [{ type: "tool_use", name: "choose", input: { choice: "three" } }],
    });
    const calls: ProviderCallRecord[] = [];
    await createAnthropicAdapter().decide(
      request({ model: "claude-3-7-sonnet-latest", outputMode: "tool", effort: "high" }),
      {
        onCall: (call) => {
          calls.push(call);
        },
      },
    );
    expect(mocks.messagesCreate.mock.calls[0]?.[0].thinking).toBeUndefined();
    expect(calls[0]?.request).toMatchObject({ effortDropped: expect.stringContaining("does not fit") });
  });

  it("normalizes an upstream failure and records it", async () => {
    mocks.messagesCreate.mockRejectedValue(Object.assign(new Error("overloaded"), { status: 529 }));
    const calls: ProviderCallRecord[] = [];
    await expect(
      createAnthropicAdapter().decide(request(), {
        onCall: (call) => {
          calls.push(call);
        },
      }),
    ).rejects.toMatchObject({ status: 529, retryable: true });
    expect(calls[0]?.error).toBe("overloaded");
  });

  it("refuses to build a client without a key", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(createAnthropicAdapter().decide(request())).rejects.toMatchObject({ status: 401, retryable: false });
  });
});

describe("listModels", () => {
  it("reads capabilities from the API when the model reports them", async () => {
    mocks.modelsList.mockResolvedValue({
      data: [
        {
          id: "claude-sonnet-5",
          display_name: "Claude Sonnet 5",
          max_input_tokens: 200000,
          capabilities: {
            structured_outputs: { supported: true },
            effort: { low: { supported: true }, medium: { supported: true }, high: { supported: true }, max: { supported: true } },
          },
        },
        { id: "claude-3-5-haiku-latest", display_name: "Claude Haiku 3.5", max_input_tokens: null, capabilities: null },
      ],
    });

    const models = await createAnthropicAdapter().listModels();
    expect(models[0]).toEqual({
      id: "claude-sonnet-5",
      label: "Claude Sonnet 5",
      capabilities: { structuredOutput: true, toolCalls: true, effort: ["low", "medium", "high"], contextWindow: 200000 },
    });
    expect(models[1]?.capabilities.effort).toEqual([]);
  });
});
