import { z } from "zod";

import { badRequest, handle, ok, readBody } from "@/lib/api/http";
import { previewDecisionStyleSchema } from "@/lib/api/schemas";
import { organDonationConfigSchema, validateOrganDonationConfig } from "@/lib/domain/organ-donation";
import { buildOrganDonationPrompt } from "@/lib/puzzles/organ-donation/prompt";
import type { PuzzlePrompt } from "@/lib/puzzles/types";

const bodySchema = z.object({
  config: organDonationConfigSchema.omit({ roster: true }).extend({ decisionStyle: previewDecisionStyleSchema }),
});

export type OrganDonationPromptResponse = { prompt: PuzzlePrompt };

export const POST = handle(async (request: Request) => {
  const { config } = await readBody(request, bodySchema);
  const issues = validateOrganDonationConfig(config);
  if (issues.length > 0) return badRequest(issues.join(" "));
  return ok({ prompt: await buildOrganDonationPrompt(config) } satisfies OrganDonationPromptResponse);
});
