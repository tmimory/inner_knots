/**
 * The only place the provider layer reads `process.env`.
 *
 * Every value is read at call time, never captured at module load, so a route that
 * boots before `.env` is loaded still sees the key, and tests can vary the
 * environment between cases. Nothing here ever returns a key to a caller that would
 * put it in a response body: `isProviderEnabled` answers presence, not value.
 */
import { EFFORT_LEVELS, type EffortLevel, type ProviderId } from "../domain/enums";
import { ProviderError } from "./types";

/** Ollama's OpenAI-compatible endpoint, the documented default in `.env.example`. */
export const DEFAULT_LOCAL_BASE_URL = "http://localhost:11434/v1";
/** Used when `MAX_OUTPUT_TOKENS` is unset or unparseable. */
export const FALLBACK_MAX_OUTPUT_TOKENS = 1024;
/** Used when `DEFAULT_EFFORT` is unset or not one of `EFFORT_LEVELS`. */
export const FALLBACK_EFFORT: EffortLevel = "low";

/** Most local servers ignore the key but the OpenAI SDK insists on a non-empty one. */
const LOCAL_PLACEHOLDER_KEY = "local";

const API_KEY_VARS: Record<ProviderId, string | null> = {
  typesafe: "TYPESAFE_API_KEY",
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  local: null,
};

/** Reads one variable, treating whitespace-only as absent. */
function read(name: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** The API key for a provider, or undefined when it has none configured. */
export function providerApiKey(id: ProviderId): string | undefined {
  const name = API_KEY_VARS[id];
  return name === null ? read("LOCAL_LLM_API_KEY") : read(name);
}

/** The API key for a provider that requires one, or a `ProviderError` naming the missing variable. */
export function requireApiKey(id: ProviderId): string {
  const key = providerApiKey(id);
  if (key !== undefined) return key;
  const name = API_KEY_VARS[id] ?? "LOCAL_LLM_API_KEY";
  throw new ProviderError(id, `${name} is not set`, { status: 401, retryable: false });
}

/** Base URL of the local OpenAI-compatible server. */
export function localBaseUrl(): string {
  return read("LOCAL_LLM_BASE_URL") ?? DEFAULT_LOCAL_BASE_URL;
}

/** Key for the local server; local servers that want none still need a placeholder. */
export function localApiKey(): string {
  return read("LOCAL_LLM_API_KEY") ?? LOCAL_PLACEHOLDER_KEY;
}

/** The hard ceiling on output tokens for every provider call. */
export function maxOutputTokens(): number {
  const raw = read("MAX_OUTPUT_TOKENS");
  if (raw === undefined) return FALLBACK_MAX_OUTPUT_TOKENS;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_MAX_OUTPUT_TOKENS;
}

/** Reasoning effort used when a character does not set its own. */
export function defaultEffort(): EffortLevel {
  const raw = read("DEFAULT_EFFORT");
  const match = EFFORT_LEVELS.find((level) => level === raw);
  return match ?? FALLBACK_EFFORT;
}

/**
 * Whether a provider can be called at all: its key is present, or, for `local`,
 * a base URL is configured. The default local URL counts as enabled — listing its
 * models may still fail, and that surfaces as an error rather than a missing provider.
 */
export function isProviderEnabled(id: ProviderId): boolean {
  if (id === "local") return localBaseUrl().trim() !== "";
  return providerApiKey(id) !== undefined;
}
