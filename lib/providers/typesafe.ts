/**
 * TypeSafe System One (Jev) — the odd one out, and the reason this layer exists.
 *
 * Jev does not generate text and has no prompt: it takes application state and named
 * questions and returns typed answers with a probability distribution. A puzzle
 * decision maps onto exactly one `choice` question whose criteria are the options, so
 * the character becomes state rather than instructions, and the answer arrives with
 * calibrated weights that a text model can only be asked to guess at.
 */
import { TypeSafeClient, choice, type ModelCard } from "@typesafe-ai/sdk";

import type { ProviderId } from "../domain/enums";
import { parseChoice } from "./shared/decision-schema";
import { createTracer } from "./shared/trace";
import { requireApiKey } from "./env";
import {
  ProviderError,
  type DecisionOption,
  type DecisionRecord,
  type DecisionRequest,
  type ModelInfo,
  type ProviderAdapter,
  type TraceContext,
} from "./types";

const PROVIDER: ProviderId = "typesafe";
const LABEL = "TypeSafe";

/** The SDK's own default model, and the one a new character should start on. */
export const DEFAULT_TYPESAFE_MODEL = "jev-latest";

/** Used when a puzzle does not restate its decision as a question. */
export const DEFAULT_INSTRUCTIONS = "Which option does this character choose?";

function client(): TypeSafeClient {
  return new TypeSafeClient({ apiKey: requireApiKey(PROVIDER) });
}

/** Options become criteria keyed by id, so the answer comes back as an option id. */
function toCriteria(options: DecisionOption[]): Record<string, string> {
  const criteria: Record<string, string> = {};
  for (const option of options) {
    criteria[option.id] = option.description ? `${option.label} — ${option.description}` : option.label;
  }
  return criteria;
}

/** Keeps only weights whose key is a real option, so a stray key cannot poison a chart. */
function toWeights(probabilities: unknown, options: DecisionOption[]): Record<string, number> | undefined {
  if (probabilities === null || typeof probabilities !== "object") return undefined;
  const source = probabilities as Record<string, unknown>;
  const weights: Record<string, number> = {};
  for (const option of options) {
    const value = source[option.id];
    if (typeof value === "number" && Number.isFinite(value)) weights[option.id] = value;
  }
  return Object.keys(weights).length > 0 ? weights : undefined;
}

function toModelInfo(card: ModelCard): ModelInfo {
  return {
    id: card.name,
    label: card.name,
    capabilities: { structuredOutput: true, toolCalls: false, effort: [] },
  };
}

/** Alphabetical, with the default model pinned first so the UI opens on it. */
function orderModels(models: ModelInfo[]): ModelInfo[] {
  const sorted = [...models].sort((a, b) => a.id.localeCompare(b.id));
  const defaultIndex = sorted.findIndex((model) => model.id === DEFAULT_TYPESAFE_MODEL);
  if (defaultIndex === -1) {
    return [
      { id: DEFAULT_TYPESAFE_MODEL, label: DEFAULT_TYPESAFE_MODEL, capabilities: { structuredOutput: true, toolCalls: false, effort: [] } },
      ...sorted,
    ];
  }
  const [preferred] = sorted.splice(defaultIndex, 1);
  return preferred ? [preferred, ...sorted] : sorted;
}

export function createTypeSafeAdapter(): ProviderAdapter {
  return {
    id: PROVIDER,
    label: LABEL,

    async listModels(): Promise<ModelInfo[]> {
      const cards = await client().models.list();
      return orderModels(cards.map(toModelInfo));
    },

    async decide(req: DecisionRequest, ctx?: TraceContext): Promise<DecisionRecord> {
      if (req.outputMode === "tool") {
        throw new ProviderError(PROVIDER, "TypeSafe answers questions and does not call tools; use structured mode", {
          retryable: false,
        });
      }

      const tracer = createTracer({ provider: PROVIDER, model: req.model, outputMode: "structured" }, ctx);
      const body = {
        model: req.model,
        // The character is state, not an instruction: Jev judges the situation it is given.
        state: {
          character: req.system ?? null,
          transcript: req.messages.map((message) => ({ role: message.role, content: message.content })),
        },
        questions: { decision: choice(req.question ?? DEFAULT_INSTRUCTIONS, toCriteria(req.options)) },
      };

      const response = await tracer.run(body, () => client().systemOne(body));
      const answer = response.answers.decision;
      const parsed = parseChoice(answer.choice, req.options, PROVIDER);

      return {
        choice: parsed.choice,
        ...(toWeights(answer.probabilities, req.options) ? { weights: toWeights(answer.probabilities, req.options) } : {}),
        ...(typeof answer.confidence === "number" ? { confidence: answer.confidence } : {}),
        usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
        latencyMs: tracer.elapsedMs(),
      };
    },
  };
}
