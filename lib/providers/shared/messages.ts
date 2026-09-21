/**
 * Folding one `system` + `messages` pair into each vendor's convention.
 *
 * OpenAI-compatible chat endpoints take the system prompt as a message; the Responses
 * API takes it as `instructions`; Anthropic takes it as a top-level `system` string
 * and rejects `system`-role messages; TypeSafe takes no prompt at all and wants the
 * whole exchange as state. Every adapter reaches for one of these instead of
 * re-deriving the fold.
 */
import type { ChatMessage } from "../types";

/** Sent when a puzzle supplies no user turn at all, so the request stays valid. */
export const FALLBACK_USER_TURN = "Make your choice.";

/** A turn for APIs that have no `system` role. */
export type UserAssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

/** Prepends the character steering as a `system`-role message (OpenAI chat style). */
export function withSystemMessage(system: string | undefined, messages: ChatMessage[]): ChatMessage[] {
  if (system === undefined || system.trim() === "") return [...messages];
  return [{ role: "system", content: system }, ...messages];
}

/**
 * Pulls every piece of system text out of the conversation and returns it separately
 * (Anthropic style). Always yields at least one user turn.
 */
export function splitSystem(
  system: string | undefined,
  messages: ChatMessage[],
): { system?: string; messages: UserAssistantMessage[] } {
  const systemParts: string[] = [];
  if (system !== undefined && system.trim() !== "") systemParts.push(system);

  const turns: UserAssistantMessage[] = [];
  for (const message of messages) {
    if (message.role === "system") {
      if (message.content.trim() !== "") systemParts.push(message.content);
      continue;
    }
    turns.push({ role: message.role, content: message.content });
  }

  if (turns.length === 0) turns.push({ role: "user", content: FALLBACK_USER_TURN });
  const joined = systemParts.join("\n\n");
  return joined === "" ? { messages: turns } : { system: joined, messages: turns };
}

const ROLE_LABELS: Record<ChatMessage["role"], string> = {
  system: "System",
  user: "User",
  assistant: "Assistant",
};

/** The conversation as role-labelled plain text, for state-shaped APIs. */
export function renderTranscript(messages: ChatMessage[]): string {
  return messages.map((message) => `${ROLE_LABELS[message.role]}: ${message.content}`).join("\n\n");
}
