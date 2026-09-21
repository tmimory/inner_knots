/**
 * The provider roster and one provider's model catalogue, as screen state.
 *
 * `useProviders` answers "which providers can actually be called"; `useModels`
 * answers "and what can this one run". They are separate hooks because the model
 * list is re-read whenever the chosen provider changes, while the roster is read
 * once per screen.
 *
 * The server caches model lists for ten minutes, so an explicit `refresh()` here
 * sends `?refresh=1` — it is what the picker's refresh control is for.
 */
import { useCallback, useMemo } from "react";

import type { ProviderId } from "../domain/enums";
import { fetchModels, fetchProviders, type ModelInfo, type ProviderSummary } from "./providers";
import { useAsyncResource } from "./use-async-resource";

export type UseProviders = {
  /** All providers, configured or not, in declaration order. */
  providers: ProviderSummary[];
  /** Just the ones with a key (or, for `local`, a base URL) present. */
  enabled: ProviderSummary[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const NO_PROVIDERS: ProviderSummary[] = [];
const NO_MODELS: ModelInfo[] = [];

/** Reads `/api/providers`. No key value ever crosses that boundary, only `enabled`. */
export function useProviders(): UseProviders {
  const load = useCallback(() => fetchProviders(), []);
  const { data, loading, error, refresh } = useAsyncResource(load, NO_PROVIDERS);
  const enabled = useMemo(() => data.filter((provider) => provider.enabled), [data]);

  return { providers: data, enabled, loading, error, refresh };
}

export type UseModels = {
  models: ModelInfo[];
  loading: boolean;
  /** Set when the catalogue could not be read; the typed model id stays usable. */
  error: string | null;
  /** Re-fetch, bypassing the server's ten-minute cache. */
  refresh: () => Promise<void>;
};

/**
 * One provider's models. Passing `undefined` (no provider chosen yet) settles on
 * an empty list rather than making a request.
 */
export function useModels(provider: ProviderId | undefined): UseModels {
  const load = useCallback(
    (reason: "mount" | "refresh") =>
      provider === undefined ? Promise.resolve(NO_MODELS) : fetchModels(provider, reason === "refresh"),
    [provider],
  );
  const { data, loading, error, refresh } = useAsyncResource(load, NO_MODELS);

  return { models: error === null ? data : NO_MODELS, loading, error, refresh };
}
