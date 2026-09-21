import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PROVIDER_IDS } from "../domain/enums";
import {
  clearModelCache,
  createProvider,
  getModels,
  isProviderId,
  listEnabledProviders,
  listProviders,
  refreshModels,
} from "./factory";

const KEYS = [
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "TYPESAFE_API_KEY",
  "OPENROUTER_API_KEY",
  "LOCAL_LLM_BASE_URL",
  "LOCAL_LLM_API_KEY",
] as const;

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  clearModelCache();
});

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  vi.unstubAllGlobals();
  clearModelCache();
});

describe("createProvider", () => {
  it("builds every declared provider without needing a key", () => {
    for (const id of PROVIDER_IDS) {
      const adapter = createProvider(id);
      expect(adapter.id).toBe(id);
      expect(adapter.label.length).toBeGreaterThan(0);
    }
  });

  it("narrows an arbitrary string", () => {
    expect(isProviderId("openai")).toBe(true);
    expect(isProviderId("gemini")).toBe(false);
  });
});

describe("listProviders", () => {
  it("reports all five, with enabled read from the environment", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const providers = listProviders();
    expect(providers.map((provider) => provider.id)).toEqual([...PROVIDER_IDS]);
    expect(providers.find((provider) => provider.id === "openai")?.enabled).toBe(true);
    expect(providers.find((provider) => provider.id === "anthropic")?.enabled).toBe(false);
    // Local is enabled by its default base URL even with nothing configured.
    expect(providers.find((provider) => provider.id === "local")?.enabled).toBe(true);
  });

  it("filters to the callable ones", () => {
    process.env.TYPESAFE_API_KEY = "ts-test";
    expect(listEnabledProviders().map((provider) => provider.id)).toEqual(["typesafe", "local"]);
  });
});

describe("model cache", () => {
  function stubModelList(): ReturnType<typeof vi.fn> {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ data: [{ id: "llama3.2" }] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("fetches once and reuses the list", async () => {
    const fetchMock = stubModelList();
    await getModels("local");
    await getModels("local");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refetches on refreshModels", async () => {
    const fetchMock = stubModelList();
    await getModels("local");
    const models = await refreshModels("local");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(models.map((model) => model.id)).toEqual(["llama3.2"]);
  });

  it("does not cache a failure", async () => {
    const fetchMock = vi.fn(async () => new Response("down", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(getModels("local")).rejects.toMatchObject({ name: "ProviderError" });
    await expect(getModels("local")).rejects.toMatchObject({ name: "ProviderError" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
