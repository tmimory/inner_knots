/**
 * OpenRouter — one key, several hundred models, wildly different capabilities.
 *
 * The catalogue is the interesting part: `/api/v1/models` reports each model's
 * `supported_parameters`, so capabilities are read from the provider instead of
 * guessed from an id prefix. That is what lets the UI grey out tool mode for a model
 * that has no tools rather than letting a run fail halfway through.
 */
import OpenAI from "openai";

import type { EffortLevel, ProviderId } from "../domain/enums";
import { clampMaxTokens } from "./clamp";
import { providerApiKey, requireApiKey } from "./env";
import { fetchJson, readTokenUsage } from "./shared/http";
import { buildChatBody, parseChatCompletion, type ChatBody } from "./shared/openai-chat";
import { buildDecisionRecord, createTracer } from "./shared/trace";
import {
  type DecisionRecord,
  type DecisionRequest,
  type ModelInfo,
  type ProviderAdapter,
  type TraceContext,
} from "./types";

const PROVIDER: ProviderId = "openrouter";
const LABEL = "OpenRouter";

/** OpenRouter's OpenAI-compatible endpoint. */
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/** Attribution headers OpenRouter shows on its activity page. Not secrets. */
export const OPENROUTER_HEADERS: Record<string, string> = {
  "HTTP-Referer": "https://github.com/inner-knots",
  "X-Title": "inner_knots",
};

const REASONING_EFFORTS: EffortLevel[] = ["low", "medium", "high"];

function client(): OpenAI {
  return new OpenAI({ apiKey: requireApiKey(PROVIDER), baseURL: OPENROUTER_BASE_URL, defaultHeaders: OPENROUTER_HEADERS });
}

/** One entry of `GET /api/v1/models`, narrowed to the fields we read. */
export type OpenRouterModel = {
  id?: unknown;
  name?: unknown;
  context_length?: unknown;
  supported_parameters?: unknown;
};

function supports(parameters: string[], ...names: string[]): boolean {
  return names.some((name) => parameters.includes(name));
}

/** Capabilities read from `supported_parameters`, not inferred from the model name. */
export function mapOpenRouterModel(model: OpenRouterModel): ModelInfo | undefined {
  const id = model.id;
  if (typeof id !== "string" || id === "") return undefined;
  const parameters = Array.isArray(model.supported_parameters)
    ? model.supported_parameters.filter((value): value is string => typeof value === "string")
    : [];
  const contextWindow = model.context_length;
  return {
    id,
    label: typeof model.name === "string" && model.name !== "" ? model.name : id,
    capabilities: {
      structuredOutput: supports(parameters, "structured_outputs", "response_format"),
      toolCalls: supports(parameters, "tools", "tool_choice"),
      effort: supports(parameters, "reasoning", "include_reasoning") ? [...REASONING_EFFORTS] : [],
      ...(typeof contextWindow === "number" && Number.isFinite(contextWindow) ? { contextWindow } : {}),
    },
  };
}

export function createOpenRouterAdapter(): ProviderAdapter {
  return {
    id: PROVIDER,
    label: LABEL,

    async listModels(): Promise<ModelInfo[]> {
      // The catalogue is public; the key is sent when present so per-account
      // model visibility and rate limits apply.
      const apiKey = providerApiKey(PROVIDER);
      const payload = await fetchJson<{ data?: OpenRouterModel[] }>(PROVIDER, `${OPENROUTER_BASE_URL}/models`, {
        headers: {
          Accept: "application/json",
          ...OPENROUTER_HEADERS,
          ...(apiKey === undefined ? {} : { Authorization: `Bearer ${apiKey}` }),
        },
      });
      return (payload.data ?? [])
        .map(mapOpenRouterModel)
        .filter((model): model is ModelInfo => model !== undefined)
        .sort((a, b) => a.label.localeCompare(b.label));
    },

    async decide(req: DecisionRequest, ctx?: TraceContext): Promise<DecisionRecord> {
      const tracer = createTracer({ provider: PROVIDER, model: req.model, outputMode: req.outputMode }, ctx);
      const body: ChatBody = buildChatBody({
        model: req.model,
        system: req.system,
        messages: req.messages,
        options: req.options,
        outputMode: req.outputMode,
        maxTokens: clampMaxTokens(req.maxTokens),
      });
      // `reasoning` is an OpenRouter extension to the OpenAI body, not an SDK field.
      if (req.effort !== undefined && req.effort !== "none") body.reasoning = { effort: req.effort };

      const api = client();
      const response: unknown = await tracer.run(body, () =>
        api.chat.completions.create(body as unknown as Parameters<OpenAI["chat"]["completions"]["create"]>[0]),
      );

      const parsed = parseChatCompletion(response, req.options, PROVIDER);
      const usage = readTokenUsage(response, { input: "prompt_tokens", output: "completion_tokens" });
      return buildDecisionRecord(parsed, usage, tracer);
    },
  };
}
