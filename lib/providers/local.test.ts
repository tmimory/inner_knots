import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createLocalAdapter } from "./local";
import type { DecisionOption, DecisionRequest, ProviderCallRecord } from "./types";

const mocks = vi.hoisted(() => ({
  chatCreate: vi.fn(),
  constructed: vi.fn(),
}));

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: mocks.chatCreate } };
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
    model: "llama3.2",
    system: "You are terse.",
    messages: [{ role: "user", content: "Which is larger, 3 or 7?" }],
    options: OPTIONS,
    outputMode: "structured",
    ...overrides,
  };
}

const saved: Record<string, string | undefined> = {};
const KEYS = ["LOCAL_LLM_BASE_URL", "LOCAL_LLM_API_KEY", "MAX_OUTPUT_TOKENS"] as const;

beforeEach(() => {
  for (const key of KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  process.env.LOCAL_LLM_BASE_URL = "http://127.0.0.1:1234/v1/";
  process.env.MAX_OUTPUT_TOKENS = "200";
  mocks.chatCreate.mockReset();
  mocks.constructed.mockReset();
});

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  vi.unstubAllGlobals();
});

describe("decide", () => {
  it("asks for a strict json_schema response format and clamps max_tokens", async () => {
    mocks.chatCreate.mockResolvedValue({
      choices: [{ message: { content: '{"choice":"seven"}' } }],
      usage: { prompt_tokens: 11, completion_tokens: 4 },
    });

    const record = await createLocalAdapter().decide(request({ maxTokens: 5000 }));
    const body = mocks.chatCreate.mock.calls[0]?.[0];
    expect(body.max_tokens).toBe(200);
    expect(body.messages[0]).toEqual({ role: "system", content: "You are terse." });
    expect(body.response_format).toMatchObject({ type: "json_schema" });
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(record).toMatchObject({ choice: "seven", usage: { inputTokens: 11, outputTokens: 4 } });
    expect(mocks.constructed).toHaveBeenCalledWith({ baseURL: "http://127.0.0.1:1234/v1/", apiKey: "local" });
  });

  it("falls back to json_object mode when the server rejects the schema", async () => {
    mocks.chatCreate
      .mockRejectedValueOnce(Object.assign(new Error("response_format json_schema not supported"), { status: 400 }))
      .mockResolvedValueOnce({ choices: [{ message: { content: '{"choice":"three"}' } }] });

    const calls: ProviderCallRecord[] = [];
    const record = await createLocalAdapter().decide(request(), {
      onCall: (call) => {
        calls.push(call);
      },
    });

    expect(record.choice).toBe("three");
    const fallback = mocks.chatCreate.mock.calls[1]?.[0];
    expect(fallback.response_format).toEqual({ type: "json_object" });
    expect(fallback.messages[0].content).toContain("- three: Three");
    expect(calls).toHaveLength(2);
    expect(calls[1]?.request).toMatchObject({ structuredVia: "json-object" });
  });

  it("does not fall back when the failure is unrelated", async () => {
    mocks.chatCreate.mockRejectedValue(Object.assign(new Error("connection refused"), { status: 500 }));
    await expect(createLocalAdapter().decide(request())).rejects.toMatchObject({ status: 500, retryable: true });
    expect(mocks.chatCreate).toHaveBeenCalledTimes(1);
  });

  it("forces the choose tool in tool mode and reads its arguments", async () => {
    mocks.chatCreate.mockResolvedValue({
      choices: [{ message: { tool_calls: [{ function: { name: "choose", arguments: '{"choice":"seven"}' } }] } }],
    });

    const record = await createLocalAdapter().decide(request({ outputMode: "tool" }));
    const body = mocks.chatCreate.mock.calls[0]?.[0];
    expect(body.tool_choice).toEqual({ type: "function", function: { name: "choose" } });
    expect(body.response_format).toBeUndefined();
    expect(record.choice).toBe("seven");
  });
});

describe("listModels", () => {
  it("reads the OpenAI-compatible model list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ data: [{ id: "qwen3" }, { id: "llama3.2" }] }), { status: 200 })),
    );

    const models = await createLocalAdapter().listModels();
    expect(models.map((model) => model.id)).toEqual(["llama3.2", "qwen3"]);
    expect(models[0]?.capabilities).toEqual({ structuredOutput: true, toolCalls: true, effort: [] });
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe("http://127.0.0.1:1234/v1/models");
  });

  it("surfaces an unreachable server as a retryable error, not a crash", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );
    await expect(createLocalAdapter().listModels()).rejects.toMatchObject({
      name: "ProviderError",
      retryable: true,
    });
  });
});
