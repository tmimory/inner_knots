/**
 * A local OpenAI-compatible server (Ollama, LM Studio, llama.cpp, vLLM).
 *
 * Local servers advertise the OpenAI chat API but implement different amounts of it.
 * Strict `json_schema` output is the part most likely to be missing, so structured
 * mode tries the schema first and falls back to plain JSON mode with the option list
 * spelled out in the prompt. Both attempts land in the trace, which is how you tell
 * "the model chose badly" from "the server never enforced the schema".
 */
import OpenAI from "openai";

import type { ProviderId } from "../domain/enums";
import { clampMaxTokens } from "./clamp";
import { localApiKey, localBaseUrl } from "./env";
import { fetchJson, joinUrl, readTokenUsage } from "./shared/http";
import { buildChatBody, isSchemaUnsupported, parseChatCompletion, type ChatBody } from "./shared/openai-chat";
import { buildDecisionRecord, createTracer } from "./shared/trace";
import type {
  DecisionRecord,
  DecisionRequest,
  ModelInfo,
  ProviderAdapter,
  TraceContext,
} from "./types";

const PROVIDER: ProviderId = "local";
const LABEL = "Local";

function client(): OpenAI {
  return new OpenAI({ baseURL: localBaseUrl(), apiKey: localApiKey() });
}

type ModelListResponse = { data?: { id?: unknown }[] };

export function createLocalAdapter(): ProviderAdapter {
  return {
    id: PROVIDER,
    label: LABEL,

    async listModels(): Promise<ModelInfo[]> {
      const key = localApiKey();
      const payload = await fetchJson<ModelListResponse>(PROVIDER, joinUrl(localBaseUrl(), "models"), {
        headers: { Accept: "application/json", Authorization: `Bearer ${key}` },
      });
      const ids = (payload.data ?? [])
        .map((model) => model.id)
        .filter((id): id is string => typeof id === "string" && id !== "");
      return ids
        .sort((a, b) => a.localeCompare(b))
        .map((id) => ({
          id,
          label: id,
          // A local server rarely says what it supports; assume the common case and
          // let the structured fallback handle a server that cannot keep the promise.
          capabilities: { structuredOutput: true, toolCalls: true, effort: [] },
        }));
    },

    async decide(req: DecisionRequest, ctx?: TraceContext): Promise<DecisionRecord> {
      const tracer = createTracer({ provider: PROVIDER, model: req.model, outputMode: req.outputMode }, ctx);
      const api = client();
      const maxTokens = clampMaxTokens(req.maxTokens);
      const create = (body: ChatBody, note?: Record<string, unknown>): Promise<unknown> =>
        tracer.run(
          body,
          () => api.chat.completions.create(body as unknown as Parameters<OpenAI["chat"]["completions"]["create"]>[0]),
          { requestNote: note },
        );

      const base = { model: req.model, system: req.system, messages: req.messages, options: req.options, outputMode: req.outputMode, maxTokens };
      let response: unknown;
      try {
        response = await create(buildChatBody(base));
      } catch (error) {
        if (req.outputMode !== "structured" || !isSchemaUnsupported(error)) throw error;
        response = await create(buildChatBody({ ...base, structuredVia: "json_object" }), {
          structuredVia: "json-object",
        });
      }

      const parsed = parseChatCompletion(response, req.options, PROVIDER);
      const usage = readTokenUsage(response, { input: "prompt_tokens", output: "completion_tokens" });
      return buildDecisionRecord(parsed, usage, tracer);
    },
  };
}
