/**
 * One decision: a character, a puzzle prompt, and the provider call between them.
 *
 * This is the only place the three layers meet. The character contributes the
 * system message (its composed steering) and the model settings; the puzzle
 * contributes the user message, the options and the question; the provider layer
 * does the rest. A retryable failure is tried once more after a short pause,
 * because a 429 in the middle of a fifty-decision run should cost a second, not
 * a data point. Anything else — and a second failure — is recorded on the
 * decision and returned, never thrown: one lost answer is a result, not the end
 * of the run.
 */
import type { Character } from "@/lib/domain/character";
import { defaultEffort } from "@/lib/providers/env";
import { createProvider } from "@/lib/providers/factory";
import {
  ProviderError,
  type DecisionRecord,
  type DecisionRequest,
  type ProviderCallRecord,
  type TraceContext,
} from "@/lib/providers/types";
import { composeSteeringPrompt } from "@/lib/puzzles/characters/steering";
import type { PuzzlePrompt } from "@/lib/puzzles/types";

/** How long to wait before the one retry of a retryable failure. */
export const RETRY_DELAY_MS = 400;

export type DecideInput = {
  character: Character;
  prompt: PuzzlePrompt;
  /** Overrides the prompt's own question; used when a puzzle phrases it per round. */
  question?: string;
  ctx?: TraceContext;
  signal?: AbortSignal;
  /** Called before the retry, so the run log can say a call was repeated. */
  onRetry?: (error: ProviderError, attempt: number) => void | Promise<void>;
};

/** Either an answer or the reason there is none. Never both, never neither. */
export type DecideOutcome = {
  record?: DecisionRecord;
  error?: string;
};

/**
 * The system message: the character's steering first, then anything the puzzle
 * itself needs to say, separated by a blank line. Either half may be absent, and
 * when both are the model answers unsteered.
 */
export function mergeSystemPrompts(steering: string | null, puzzle?: string): string | undefined {
  const parts = [steering, puzzle].map((part) => part?.trim() ?? "").filter((part) => part.length > 0);
  return parts.length === 0 ? undefined : parts.join("\n\n");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Asks one character to make one decision. Resolves with the failure rather than throwing. */
export async function decideForCharacter(input: DecideInput): Promise<DecideOutcome> {
  const { character, prompt, ctx, signal } = input;
  const steering = await composeSteeringPrompt(character);

  const request: DecisionRequest = {
    model: character.model,
    system: mergeSystemPrompts(steering, prompt.system),
    messages: [{ role: "user" as const, content: prompt.user }],
    options: prompt.options,
    outputMode: character.outputMode,
    effort: character.effort ?? defaultEffort(),
    question: input.question ?? prompt.question,
  };

  const provider = createProvider(character.provider);

  for (let attempt = 1; ; attempt += 1) {
    try {
      return { record: await provider.decide(request, ctx) };
    } catch (error) {
      const retryable = error instanceof ProviderError && error.retryable;
      if (!retryable || attempt > 1 || signal?.aborted) return { error: messageOf(error) };
      await input.onRetry?.(error, attempt);
      await sleep(RETRY_DELAY_MS);
    }
  }
}

/** A decision plus the trace of it: what the engine needs to build one event. */
export type CollectedDecision = DecideOutcome & {
  calls: ProviderCallRecord[];
  startedAt: string;
  endedAt: string;
};

/**
 * {@link decideForCharacter} with the provider calls collected and the wall clock
 * read either side of it. Every runner goes through this, so an event's `calls`,
 * `startedAt` and `endedAt` mean the same thing in all three puzzles.
 */
export async function collectDecision(
  input: Omit<DecideInput, "ctx">,
): Promise<CollectedDecision> {
  const calls: ProviderCallRecord[] = [];
  const startedAt = new Date().toISOString();
  const outcome = await decideForCharacter({
    ...input,
    ctx: { onCall: (record) => void calls.push(record) },
  });
  return { ...outcome, calls, startedAt, endedAt: new Date().toISOString() };
}
