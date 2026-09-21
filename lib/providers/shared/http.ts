/**
 * Plain JSON fetch for the endpoints no SDK covers — model catalogues, mostly.
 *
 * It exists so that a 404 from a local server and a 401 from OpenRouter arrive as the
 * same `ProviderError` the SDK-backed calls produce, and so a dead local server reads
 * as "could not reach" rather than an unhandled `TypeError: fetch failed`.
 */
import type { ProviderId } from "../../domain/enums";
import { ProviderError, type DecisionUsage } from "../types";

/** Removes trailing slashes so `${base}/models` never doubles up. */
export function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

/** Narrows an unknown value to a plain object, the shape every vendor response starts as. */
export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/**
 * Reads a response's `usage` object under caller-supplied field names, since vendors
 * disagree on what they call input/output tokens (`input_tokens`/`output_tokens` vs.
 * `prompt_tokens`/`completion_tokens`).
 */
export function readTokenUsage(
  response: unknown,
  fields: { input: string; output: string },
): DecisionUsage | undefined {
  const usage = asRecord(asRecord(response)?.usage);
  if (!usage) return undefined;
  const input = usage[fields.input];
  const output = usage[fields.output];
  if (typeof input !== "number" || typeof output !== "number") return undefined;
  return { inputTokens: input, outputTokens: output };
}

/** GETs JSON, turning every failure mode into a `ProviderError`. */
export async function fetchJson<T>(provider: ProviderId, url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    throw new ProviderError(provider, `Could not reach ${url}: ${error instanceof Error ? error.message : String(error)}`, {
      retryable: true,
      cause: error,
    });
  }

  const body = await response.text();
  if (!response.ok) {
    throw new ProviderError(provider, `${url} responded ${response.status}: ${body.slice(0, 500)}`, {
      status: response.status,
    });
  }

  try {
    return JSON.parse(body) as T;
  } catch (error) {
    throw new ProviderError(provider, `${url} returned a non-JSON body`, { retryable: false, cause: error });
  }
}
