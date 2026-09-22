export const PROVIDER_IDS = ["typesafe", "openai", "anthropic", "local", "openrouter"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];
export const OUTPUT_MODES = ["structured", "tool"] as const;
export type OutputMode = (typeof OUTPUT_MODES)[number];
export const EFFORT_LEVELS = ["none", "low", "medium", "high"] as const;
export type EffortLevel = (typeof EFFORT_LEVELS)[number];

/**
 * How a prompt should tell the model to answer.
 *
 * `structured` and `tool` mirror the character's `OutputMode`. `judgment` is the
 * TypeSafe style: Jev is handed the prompt as *state* and one `choice` question
 * whose criteria are the options, so it never reads instructions about response
 * formats and must not be given any.
 */
export const DECISION_STYLES = ["structured", "tool", "judgment"] as const;
export type DecisionStyle = (typeof DECISION_STYLES)[number];

/** The decision style a character's provider and output mode call for. */
export function decisionStyleFor(provider: ProviderId, outputMode: OutputMode): DecisionStyle {
  return provider === "typesafe" ? "judgment" : outputMode;
}
