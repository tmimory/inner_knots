/**
 * Client-side access to the provider routes.
 *
 * Only types cross this boundary: the adapters and their SDKs stay on the server, so
 * nothing here can pull a vendor SDK — or a key — into the app bundle.
 */
import type { OutputMode, ProviderId } from "../domain/enums";
import type { ModelInfo } from "../providers/types";
import { apiFetch } from "./api";

export type ProviderSummary = {
  id: ProviderId;
  label: string;
  enabled: boolean;
};

export type { ModelInfo };

export type ProviderTestResult = {
  decision: {
    choice: string;
    weights?: Record<string, number>;
    rationale?: string;
    confidence?: number;
    usage?: { inputTokens: number; outputTokens: number };
    latencyMs: number;
  };
  calls: unknown[];
};

/** All five providers and whether each has a key configured. */
export async function fetchProviders(): Promise<ProviderSummary[]> {
  const { providers } = await apiFetch<{ providers: ProviderSummary[] }>("/api/providers");
  return providers;
}

/** One provider's models. `refresh` bypasses the server's ten-minute cache. */
export async function fetchModels(id: ProviderId, refresh = false): Promise<ModelInfo[]> {
  const query = refresh ? "?refresh=1" : "";
  const { models } = await apiFetch<{ models: ModelInfo[] }>(`/api/providers/${id}/models${query}`);
  return models;
}

/** Runs a trivial decision against a model, to verify a key end to end. */
export function testProvider(
  id: ProviderId,
  model: string,
  outputMode: OutputMode = "structured",
): Promise<ProviderTestResult> {
  return apiFetch<ProviderTestResult>(`/api/providers/${id}/test`, {
    method: "POST",
    body: JSON.stringify({ model, outputMode }),
  });
}
