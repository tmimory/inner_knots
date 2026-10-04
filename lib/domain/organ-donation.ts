import { z } from "zod";

import { rosterSchema } from "./roster";

export const ORGAN_DONATION_VARIANTS = ["thought-experiment", "real-operator"] as const;
export const TRANSPLANT_ORGANS = ["heart", "lungs", "liver", "kidney"] as const;

export const ORGAN_DONATION_LIMITS = {
  minCandidates: 1,
  maxCandidates: 10,
  summary: 1200,
  shortText: 120,
  otherFactors: 800,
} as const;

export const HOSPITAL_IDS = [
  "mayo-rochester", "cleveland-clinic", "mass-general", "toronto-general",
  "royal-papworth", "hopital-pitie-salpetriere", "charite-berlin", "vall-hebron",
  "san-raffaele-milan", "rigshospitalet", "karolinska", "sheba",
  "singapore-general", "as-medical-center", "tokyo-university", "apollo-chennai",
  "groote-schuur", "chris-hani-baragwanath", "royal-melbourne", "auckland-city",
] as const;

export const candidateDossierSchema = z.object({
  id: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(ORGAN_DONATION_LIMITS.shortText),
  reviewSummary: z.string().trim().min(1).max(ORGAN_DONATION_LIMITS.summary),
  surgerySurvivalProbability: z.number().min(0).max(1),
  expectedGoodYearsGained: z.number().min(0).max(100),
  expectedLifetimeWithout: z.string().trim().min(1).max(ORGAN_DONATION_LIMITS.shortText),
  qualityOfLifeWithout: z.string().trim().min(1).max(ORGAN_DONATION_LIMITS.shortText),
  age: z.number().int().min(0).max(120),
  sex: z.enum(["female", "male", "intersex"]),
  maritalStatus: z.string().trim().min(1).max(ORGAN_DONATION_LIMITS.shortText),
  familyArrangement: z.string().trim().min(1).max(ORGAN_DONATION_LIMITS.shortText),
  religion: z.string().trim().min(1).max(ORGAN_DONATION_LIMITS.shortText),
  locality: z.enum(["local", "regional", "international"]),
  otherFactors: z.string().trim().min(1).max(ORGAN_DONATION_LIMITS.otherFactors),
  synthetic: z.literal(true).default(true),
});
export type CandidateDossier = z.infer<typeof candidateDossierSchema>;

export const organDonationConfigSchema = z.object({
  puzzle: z.literal("organ-donation"),
  variant: z.enum(ORGAN_DONATION_VARIANTS),
  organ: z.enum(TRANSPLANT_ORGANS),
  hospitalId: z.enum(HOSPITAL_IDS),
  candidates: z.array(candidateDossierSchema)
    .min(ORGAN_DONATION_LIMITS.minCandidates)
    .max(ORGAN_DONATION_LIMITS.maxCandidates),
  roster: rosterSchema,
});
export type OrganDonationConfig = z.infer<typeof organDonationConfigSchema>;

/** Cross-field checks kept outside the Zod object so it can join a discriminated union. */
export function validateOrganDonationConfig(config: Pick<OrganDonationConfig, "candidates">): string[] {
  const seen = new Set<string>();
  const issues: string[] = [];
  config.candidates.forEach((candidate, index) => {
    if (seen.has(candidate.id)) issues.push(`Candidate ${index + 1} repeats id "${candidate.id}".`);
    seen.add(candidate.id);
  });
  return issues;
}

const weightsSchema = z.record(z.string(), z.number());
export const organDonationDecisionSummarySchema = z.object({
  characterId: z.string(),
  iteration: z.number().int(),
  candidateId: z.string().optional(),
  weights: weightsSchema.optional(),
  confidence: z.number().optional(),
  latencyMs: z.number().optional(),
  error: z.string().optional(),
});
export type OrganDonationDecisionSummary = z.infer<typeof organDonationDecisionSummarySchema>;

export const organDonationSummarySchema = z.object({
  kind: z.literal("organ-donation"),
  decisions: z.array(organDonationDecisionSummarySchema),
  perCandidate: z.record(z.string(), z.number().int()),
  errors: z.number().int(),
});
export type OrganDonationSummary = z.infer<typeof organDonationSummarySchema>;
