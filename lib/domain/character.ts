/**
 * Character: a model plus its configuration plus the convictions we hand it.
 *
 * The composed steering prompt is derived (see `lib/puzzles/characters/steering.ts`),
 * never stored, so editing a prompt fragment changes every character at once.
 */
import { z } from "zod";

import { EFFORT_LEVELS, OUTPUT_MODES, PROVIDER_IDS } from "./enums";

/** Length and count caps shown in the editor and enforced by the schema. */
export const CHARACTER_LIMITS = {
  id: 64,
  name: 80,
  bio: 500,
  principle: 500,
  value: 500,
  maxPrinciples: 10,
  maxValues: 10,
} as const;

/**
 * Character ids are user-chosen and appear in file paths, URLs and prompts, so
 * they are restricted to a safe, space-free alphabet.
 */
export const CHARACTER_ID_PATTERN = /^[A-Za-z0-9_.-]{1,64}$/;

export const characterIdSchema = z
  .string()
  .regex(CHARACTER_ID_PATTERN, "Use 1-64 letters, digits, dot, dash or underscore, with no spaces");

/** How much of the character's convictions reach the model. */
export const STEERING_MODES = ["raw", "bio", "full"] as const;
export type SteeringMode = (typeof STEERING_MODES)[number];

export const avatarSchema = z.object({
  /** Key into the SVG avatar set in `components/avatars`. */
  shape: z.string().min(1),
  /** Id of an entry in the theme's `avatarPalette`. */
  color: z.string().min(1),
});
export type Avatar = z.infer<typeof avatarSchema>;

export const steeringSchema = z.object({
  mode: z.enum(STEERING_MODES),
  bio: z.string().max(CHARACTER_LIMITS.bio).optional(),
  principles: z.array(z.string().max(CHARACTER_LIMITS.principle)).max(CHARACTER_LIMITS.maxPrinciples),
  values: z.array(z.string().max(CHARACTER_LIMITS.value)).max(CHARACTER_LIMITS.maxValues),
});
export type Steering = z.infer<typeof steeringSchema>;

export const characterSchema = z.object({
  id: characterIdSchema,
  /** Display name. Falls back to `id` when absent. */
  name: z.string().max(CHARACTER_LIMITS.name).optional(),
  avatar: avatarSchema,
  provider: z.enum(PROVIDER_IDS),
  model: z.string().min(1),
  outputMode: z.enum(OUTPUT_MODES),
  effort: z.enum(EFFORT_LEVELS).optional(),
  steering: steeringSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Character = z.infer<typeof characterSchema>;

/** The shape a client may send: timestamps are stamped by the store. */
export const characterInputSchema = characterSchema.partial({ createdAt: true, updatedAt: true });
export type CharacterInput = z.infer<typeof characterInputSchema>;

/** What to show for a character in lists and prompts. */
export function characterDisplayName(character: Pick<Character, "id" | "name">): string {
  return character.name?.trim() || character.id;
}
