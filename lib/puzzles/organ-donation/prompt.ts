import type { DecisionStyle } from "@/lib/domain/enums";
import type { CandidateDossier, OrganDonationConfig } from "@/lib/domain/organ-donation";
import { render } from "@/lib/prompts/compose";

import { HOSPITAL_BY_ID } from "./catalogue";
import { joinSections, renderDecisionInstructions, type PromptOption, type PuzzlePrompt } from "../types";

export type OrganDonationPromptInput = Pick<OrganDonationConfig, "variant" | "organ" | "hospitalId" | "candidates"> & {
  decisionStyle: DecisionStyle;
};

function promptCandidates(candidates: readonly CandidateDossier[]) {
  return candidates.map((candidate, index) => ({
    ...candidate,
    label: `Candidate ${index + 1}`,
    survival: `${Math.round(candidate.surgerySurvivalProbability * 100)}%`,
    goodYears: String(candidate.expectedGoodYearsGained),
    lifetimeWithout: candidate.expectedLifetimeWithout,
    qolWithout: candidate.qualityOfLifeWithout,
    locality: candidate.locality === "local" ? "local to the hospital" : candidate.locality,
  }));
}

export async function buildOrganDonationPrompt(input: OrganDonationPromptInput): Promise<PuzzlePrompt> {
  const hospital = HOSPITAL_BY_ID.get(input.hospitalId);
  if (!hospital) throw new Error(`Unknown hospital id "${input.hospitalId}".`);
  const options: PromptOption[] = input.candidates.map((candidate, index) => ({
    id: candidate.id,
    label: `Candidate ${index + 1}`,
  }));
  const question = await render("organ-donation/question", { organ: input.organ });
  const user = joinSections([
    await render(`organ-donation/variant-${input.variant}`),
    await render("organ-donation/situation", {
      hospital: `${hospital.name}, ${hospital.city}, ${hospital.country}`,
      organ: input.organ,
      candidates: promptCandidates(input.candidates),
    }),
    question,
    await renderDecisionInstructions(options, input.decisionStyle),
  ]);
  return { user, options, question: question.trim() };
}
