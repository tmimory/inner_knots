/**
 * Request shaping and response reading for OpenAI-compatible `/chat/completions`.
 *
 * Two providers speak this dialect — a local server and OpenRouter — and they differ
 * only in base URL, headers, and which extra parameters they honour. Everything they
 * share lives here so the two adapters stay thin and cannot drift apart.
 */
import type { OutputMode, ProviderId } from "../../domain/enums";
import type { ChatMessage, DecisionOption } from "../types";
import { ProviderError } from "../types";
import {
  DECISION_SCHEMA_NAME,
  DECISION_TOOL_NAME,
  buildDecisionTool,
  buildStrictDecisionSchema,
  jsonObjectInstruction,
  parseChoice,
  type ParsedChoice,
} from "./decision-schema";
import { asRecord } from "./http";
import { withSystemMessage } from "./messages";

/** How a server is being asked to guarantee JSON. */
export type StructuredVia = "json_schema" | "json_object";

export type ChatBodyInput = {
  model: string;
  system?: string;
  messages: ChatMessage[];
  options: DecisionOption[];
  outputMode: OutputMode;
  maxTokens: number;
  /** Only consulted in structured mode. Defaults to `json_schema`. */
  structuredVia?: StructuredVia;
};

/** A chat-completions body. Kept as a plain object so it can be logged verbatim. */
export type ChatBody = Record<string, unknown>;

/**
 * Builds the body. In `json_object` mode the schema cannot be enforced, so the
 * option list is appended to the system prompt instead — the only way a bare
 * JSON-mode server learns which ids are legal.
 */
export function buildChatBody(input: ChatBodyInput): ChatBody {
  const via: StructuredVia = input.structuredVia ?? "json_schema";
  const structured = input.outputMode === "structured";
  const system =
    structured && via === "json_object"
      ? [input.system, jsonObjectInstruction(input.options)].filter((part) => part && part.trim() !== "").join("\n\n")
      : input.system;

  const body: ChatBody = {
    model: input.model,
    messages: withSystemMessage(system, input.messages),
    max_tokens: input.maxTokens,
  };

  if (structured) {
    body.response_format =
      via === "json_schema"
        ? {
            type: "json_schema",
            json_schema: {
              name: DECISION_SCHEMA_NAME,
              schema: buildStrictDecisionSchema(input.options),
              strict: true,
            },
          }
        : { type: "json_object" };
    return body;
  }

  const tool = buildDecisionTool(input.options);
  body.tools = [
    { type: "function", function: { name: tool.name, description: tool.description, parameters: tool.parameters } },
  ];
  body.tool_choice = { type: "function", function: { name: tool.name } };
  return body;
}

type ChatToolCall = { function?: { name?: unknown; arguments?: unknown } };
type ChatMessagePayload = { content?: unknown; tool_calls?: unknown };
type ChatChoice = { message?: unknown; finish_reason?: unknown };

function firstMessage(response: unknown): ChatMessagePayload | undefined {
  const record = asRecord(response);
  const choices = record?.choices;
  if (!Array.isArray(choices) || choices.length === 0) return undefined;
  const choice = choices[0] as ChatChoice;
  return asRecord(choice?.message) as ChatMessagePayload | undefined;
}

/** The `choose` call's arguments, or undefined when the model answered in prose. */
function toolArguments(message: ChatMessagePayload): string | undefined {
  const calls = message.tool_calls;
  if (!Array.isArray(calls)) return undefined;
  for (const raw of calls) {
    const call = raw as ChatToolCall;
    const fn = call.function;
    if (!fn) continue;
    if (fn.name !== undefined && fn.name !== DECISION_TOOL_NAME) continue;
    if (typeof fn.arguments === "string") return fn.arguments;
    if (fn.arguments !== undefined) return JSON.stringify(fn.arguments);
  }
  return undefined;
}

/** Reads the chosen option out of a chat completion, whichever mode produced it. */
export function parseChatCompletion(
  response: unknown,
  options: DecisionOption[],
  provider: ProviderId,
): ParsedChoice {
  const message = firstMessage(response);
  if (!message) {
    throw new ProviderError(provider, "Response contained no choices", { retryable: false });
  }
  const args = toolArguments(message);
  if (args !== undefined) return parseChoice(args, options, provider);
  if (typeof message.content === "string") return parseChoice(message.content, options, provider);
  throw new ProviderError(provider, "Response contained neither a tool call nor text content", { retryable: false });
}

/** True when a server rejected the strict JSON-schema response format specifically. */
export function isSchemaUnsupported(error: unknown): boolean {
  if (!(error instanceof ProviderError)) return false;
  if (error.status !== 400 && error.status !== 404 && error.status !== 422 && error.status !== 501) return false;
  return /json_schema|response_format|schema|structured/i.test(error.message);
}
