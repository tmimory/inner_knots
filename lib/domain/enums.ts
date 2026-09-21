export const PROVIDER_IDS = ["typesafe", "openai", "anthropic", "local", "openrouter"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];
export const OUTPUT_MODES = ["structured", "tool"] as const;
export type OutputMode = (typeof OUTPUT_MODES)[number];
export const EFFORT_LEVELS = ["none", "low", "medium", "high"] as const;
export type EffortLevel = (typeof EFFORT_LEVELS)[number];
