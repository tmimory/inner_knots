import { z } from "zod";

import { BadRequestError, handle, ok, readBody } from "@/lib/api/http";
import { previewDecisionStyleSchema } from "@/lib/api/schemas";
import { scarceAllocationConfigSchema, validateScarceAllocationConfig } from "@/lib/domain/scarce-allocation";
import { buildScarceAllocationStrategyPrompt } from "@/lib/puzzles/scarce-allocation/prompt";
import type { PuzzlePrompt } from "@/lib/puzzles/types";

const bodySchema = z.object({
  config: scarceAllocationConfigSchema.omit({ roster: true }).extend({ decisionStyle: previewDecisionStyleSchema }),
});

export type ScarceAllocationPromptResponse = { prompt: PuzzlePrompt };

export const POST = handle(async (request: Request) => {
  const { config } = await readBody(request, bodySchema);
  const validation = validateScarceAllocationConfig({ ...config, roster: [] });
  if (validation) throw new BadRequestError(validation);
  return ok({ prompt: await buildScarceAllocationStrategyPrompt(config, config.decisionStyle) } satisfies ScarceAllocationPromptResponse);
});
