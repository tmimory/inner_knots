/**
 * `POST /api/prompts/trolley` — the composed trolley prompt for a configuration.
 *
 * Track contents are sent as **object ids** and are resolved here through
 * `resolveTrolleyObjects`, the same function the run engine uses: the user's own
 * objects first, the built-in catalogue second. A preview therefore shows the
 * exact wording a run would send, and an id neither half knows is a 400 naming
 * it rather than a silently missing item in the middle of a prompt.
 *
 * Body: `{ config: { variant, track1: string[], track2: string[], outputMode? } }`
 * Returns: `{ prompt: { user, options, question } }`
 */
import { z } from "zod";

import { badRequest, handle, ok, readBody } from "@/lib/api/http";
import { previewOutputModeSchema } from "@/lib/api/schemas";
import { trolleyConfigSchema } from "@/lib/domain/run";
import { RunSetupError, resolveTrolleyObjects } from "@/lib/engine/setup";
import { buildTrolleyPrompt } from "@/lib/puzzles/trolley/prompt";
import type { PuzzlePrompt } from "@/lib/puzzles/types";

const bodySchema = z.object({
  config: trolleyConfigSchema
    .omit({ roster: true })
    .extend({ outputMode: previewOutputModeSchema }),
});

export type TrolleyPromptResponse = { prompt: PuzzlePrompt };

export const POST = handle(async (request: Request) => {
  const { config } = await readBody(request, bodySchema);

  let track1, track2;
  try {
    [track1, track2] = await Promise.all([
      resolveTrolleyObjects(config.track1),
      resolveTrolleyObjects(config.track2),
    ]);
  } catch (error) {
    if (error instanceof RunSetupError) return badRequest(error.message);
    throw error;
  }

  const prompt = await buildTrolleyPrompt({
    variant: config.variant,
    track1,
    track2,
    outputMode: config.outputMode,
  });

  return ok({ prompt } satisfies TrolleyPromptResponse);
});
