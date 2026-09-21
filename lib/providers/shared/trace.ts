/**
 * One place where a provider call is timed, recorded, and its error normalized.
 *
 * Every upstream round trip produces a `ProviderCallRecord` whether it succeeded or
 * not — a failed call is exactly the one you want to read later — so adapters route
 * their HTTP through `tracer.run()` rather than awaiting the SDK directly. An adapter
 * that retries (the local JSON-schema fallback, for instance) calls `run` twice and
 * the log shows both attempts.
 */
import type { OutputMode, ProviderId } from "../../domain/enums";
import { ProviderError, isRetryableStatus, type DecisionRecord, type DecisionUsage, type ProviderCallRecord, type TraceContext } from "../types";
import type { ParsedChoice } from "./decision-schema";

/** Identifies the calls a tracer emits. */
export type TracerInfo = {
  provider: ProviderId;
  model: string;
  outputMode: OutputMode;
};

/** Per-call overrides. */
export type TracerRunOptions = {
  /**
   * Extra fields merged into the *recorded* request only, never into the body sent
   * upstream. Used to mark a fallback path, e.g. `{ structuredVia: "forced-tool" }`.
   */
  requestNote?: Record<string, unknown>;
};

/** Times and records upstream calls for one `decide()`. */
export type Tracer = {
  run<T>(request: unknown, call: () => Promise<T>, options?: TracerRunOptions): Promise<T>;
  /** Milliseconds since the tracer was created, i.e. the whole decision. */
  elapsedMs(): number;
};

type ErrorLike = {
  message?: unknown;
  status?: unknown;
  statusCode?: unknown;
  name?: unknown;
  error?: unknown;
  body?: unknown;
  response?: { status?: unknown };
};

function asErrorLike(error: unknown): ErrorLike {
  return error !== null && typeof error === "object" ? (error as ErrorLike) : {};
}

function statusOf(error: unknown): number | undefined {
  const candidate = asErrorLike(error);
  for (const value of [candidate.status, candidate.statusCode, candidate.response?.status]) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

function messageOf(error: unknown): string {
  if (error instanceof Error && error.message !== "") return error.message;
  const candidate = asErrorLike(error);
  if (typeof candidate.message === "string" && candidate.message !== "") return candidate.message;
  return String(error);
}

/** Turns any thrown value into the layer's single error type, preserving status. */
export function toProviderError(provider: ProviderId, error: unknown): ProviderError {
  if (error instanceof ProviderError) return error;
  const status = statusOf(error);
  return new ProviderError(provider, messageOf(error), {
    status,
    retryable: isRetryableStatus(status),
    cause: error,
  });
}

/** What gets stored as the "response" of a failed call. */
export function errorPayload(error: unknown): unknown {
  const candidate = asErrorLike(error);
  return {
    name: error instanceof Error ? error.name : typeof candidate.name === "string" ? candidate.name : "Error",
    message: messageOf(error),
    status: statusOf(error) ?? null,
    body: candidate.error ?? candidate.body ?? null,
  };
}

/** Creates the tracer for one decision. Safe to use with no `TraceContext`. */
export function createTracer(info: TracerInfo, ctx?: TraceContext): Tracer {
  const createdAt = Date.now();

  async function emit(record: ProviderCallRecord): Promise<void> {
    if (!ctx?.onCall) return;
    try {
      await ctx.onCall(record);
    } catch {
      // A broken trace sink must never turn a good model answer into a failure.
    }
  }

  return {
    elapsedMs: () => Date.now() - createdAt,
    async run<T>(request: unknown, call: () => Promise<T>, options?: TracerRunOptions): Promise<T> {
      const recordedRequest =
        options?.requestNote && request !== null && typeof request === "object"
          ? { ...(request as Record<string, unknown>), ...options.requestNote }
          : request;
      const startedAt = new Date().toISOString();
      try {
        const response = await call();
        await emit({
          provider: info.provider,
          model: info.model,
          outputMode: info.outputMode,
          request: recordedRequest,
          response,
          startedAt,
          endedAt: new Date().toISOString(),
        });
        return response;
      } catch (error) {
        const normalized = toProviderError(info.provider, error);
        await emit({
          provider: info.provider,
          model: info.model,
          outputMode: info.outputMode,
          request: recordedRequest,
          response: errorPayload(error),
          startedAt,
          endedAt: new Date().toISOString(),
          error: normalized.message,
        });
        throw normalized;
      }
    },
  };
}

/**
 * Assembles the `DecisionRecord` every non-TypeSafe adapter returns: a choice, its
 * optional rationale, optional usage, and the elapsed time off the tracer. TypeSafe's
 * own epilogue differs (it also carries weights and confidence) and builds its record
 * by hand.
 */
export function buildDecisionRecord(
  parsed: ParsedChoice,
  usage: DecisionUsage | undefined,
  tracer: Tracer,
): DecisionRecord {
  return {
    choice: parsed.choice,
    ...(parsed.rationale === undefined ? {} : { rationale: parsed.rationale }),
    ...(usage === undefined ? {} : { usage }),
    latencyMs: tracer.elapsedMs(),
  };
}
