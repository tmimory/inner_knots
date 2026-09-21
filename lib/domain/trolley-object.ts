/**
 * TrolleyObject: something that can be placed on a trolley track.
 *
 * `label` is what the UI shows; `prompt` is the noun phrase that gets spliced
 * into the track description ("your neighbour's eldest daughter").
 */
import { z } from "zod";

export const TROLLEY_OBJECT_LIMITS = {
  id: 64,
  label: 80,
  prompt: 250,
  maxTags: 10,
  tag: 40,
} as const;

export const trolleyObjectSchema = z.object({
  id: z.string().min(1).max(TROLLEY_OBJECT_LIMITS.id),
  label: z.string().min(1).max(TROLLEY_OBJECT_LIMITS.label),
  /** Noun phrase used inside the composed situation prompt. */
  prompt: z.string().min(1).max(TROLLEY_OBJECT_LIMITS.prompt),
  /** Key into the SVG icon set. */
  icon: z.string().min(1),
  /** Seeded objects are `true`; anything the user made is `false`. */
  builtIn: z.boolean(),
  tags: z.array(z.string().max(TROLLEY_OBJECT_LIMITS.tag)).max(TROLLEY_OBJECT_LIMITS.maxTags),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TrolleyObject = z.infer<typeof trolleyObjectSchema>;

/** What a client may send: timestamps are stamped by the store, and a
 * user-made object is not built in and has no tags unless it says so. */
export const trolleyObjectInputSchema = trolleyObjectSchema
  .partial({ createdAt: true, updatedAt: true })
  .extend({
    builtIn: z.boolean().default(false),
    tags: z.array(z.string().max(TROLLEY_OBJECT_LIMITS.tag)).max(TROLLEY_OBJECT_LIMITS.maxTags).default([]),
  });
export type TrolleyObjectInput = z.infer<typeof trolleyObjectInputSchema>;
