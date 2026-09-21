/**
 * The one shape every provider is asked to produce: a choice, optionally a reason.
 *
 * Both output modes carry the same JSON schema — structured mode as the response
 * format, tool mode as the single `choose` tool's parameters — so a run can compare
 * the two modes without the prompt changing underneath them.
 */
import type { ProviderId } from "../../domain/enums";
import { ProviderError, type DecisionOption } from "../types";

/** The single tool every adapter defines in tool mode. */
export const DECISION_TOOL_NAME = "choose";
/** The schema name sent with structured output formats. */
export const DECISION_SCHEMA_NAME = "decision";

const CHOICE_DESCRIPTION = "The id of the option you choose. Must be one of the listed ids.";
const RATIONALE_DESCRIPTION = "One short sentence, at most 25 words, explaining the choice.";
const TOOL_DESCRIPTION = "Record the option you choose. Call this exactly once.";

/** The decision schema as sent to providers that do not enforce strict mode. */
export type DecisionSchema = {
  type: "object";
  properties: {
    choice: { type: "string"; enum: string[]; description: string };
    rationale: { type: string | string[]; description: string };
  };
  required: string[];
  additionalProperties: false;
};

/** A single-function tool definition, in the vendor-neutral shape adapters reshape. */
export type DecisionTool = {
  name: string;
  description: string;
  parameters: DecisionSchema;
};

function optionIds(options: DecisionOption[]): string[] {
  return options.map((option) => option.id);
}

/**
 * The decision schema. `rationale` is optional so a model may omit it; the output
 * token clamp, not the schema, is what keeps it short.
 */
export function buildDecisionSchema(options: DecisionOption[]): DecisionSchema {
  return {
    type: "object",
    properties: {
      choice: { type: "string", enum: optionIds(options), description: CHOICE_DESCRIPTION },
      rationale: { type: "string", description: RATIONALE_DESCRIPTION },
    },
    required: ["choice"],
    additionalProperties: false,
  };
}

/**
 * The same schema for providers running it in strict mode, where every property must
 * appear in `required`. `rationale` becomes nullable instead of optional, which is
 * the only way OpenAI-style strict schemas express "may be omitted".
 */
export function buildStrictDecisionSchema(options: DecisionOption[]): DecisionSchema {
  return {
    type: "object",
    properties: {
      choice: { type: "string", enum: optionIds(options), description: CHOICE_DESCRIPTION },
      rationale: { type: ["string", "null"], description: RATIONALE_DESCRIPTION },
    },
    required: ["choice", "rationale"],
    additionalProperties: false,
  };
}

/** The `choose` tool, carrying whichever schema variant the provider needs. */
export function buildDecisionTool(options: DecisionOption[], strict = false): DecisionTool {
  return {
    name: DECISION_TOOL_NAME,
    description: TOOL_DESCRIPTION,
    parameters: strict ? buildStrictDecisionSchema(options) : buildDecisionSchema(options),
  };
}

/** A human-readable option list, for providers that need the choice spelled out in text. */
export function describeOptions(options: DecisionOption[]): string {
  return options
    .map((option) =>
      option.description ? `- ${option.id}: ${option.label} — ${option.description}` : `- ${option.id}: ${option.label}`,
    )
    .join("\n");
}

/** The instruction appended when a server can only promise "some JSON object". */
export function jsonObjectInstruction(options: DecisionOption[]): string {
  return [
    "Answer with a single JSON object and nothing else:",
    '{"choice": "<one of the ids below>", "rationale": "<one short sentence>"}',
    "Options:",
    describeOptions(options),
  ].join("\n");
}

/** Lowercased, unquoted, stripped of trailing punctuation, for forgiving comparison. */
function normalize(value: string): string {
  return value
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/[.,;:!?]+$/g, "")
    .trim()
    .toLowerCase();
}

function matchOption(value: string, options: DecisionOption[]): DecisionOption | undefined {
  const exact = options.find((option) => option.id === value.trim());
  if (exact) return exact;
  const normalized = normalize(value);
  return (
    options.find((option) => normalize(option.id) === normalized) ??
    options.find((option) => normalize(option.label) === normalized)
  );
}

/** What a provider actually said, once the wrapper has been peeled off. */
export type ParsedChoice = {
  choice: string;
  rationale?: string;
};

function coerce(source: unknown, provider: ProviderId): { choice: unknown; rationale?: unknown } {
  if (typeof source === "string") {
    const text = source.trim();
    if (text === "") {
      throw new ProviderError(provider, "Model returned an empty response", { retryable: false });
    }
    try {
      const parsed: unknown = JSON.parse(text);
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as { choice: unknown; rationale?: unknown };
      }
      return { choice: parsed };
    } catch {
      // Not JSON: treat the whole reply as the chosen id or label.
      return { choice: text };
    }
  }
  if (source !== null && typeof source === "object" && !Array.isArray(source)) {
    return source as { choice: unknown; rationale?: unknown };
  }
  throw new ProviderError(provider, `Model returned an unusable response of type ${typeof source}`, {
    retryable: false,
  });
}

/**
 * Validates a model's answer against the offered options. Accepts the option id,
 * the same id in any case, or the option's label as a fallback for models that
 * echo what they saw rather than the id.
 */
export function parseChoice(source: unknown, options: DecisionOption[], provider: ProviderId): ParsedChoice {
  const payload = coerce(source, provider);
  const raw = payload.choice;
  if (typeof raw !== "string") {
    throw new ProviderError(provider, `Model returned a non-string choice (${JSON.stringify(raw)})`, {
      retryable: false,
    });
  }
  const matched = matchOption(raw, options);
  if (!matched) {
    throw new ProviderError(
      provider,
      `Model chose "${raw}", which is not one of: ${optionIds(options).join(", ")}`,
      { retryable: false },
    );
  }
  const rationale = typeof payload.rationale === "string" && payload.rationale.trim() !== "" ? payload.rationale.trim() : undefined;
  return rationale === undefined ? { choice: matched.id } : { choice: matched.id, rationale };
}
