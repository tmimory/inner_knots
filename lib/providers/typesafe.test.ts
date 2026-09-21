import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_INSTRUCTIONS, DEFAULT_TYPESAFE_MODEL, createTypeSafeAdapter } from "./typesafe";
import type { DecisionOption, DecisionRequest, ProviderCallRecord } from "./types";

const mocks = vi.hoisted(() => ({
  systemOne: vi.fn(),
  modelsList: vi.fn(),
  constructed: vi.fn(),
}));

vi.mock("@typesafe-ai/sdk", () => ({
  TypeSafeClient: class MockTypeSafeClient {
    models = { list: mocks.modelsList };
    systemOne = mocks.systemOne;
    constructor(options: unknown) {
      mocks.constructed(options);
    }
  },
  choice: (instructions: unknown, criteria: unknown) => ({ type: "choice", instructions, criteria }),
}));

const OPTIONS: DecisionOption[] = [
  { id: "track1", label: "Track 1", description: "Five workers." },
  { id: "track2", label: "Track 2" },
];

function request(overrides: Partial<DecisionRequest> = {}): DecisionRequest {
  return {
    model: "jev-latest",
    system: "A utilitarian.",
    messages: [{ role: "user", content: "Pull the lever?" }],
    options: OPTIONS,
    outputMode: "structured",
    ...overrides,
  };
}

let savedKey: string | undefined;

beforeEach(() => {
  savedKey = process.env.TYPESAFE_API_KEY;
  process.env.TYPESAFE_API_KEY = "ts-test";
  mocks.systemOne.mockReset();
  mocks.modelsList.mockReset();
  mocks.constructed.mockReset();
});

afterEach(() => {
  if (savedKey === undefined) delete process.env.TYPESAFE_API_KEY;
  else process.env.TYPESAFE_API_KEY = savedKey;
});

describe("decide", () => {
  it("sends the character as state and the options as choice criteria", async () => {
    mocks.systemOne.mockResolvedValue({
      model: "jev-latest",
      answers: {
        decision: { type: "choice", choice: "track2", confidence: 0.82, probabilities: { track1: 0.18, track2: 0.82 } },
      },
      usage: { input_tokens: 40, output_tokens: 3 },
    });

    const calls: ProviderCallRecord[] = [];
    const record = await createTypeSafeAdapter().decide(request({ question: "Which track?" }), {
      onCall: (call) => {
        calls.push(call);
      },
    });

    const body = mocks.systemOne.mock.calls[0]?.[0];
    expect(body.model).toBe("jev-latest");
    expect(body.state).toEqual({
      character: "A utilitarian.",
      transcript: [{ role: "user", content: "Pull the lever?" }],
    });
    expect(body.questions.decision).toEqual({
      type: "choice",
      instructions: "Which track?",
      criteria: { track1: "Track 1 — Five workers.", track2: "Track 2" },
    });

    expect(record.choice).toBe("track2");
    expect(record.weights).toEqual({ track1: 0.18, track2: 0.82 });
    expect(record.confidence).toBe(0.82);
    expect(record.usage).toEqual({ inputTokens: 40, outputTokens: 3 });
    expect(calls[0]?.provider).toBe("typesafe");
    expect(calls[0]?.response).toHaveProperty("answers");
  });

  it("uses a default instruction and a null character when none are given", async () => {
    mocks.systemOne.mockResolvedValue({
      answers: { decision: { type: "choice", choice: "track1", confidence: 1, probabilities: { track1: 1 } } },
      usage: { input_tokens: 1, output_tokens: 1 },
    });

    await createTypeSafeAdapter().decide(request({ system: undefined }));
    const body = mocks.systemOne.mock.calls[0]?.[0];
    expect(body.state.character).toBeNull();
    expect(body.questions.decision.instructions).toBe(DEFAULT_INSTRUCTIONS);
  });

  it("drops weights for ids that were never on offer", async () => {
    mocks.systemOne.mockResolvedValue({
      answers: { decision: { type: "choice", choice: "track1", confidence: 0.5, probabilities: { track1: 0.5, ghost: 0.5 } } },
      usage: { input_tokens: 1, output_tokens: 1 },
    });

    const record = await createTypeSafeAdapter().decide(request());
    expect(record.weights).toEqual({ track1: 0.5 });
  });

  it("refuses tool mode, which System One does not have", async () => {
    await expect(createTypeSafeAdapter().decide(request({ outputMode: "tool" }))).rejects.toMatchObject({
      name: "ProviderError",
      retryable: false,
    });
    expect(mocks.systemOne).not.toHaveBeenCalled();
  });

  it("normalizes an upstream failure and records it", async () => {
    mocks.systemOne.mockRejectedValue(Object.assign(new Error("server error"), { status: 500 }));
    const calls: ProviderCallRecord[] = [];
    await expect(
      createTypeSafeAdapter().decide(request(), {
        onCall: (call) => {
          calls.push(call);
        },
      }),
    ).rejects.toMatchObject({ status: 500, retryable: true });
    expect(calls[0]?.error).toBe("server error");
  });

  it("refuses to build a client without a key", async () => {
    delete process.env.TYPESAFE_API_KEY;
    await expect(createTypeSafeAdapter().decide(request())).rejects.toMatchObject({ status: 401, retryable: false });
  });
});

describe("listModels", () => {
  it("puts the default model first", async () => {
    mocks.modelsList.mockResolvedValue([
      { name: "jev-mini", description: "Small", release_date: "2026-01-01" },
      { name: DEFAULT_TYPESAFE_MODEL, description: "Latest", release_date: "2026-06-01" },
    ]);

    const models = await createTypeSafeAdapter().listModels();
    expect(models.map((model) => model.id)).toEqual([DEFAULT_TYPESAFE_MODEL, "jev-mini"]);
    expect(models[0]?.capabilities).toEqual({ structuredOutput: true, toolCalls: false, effort: [] });
  });

  it("adds the default model when the account list omits it", async () => {
    mocks.modelsList.mockResolvedValue([{ name: "jev-mini", description: "Small", release_date: "2026-01-01" }]);
    const models = await createTypeSafeAdapter().listModels();
    expect(models.map((model) => model.id)).toEqual([DEFAULT_TYPESAFE_MODEL, "jev-mini"]);
  });
});
