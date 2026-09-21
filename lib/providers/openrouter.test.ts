import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OPENROUTER_BASE_URL, createOpenRouterAdapter, mapOpenRouterModel } from "./openrouter";
import type { DecisionOption, DecisionRequest } from "./types";

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
    model: "anthropic/claude-sonnet-5",
    messages: [{ role: "user", content: "Which is larger, 3 or 7?" }],
    options: OPTIONS,
    outputMode: "structured",
    ...overrides,
  };
}

let savedKey: string | undefined;
let savedMax: string | undefined;

beforeEach(() => {
  savedKey = process.env.OPENROUTER_API_KEY;
  savedMax = process.env.MAX_OUTPUT_TOKENS;
  process.env.OPENROUTER_API_KEY = "or-test";
  process.env.MAX_OUTPUT_TOKENS = "150";
  mocks.chatCreate.mockReset();
  mocks.constructed.mockReset();
});

afterEach(() => {
  if (savedKey === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = savedKey;
  if (savedMax === undefined) delete process.env.MAX_OUTPUT_TOKENS;
  else process.env.MAX_OUTPUT_TOKENS = savedMax;
  vi.unstubAllGlobals();
});

describe("capabilities", () => {
  it("reads them from supported_parameters", () => {
    expect(
      mapOpenRouterModel({
        id: "x/y",
        name: "X Y",
        context_length: 128000,
        supported_parameters: ["tools", "structured_outputs", "reasoning"],
      }),
    ).toEqual({
      id: "x/y",
      label: "X Y",
      capabilities: { structuredOutput: true, toolCalls: true, effort: ["low", "medium", "high"], contextWindow: 128000 },
    });
  });

  it("treats a bare response_format as structured output and no tools as none", () => {
    const model = mapOpenRouterModel({ id: "a/b", supported_parameters: ["response_format"] });
    expect(model?.capabilities).toEqual({ structuredOutput: true, toolCalls: false, effort: [] });
    expect(model?.label).toBe("a/b");
  });

  it("skips an entry with no id", () => {
    expect(mapOpenRouterModel({ name: "nameless" })).toBeUndefined();
  });
});

describe("listModels", () => {
  it("fetches the public catalogue with attribution headers and sorts by label", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: [
                { id: "z/model", name: "Zeta", supported_parameters: ["tools"] },
                { id: "a/model", name: "Alpha", supported_parameters: [] },
              ],
            }),
            { status: 200 },
          ),
      ),
    );

    const models = await createOpenRouterAdapter().listModels();
    expect(models.map((model) => model.label)).toEqual(["Alpha", "Zeta"]);

    const [url, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(url).toBe(`${OPENROUTER_BASE_URL}/models`);
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers["X-Title"]).toBe("inner_knots");
    expect(headers.Authorization).toBe("Bearer or-test");
  });

  it("works without a key, since the catalogue is public", async () => {
    delete process.env.OPENROUTER_API_KEY;
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200 })));
    await expect(createOpenRouterAdapter().listModels()).resolves.toEqual([]);
    const init = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("turns a non-2xx catalogue response into a ProviderError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 502 })));
    await expect(createOpenRouterAdapter().listModels()).rejects.toMatchObject({ status: 502, retryable: true });
  });
});

describe("decide", () => {
  it("sends the OpenRouter base URL, headers, schema and reasoning effort", async () => {
    mocks.chatCreate.mockResolvedValue({
      choices: [{ message: { content: '{"choice":"seven","rationale":"7 > 3"}' } }],
      usage: { prompt_tokens: 9, completion_tokens: 5 },
    });

    const record = await createOpenRouterAdapter().decide(request({ effort: "medium", maxTokens: 900 }));
    expect(mocks.constructed).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: OPENROUTER_BASE_URL, apiKey: "or-test" }),
    );
    const body = mocks.chatCreate.mock.calls[0]?.[0];
    expect(body.max_tokens).toBe(150);
    expect(body.reasoning).toEqual({ effort: "medium" });
    expect(body.response_format.json_schema.schema.properties.choice.enum).toEqual(["three", "seven"]);
    expect(record).toMatchObject({ choice: "seven", rationale: "7 > 3", usage: { inputTokens: 9, outputTokens: 5 } });
  });

  it("omits reasoning for effort none", async () => {
    mocks.chatCreate.mockResolvedValue({ choices: [{ message: { content: '{"choice":"three"}' } }] });
    await createOpenRouterAdapter().decide(request({ effort: "none" }));
    expect(mocks.chatCreate.mock.calls[0]?.[0].reasoning).toBeUndefined();
  });

  it("refuses to build a client without a key", async () => {
    delete process.env.OPENROUTER_API_KEY;
    await expect(createOpenRouterAdapter().decide(request())).rejects.toMatchObject({ status: 401, retryable: false });
  });
});
