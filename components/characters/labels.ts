/**
 * The words the Characters screens use for the domain's enum values.
 *
 * They live here rather than beside each control so the list filters, the card
 * badges and the editor's segmented controls cannot drift into calling the same
 * mode two different things.
 */
import type { OutputMode, SteeringMode } from "@/lib/domain";

export const OUTPUT_MODE_LABELS: Record<OutputMode, string> = {
  structured: "Structured output",
  tool: "Tool call",
};

export const STEERING_MODE_LABELS: Record<SteeringMode, string> = {
  raw: "Raw",
  bio: "Bio only",
  full: "Full",
};

/** What each steering mode actually sends, one line each, for the editor. */
export const STEERING_MODE_HINTS: Record<SteeringMode, string> = {
  raw: "No system prompt at all. The model answers as itself.",
  bio: "The bio sentence alone becomes the system prompt.",
  full: "Bio, then principles, then values. Empty sections are left out.",
};

/** Shown in the effort select for a character that sets no effort of its own. */
export const PROVIDER_DEFAULT_EFFORT = "provider default";
