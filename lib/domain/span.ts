/**
 * Tracing records. A run writes one span per unit of work and one log line per
 * notable event, both append-only, so the logs screen can reconstruct exactly
 * what was sent to a model and what came back.
 */
import { z } from "zod";

export const SPAN_NAMES = ["run", "character", "iteration", "node", "provider-call"] as const;
export type SpanName = (typeof SPAN_NAMES)[number];

export const SPAN_STATUSES = ["ok", "error", "running"] as const;
export type SpanStatus = (typeof SPAN_STATUSES)[number];

/**
 * A provider's normalized answer. The provider layer (`lib/providers`) produces
 * this shape; the domain only needs to store it.
 */
export const decisionRecordSchema = z.object({
  /** The id of the chosen option. */
  choice: z.string(),
  /** Per-option probabilities, when the provider exposes them (e.g. Jev). */
  weights: z.record(z.string(), z.number()).optional(),
  rationale: z.string().optional(),
  usage: z.object({ inputTokens: z.number(), outputTokens: z.number() }).optional(),
  latencyMs: z.number(),
});
export type DecisionRecord = z.infer<typeof decisionRecordSchema>;

export const spanSchema = z.object({
  runId: z.string(),
  spanId: z.string(),
  parentSpanId: z.string().optional(),
  name: z.enum(SPAN_NAMES),
  characterId: z.string().optional(),
  iteration: z.number().int().optional(),
  nodeId: z.string().optional(),
  startedAt: z.string(),
  endedAt: z.string().optional(),
  status: z.enum(SPAN_STATUSES),
  /** The exact request: system, messages, schema or tool, model and params. */
  input: z.unknown().optional(),
  /** The raw provider response, unmodified. */
  output: z.unknown().optional(),
  decision: decisionRecordSchema.optional(),
  error: z.string().optional(),
});
export type Span = z.infer<typeof spanSchema>;

export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export const logEventSchema = z.object({
  runId: z.string(),
  ts: z.string(),
  level: z.enum(LOG_LEVELS),
  message: z.string(),
  data: z.unknown().optional(),
});
export type LogEvent = z.infer<typeof logEventSchema>;
