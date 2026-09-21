import { View } from "react-native";

import { Text } from "@/components/ui";

import { JsonTree } from "./json-tree";
import { MessageBlock } from "./message-block";

/**
 * A provider-call span stores the body that went upstream, in that vendor's own
 * shape: OpenAI-compatible servers send `{ model, messages, response_format }`,
 * Anthropic sends `system` beside `messages`, TypeSafe sends
 * `{ state: { character, transcript }, questions }`. The reader wants the same
 * thing from all three — what the model was told, and under what settings — so
 * the shapes are normalized here and anything unrecognized falls through to the
 * JSON tree rather than being dropped.
 */
export type CallMessage = { role: string; content: string };

export type CallInput = {
  model?: string;
  /** The system prompt first, then the turns, in the order the model saw them. */
  messages: CallMessage[];
  /** Everything else in the request body: schema, tools, token caps, effort. */
  params: Record<string, unknown>;
};

/** Keys read into `messages`; the rest of the body becomes `params`. */
const PROMPT_KEYS = new Set(["model", "system", "messages", "state"]);

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/** A message's content as text: a string as it stands, anything else as JSON. */
function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === undefined) return "";
  return JSON.stringify(value, null, 2) ?? String(value);
}

function toMessage(turn: unknown): CallMessage {
  const record = asRecord(turn);
  if (!record) return { role: "message", content: asText(turn) };
  return {
    role: typeof record.role === "string" ? record.role : "message",
    content: asText(record.content),
  };
}

/** Reads a stored request body into the prompt the model saw plus its settings. */
export function readCallInput(input: unknown): CallInput | undefined {
  const record = asRecord(input);
  if (!record) return undefined;

  const state = asRecord(record.state);
  const messages: CallMessage[] = [];

  const system = record.system ?? state?.character;
  if (system !== undefined && system !== null && system !== "") {
    messages.push({ role: "system", content: asText(system) });
  }

  const turns = Array.isArray(record.messages)
    ? record.messages
    : Array.isArray(state?.transcript)
      ? state.transcript
      : [];
  for (const turn of turns) messages.push(toMessage(turn));

  const params: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (!PROMPT_KEYS.has(key)) params[key] = value;
  }
  for (const [key, value] of Object.entries(state ?? {})) {
    if (key !== "character" && key !== "transcript") params[`state.${key}`] = value;
  }

  if (messages.length === 0 && Object.keys(params).length === 0) return undefined;

  return {
    model: typeof record.model === "string" ? record.model : undefined,
    messages,
    params,
  };
}

/** The model a stored request names, for a span row that has no room for more. */
export function readModel(input: unknown): string | undefined {
  const model = asRecord(input)?.model;
  return typeof model === "string" ? model : undefined;
}

/** The exact request: the prompt as prose, the settings as JSON. */
export function SpanInputView({ input }: { input: unknown }) {
  const call = readCallInput(input);
  if (!call) return <JsonTree value={input} label="input" openDepth={2} />;

  return (
    <View className="gap-md">
      {call.messages.map((message, index) => (
        <MessageBlock key={`${message.role}-${index}`} role={message.role} content={message.content} />
      ))}
      {call.messages.length === 0 ? (
        <Text variant="muted">This call carried no prompt of its own.</Text>
      ) : null}
      {Object.keys(call.params).length > 0 ? (
        <JsonTree value={call.params} label="parameters" openDepth={1} />
      ) : null}
    </View>
  );
}
