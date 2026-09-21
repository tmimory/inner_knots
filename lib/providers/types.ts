/**
 * The provider layer's public contract.
 *
 * A `ProviderAdapter` turns one puzzle decision into one upstream model call and
 * normalizes the answer, whatever the vendor's request shape. Everything the run
 * engine and the API routes need lives in this file; the adapters themselves are
 * reached through `createProvider()` in `./factory`.
 */
import type { EffortLevel, OutputMode, ProviderId } from "../domain/enums";

/** One alternative a character can pick. `id` is what the model must return. */
export type DecisionOption = {
  id: string;
  label: string;
  description?: string;
};

/** A single turn of the conversation sent to the model. */
export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/** Everything needed to ask one model for one choice. */
export type DecisionRequest = {
  model: string;
  /** Character steering. Undefined for a raw, unsteered character. */
  system?: string;
  /** The puzzle prompt, plus prior turns for iterated puzzles. */
  messages: ChatMessage[];
  /** Two to five alternatives. */
  options: DecisionOption[];
  outputMode: OutputMode;
  effort?: EffortLevel;
  /** Upper bound on output tokens; clamped to `MAX_OUTPUT_TOKENS` regardless. */
  maxTokens?: number;
  /** Short restatement of the decision, used as the TypeSafe `instructions`. */
  question?: string;
};

/** Token counts for one upstream call. */
export type DecisionUsage = {
  inputTokens: number;
  outputTokens: number;
};

/** The normalized answer: which option, how sure, and what it cost. */
export type DecisionRecord = {
  /** The id of the chosen option. */
  choice: string;
  /** Probability mass per option id, when the provider reports a distribution. */
  weights?: Record<string, number>;
  rationale?: string;
  /** Provider-reported confidence in the choice, from zero to one. */
  confidence?: number;
  usage?: DecisionUsage;
  latencyMs: number;
};

/** The exact bytes of one upstream round trip, for the logs screen and replay. */
export type ProviderCallRecord = {
  provider: ProviderId;
  model: string;
  outputMode: OutputMode;
  /** The exact body sent upstream. */
  request: unknown;
  /** The raw response, or a description of the failure. */
  response: unknown;
  startedAt: string;
  endedAt: string;
  error?: string;
};

/** Hook the engine passes in so every call lands in a span. */
export type TraceContext = {
  onCall?: (record: ProviderCallRecord) => void | Promise<void>;
};

/** What a model can be asked to do. `effort: []` means reasoning control is unsupported. */
export type ModelCapabilities = {
  structuredOutput: boolean;
  toolCalls: boolean;
  effort: EffortLevel[];
  contextWindow?: number;
};

/** One selectable model. */
export type ModelInfo = {
  id: string;
  label: string;
  capabilities: ModelCapabilities;
};

/** One vendor, behind one interface. */
export interface ProviderAdapter {
  id: ProviderId;
  label: string;
  listModels(): Promise<ModelInfo[]>;
  decide(req: DecisionRequest, ctx?: TraceContext): Promise<DecisionRecord>;
}

/** Options accepted by the `ProviderError` constructor. */
export type ProviderErrorOptions = {
  status?: number;
  /** Defaults to `true` for 408/409/429, any 5xx, and transport failures. */
  retryable?: boolean;
  cause?: unknown;
};

/** Whether an HTTP status is worth trying again. No status means a transport failure. */
export function isRetryableStatus(status?: number): boolean {
  if (status === undefined) return true;
  if (status === 408 || status === 409 || status === 429) return true;
  return status >= 500;
}

/** The single error type every adapter throws, whatever the vendor SDK raised. */
export class ProviderError extends Error {
  readonly provider: ProviderId;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(provider: ProviderId, message: string, options: ProviderErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "ProviderError";
    this.provider = provider;
    this.status = options.status;
    this.retryable = options.retryable ?? isRetryableStatus(options.status);
  }
}
