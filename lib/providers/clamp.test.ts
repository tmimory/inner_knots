import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { MIN_OUTPUT_TOKENS, clampMaxTokens, outputTokenCeiling } from "./clamp";
import { DEFAULT_LOCAL_BASE_URL, defaultEffort, isProviderEnabled, localApiKey, localBaseUrl, maxOutputTokens, providerApiKey } from "./env";

const KEYS = [
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "TYPESAFE_API_KEY",
  "OPENROUTER_API_KEY",
  "LOCAL_LLM_BASE_URL",
  "LOCAL_LLM_API_KEY",
  "MAX_OUTPUT_TOKENS",
  "DEFAULT_EFFORT",
] as const;

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("clampMaxTokens", () => {
  it("falls back to the env ceiling when nothing is requested", () => {
    process.env.MAX_OUTPUT_TOKENS = "512";
    expect(clampMaxTokens()).toBe(512);
  });

  it("lets a request lower the ceiling but not raise it", () => {
    process.env.MAX_OUTPUT_TOKENS = "512";
    expect(clampMaxTokens(128)).toBe(128);
    expect(clampMaxTokens(4096)).toBe(512);
  });

  it("never returns fewer tokens than a choice needs", () => {
    process.env.MAX_OUTPUT_TOKENS = "4";
    expect(outputTokenCeiling()).toBe(MIN_OUTPUT_TOKENS);
    expect(clampMaxTokens(1)).toBe(MIN_OUTPUT_TOKENS);
  });

  it("ignores an unparseable or absent env value", () => {
    expect(maxOutputTokens()).toBe(1024);
    process.env.MAX_OUTPUT_TOKENS = "lots";
    expect(maxOutputTokens()).toBe(1024);
  });

  it("floors fractional requests", () => {
    process.env.MAX_OUTPUT_TOKENS = "512";
    expect(clampMaxTokens(100.9)).toBe(100);
  });
});

describe("env", () => {
  it("treats a blank key as absent", () => {
    process.env.OPENAI_API_KEY = "   ";
    expect(providerApiKey("openai")).toBeUndefined();
    expect(isProviderEnabled("openai")).toBe(false);
  });

  it("enables a provider once its key is present", () => {
    process.env.ANTHROPIC_API_KEY = "sk-test";
    expect(isProviderEnabled("anthropic")).toBe(true);
    expect(isProviderEnabled("typesafe")).toBe(false);
    expect(isProviderEnabled("openrouter")).toBe(false);
  });

  it("enables local from its base URL, defaulting to Ollama", () => {
    expect(localBaseUrl()).toBe(DEFAULT_LOCAL_BASE_URL);
    expect(isProviderEnabled("local")).toBe(true);
    expect(localApiKey()).toBe("local");
    process.env.LOCAL_LLM_API_KEY = "token";
    expect(localApiKey()).toBe("token");
  });

  it("validates DEFAULT_EFFORT against the effort scale", () => {
    expect(defaultEffort()).toBe("low");
    process.env.DEFAULT_EFFORT = "high";
    expect(defaultEffort()).toBe("high");
    process.env.DEFAULT_EFFORT = "extreme";
    expect(defaultEffort()).toBe("low");
  });
});
