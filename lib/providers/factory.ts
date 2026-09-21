/**
 * The one way to reach an adapter, and the model-list cache in front of them.
 *
 * Model catalogues change rarely and cost a round trip, so they are cached per
 * provider for ten minutes; the Characters screen can reopen a model picker without
 * re-listing three hundred OpenRouter models. `refreshModels` is what the UI's
 * refresh control calls.
 */
import { PROVIDER_IDS, type ProviderId } from "../domain/enums";
import { createAnthropicAdapter } from "./anthropic";
import { isProviderEnabled } from "./env";
import { createLocalAdapter } from "./local";
import { createOpenAIAdapter } from "./openai";
import { createOpenRouterAdapter } from "./openrouter";
import { createTypeSafeAdapter } from "./typesafe";
import { ProviderError, type ModelInfo, type ProviderAdapter } from "./types";

/** How long a provider's model list is reused before it is fetched again. */
export const MODEL_CACHE_TTL_MS = 10 * 60 * 1000;

const FACTORIES: Record<ProviderId, () => ProviderAdapter> = {
  typesafe: createTypeSafeAdapter,
  openai: createOpenAIAdapter,
  anthropic: createAnthropicAdapter,
  local: createLocalAdapter,
  openrouter: createOpenRouterAdapter,
};

/** A provider as the UI lists it. */
export type ProviderSummary = {
  id: ProviderId;
  label: string;
  enabled: boolean;
};

/** Narrows an arbitrary string to a `ProviderId`. */
export function isProviderId(value: string): value is ProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(value);
}

/**
 * Builds an adapter. Construction never touches the network or requires a key —
 * a missing key surfaces when `decide` or `listModels` is called — so the factory is
 * safe to use just to read a label.
 */
export function createProvider(id: ProviderId): ProviderAdapter {
  const factory = FACTORIES[id];
  if (!factory) {
    throw new ProviderError(id, `Unknown provider "${id}"`, { retryable: false });
  }
  return factory();
}

/** All five providers with their configuration state, in declaration order. */
export function listProviders(): ProviderSummary[] {
  return PROVIDER_IDS.map((id) => ({
    id,
    label: createProvider(id).label,
    enabled: isProviderEnabled(id),
  }));
}

/** Just the providers that can actually be called. */
export function listEnabledProviders(): { id: ProviderId; label: string }[] {
  return listProviders()
    .filter((provider) => provider.enabled)
    .map(({ id, label }) => ({ id, label }));
}

const cache = new Map<ProviderId, { fetchedAt: number; models: ModelInfo[] }>();

/** Models for a provider, from cache when it is still fresh. */
export async function getModels(id: ProviderId): Promise<ModelInfo[]> {
  const entry = cache.get(id);
  if (entry && Date.now() - entry.fetchedAt < MODEL_CACHE_TTL_MS) return entry.models;
  return refreshModels(id);
}

/** Models for a provider, always from the provider. Replaces the cached list. */
export async function refreshModels(id: ProviderId): Promise<ModelInfo[]> {
  const models = await createProvider(id).listModels();
  cache.set(id, { fetchedAt: Date.now(), models });
  return models;
}

/** Drops cached model lists. Without an id, drops every provider's. */
export function clearModelCache(id?: ProviderId): void {
  if (id === undefined) cache.clear();
  else cache.delete(id);
}
