/**
 * OpenAI, through the Responses API.
 *
 * Responses is the current surface and the only one that carries `reasoning.effort`,
 * which is the whole point for this app: the same puzzle asked at four effort levels
 * is one of the steering strategies under test. Character steering goes in
 * `instructions` rather than a system message, so the puzzle transcript stays
 * exactly what the puzzle wrote.
 */
import OpenAI from "openai";

import type { EffortLevel, ProviderId } from "../domain/enums";
import { clampMaxTokens } from "./clamp";
import { requireApiKey } from "./env";
import {
  DECISION_SCHEMA_NAME,
  DECISION_TOOL_NAME,
  buildDecisionTool,
  buildStrictDecisionSchema,
  parseChoice,
} from "./shared/decision-schema";
import { asRecord, readTokenUsage } from "./shared/http";
import { buildDecisionRecord, createTracer } from "./shared/trace";
import {
  ProviderError,
  type DecisionRecord,
  type DecisionRequest,
  type ModelInfo,
  type ProviderAdapter,
  type TraceContext,
} from "./types";

const PROVIDER: ProviderId = "openai";
const LABEL = "OpenAI";

/** Model id prefixes that accept `reasoning.effort`. The one place this list lives. */
export const REASONING_MODEL_PREFIXES = ["o1", "o3", "o4", "gpt-5", "gpt-6"] as const;

/** Reasoning families whose lowest setting is `minimal` rather than `low`. */
export const MINIMAL_EFFORT_PREFIXES = ["gpt-5", "gpt-6"] as const;

/** Chat-capable id prefixes kept by `listModels`. */
const CHAT_MODEL_PREFIXES = ["gpt-", "o1", "o3", "o4", "chatgpt-"] as const;

/** Modalities and utilities that cannot answer a puzzle. */
const NON_CHAT_PATTERN = /audio|realtime|tts|transcribe|whisper|embedding|image|dall-e|moderation|search-preview|codex/i;

function client(): OpenAI {
  return new OpenAI({ apiKey: requireApiKey(PROVIDER) });
}

/** Whether a model id belongs to a reasoning family. */
export function isReasoningModel(model: string): boolean {
  return REASONING_MODEL_PREFIXES.some((prefix) => model.startsWith(prefix));
}

/**
 * Our effort scale mapped onto OpenAI's. `none` becomes `minimal` on the families
 * that have it and is dropped entirely elsewhere, because the o-series has no
 * setting below `low`.
 */
export function mapEffort(model: string, effort: EffortLevel | undefined): string | undefined {
  if (effort === undefined || !isReasoningModel(model)) return undefined;
  if (effort !== "none") return effort;
  return MINIMAL_EFFORT_PREFIXES.some((prefix) => model.startsWith(prefix)) ? "minimal" : undefined;
}

/** The effort levels a model will accept, for the capability badge in the UI. */
function effortLevels(model: string): EffortLevel[] {
  if (!isReasoningModel(model)) return [];
  const base: EffortLevel[] = ["low", "medium", "high"];
  return MINIMAL_EFFORT_PREFIXES.some((prefix) => model.startsWith(prefix)) ? ["none", ...base] : base;
}

function isChatModel(id: string): boolean {
  if (NON_CHAT_PATTERN.test(id)) return false;
  return CHAT_MODEL_PREFIXES.some((prefix) => id.startsWith(prefix));
}

function outputItems(response: unknown): Record<string, unknown>[] {
  const output = asRecord(response)?.output;
  if (!Array.isArray(output)) return [];
  return output.map(asRecord).filter((item): item is Record<string, unknown> => item !== undefined);
}

/** The assistant's text, preferring the SDK's `output_text` convenience field. */
function readText(response: unknown): string | undefined {
  const direct = asRecord(response)?.output_text;
  if (typeof direct === "string" && direct.trim() !== "") return direct;
  const parts: string[] = [];
  for (const item of outputItems(response)) {
    if (item.type !== "message") continue;
    const content = item.content;
    if (!Array.isArray(content)) continue;
    for (const raw of content) {
      const part = asRecord(raw);
      if (part?.type === "output_text" && typeof part.text === "string") parts.push(part.text);
    }
  }
  const joined = parts.join("");
  return joined.trim() === "" ? undefined : joined;
}

/** The `choose` call's arguments, when the model answered in tool mode. */
function readToolArguments(response: unknown): string | undefined {
  for (const item of outputItems(response)) {
    if (item.type !== "function_call") continue;
    if (item.name !== undefined && item.name !== DECISION_TOOL_NAME) continue;
    if (typeof item.arguments === "string") return item.arguments;
    if (item.arguments !== undefined) return JSON.stringify(item.arguments);
  }
  return undefined;
}

/** The exact body, built as a plain object so the trace records what was sent. */
export function buildResponsesBody(req: DecisionRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: req.model,
    input: req.messages.map((message) => ({ role: message.role, content: message.content })),
    max_output_tokens: clampMaxTokens(req.maxTokens),
  };
  if (req.system !== undefined && req.system.trim() !== "") body.instructions = req.system;

  if (req.outputMode === "structured") {
    body.text = {
      format: {
        type: "json_schema",
        name: DECISION_SCHEMA_NAME,
        schema: buildStrictDecisionSchema(req.options),
        strict: true,
      },
    };
  } else {
    const tool = buildDecisionTool(req.options, true);
    body.tools = [
      { type: "function", name: tool.name, description: tool.description, parameters: tool.parameters, strict: true },
    ];
    body.tool_choice = { type: "function", name: tool.name };
  }

  const effort = mapEffort(req.model, req.effort);
  if (effort !== undefined) body.reasoning = { effort };
  return body;
}

export function createOpenAIAdapter(): ProviderAdapter {
  return {
    id: PROVIDER,
    label: LABEL,

    async listModels(): Promise<ModelInfo[]> {
      const page = await client().models.list();
      return page.data
        .map((model) => model.id)
        .filter(isChatModel)
        .sort((a, b) => a.localeCompare(b))
        .map((id) => ({
          id,
          label: id,
          capabilities: { structuredOutput: true, toolCalls: true, effort: effortLevels(id) },
        }));
    },

    async decide(req: DecisionRequest, ctx?: TraceContext): Promise<DecisionRecord> {
      const tracer = createTracer({ provider: PROVIDER, model: req.model, outputMode: req.outputMode }, ctx);
      const body = buildResponsesBody(req);
      const response: unknown = await tracer.run(body, () =>
        client().responses.create(body as unknown as Parameters<OpenAI["responses"]["create"]>[0]),
      );

      const source = req.outputMode === "tool" ? readToolArguments(response) : readText(response);
      if (source === undefined) {
        const status = asRecord(response)?.status;
        throw new ProviderError(
          PROVIDER,
          `Response carried no ${req.outputMode === "tool" ? "choose tool call" : "text output"}${
            typeof status === "string" ? ` (status: ${status})` : ""
          }`,
          { retryable: false },
        );
      }

      const parsed = parseChoice(source, req.options, PROVIDER);
      const usage = readTokenUsage(response, { input: "input_tokens", output: "output_tokens" });
      return buildDecisionRecord(parsed, usage, tracer);
    },
  };
}
