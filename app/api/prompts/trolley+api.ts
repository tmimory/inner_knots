/**
 * `POST /api/prompts/trolley` — the composed trolley prompt for a configuration.
 *
 * Track contents are sent as **object ids** and are resolved through the objects
 * collection here, so a preview always shows the same wording a run would send.
 * An id that is not in the collection is a 400 naming the id, rather than a
 * silently missing item in the middle of a prompt.
 *
 * Body: `{ config: { variant, track1: string[], track2: string[], outputMode? } }`
 * Returns: `{ prompt: { user, options } }`
 */
import { z } from "zod";

import { badRequest, handle, ok, readBody } from "@/lib/api/http";
import { previewOutputModeSchema } from "@/lib/api/schemas";
import { trolleyConfigSchema } from "@/lib/domain/run";
import type { TrolleyObject } from "@/lib/domain/trolley-object";
import { buildTrolleyPrompt, type TrackItem } from "@/lib/puzzles/trolley/prompt";
import type { PuzzlePrompt } from "@/lib/puzzles/types";
import { trolleyObjects } from "@/lib/storage/collections";

const bodySchema = z.object({
  config: trolleyConfigSchema
    .omit({ roster: true })
    .extend({ outputMode: previewOutputModeSchema }),
});

export type TrolleyPromptResponse = { prompt: PuzzlePrompt };

/** Maps ids to objects, collecting the ids that are not in the collection. */
function resolveTrack(ids: readonly string[], byId: Map<string, TrolleyObject>) {
  const items: TrackItem[] = [];
  const unknown: string[] = [];
  for (const id of ids) {
    const object = byId.get(id);
    if (object) items.push(object);
    else unknown.push(id);
  }
  return { items, unknown };
}

export const POST = handle(async (request: Request) => {
  const { config } = await readBody(request, bodySchema);
  const byId = new Map((await trolleyObjects.list()).map((object) => [object.id, object]));

  const track1 = resolveTrack(config.track1, byId);
  const track2 = resolveTrack(config.track2, byId);
  const unknown = [...new Set([...track1.unknown, ...track2.unknown])];
  if (unknown.length > 0) {
    return badRequest(`Unknown object ids: ${unknown.map((id) => `"${id}"`).join(", ")}.`);
  }

  const prompt = await buildTrolleyPrompt({
    variant: config.variant,
    track1: track1.items,
    track2: track2.items,
    outputMode: config.outputMode,
  });

  return ok({ prompt } satisfies TrolleyPromptResponse);
});
