import { describe, expect, it } from "vitest";

import { candidateDossierSchema, organDonationConfigSchema, validateOrganDonationConfig } from "@/lib/domain/organ-donation";
import { BUILT_IN_DOSSIERS, HOSPITALS } from "./catalogue";
import { buildOrganDonationPrompt } from "./prompt";
import { emptySummary, reduce, type OrganDonationDecisionEvent } from "./summary";

describe("organ donation catalogue and schema", () => {
  it("ships dozens of valid synthetic dossiers and 20 referenced hospitals", () => {
    expect(BUILT_IN_DOSSIERS.length).toBeGreaterThanOrEqual(36);
    expect(HOSPITALS).toHaveLength(20);
    expect(new Set(HOSPITALS.map((item) => item.id)).size).toBe(20);
    for (const dossier of BUILT_IN_DOSSIERS) {
      expect(candidateDossierSchema.safeParse(dossier).success).toBe(true);
      expect(dossier.synthetic).toBe(true);
      if (dossier.familyArrangement.startsWith("Unmarried")) expect(dossier.maritalStatus).not.toBe("Married");
    }
    for (const hospital of HOSPITALS) expect(hospital.officialUrl).toMatch(/^https:\/\//);
  });

  it("accepts one candidate and rejects more than ten", () => {
    const base = { puzzle: "organ-donation", variant: "thought-experiment", organ: "kidney", hospitalId: "mayo-rochester", roster: [{ characterId: "hume", runs: 1 }] } as const;
    expect(organDonationConfigSchema.safeParse({ ...base, candidates: [BUILT_IN_DOSSIERS[0]] }).success).toBe(true);
    expect(organDonationConfigSchema.safeParse({ ...base, candidates: [] }).success).toBe(false);
    expect(organDonationConfigSchema.safeParse({ ...base, candidates: BUILT_IN_DOSSIERS.slice(0, 10) }).success).toBe(true);
    expect(organDonationConfigSchema.safeParse({ ...base, candidates: BUILT_IN_DOSSIERS.slice(0, 11) }).success).toBe(false);
    expect(validateOrganDonationConfig({ candidates: [BUILT_IN_DOSSIERS[0]!, BUILT_IN_DOSSIERS[0]!] })).toHaveLength(1);
  });
});

describe("organ donation prompt", () => {
  it("anonymizes custom labels while preserving every dossier field", async () => {
    const candidate = { ...BUILT_IN_DOSSIERS[0]!, label: "Do not expose this label" };
    const prompt = await buildOrganDonationPrompt({ variant: "real-operator", organ: "heart", hospitalId: "royal-papworth", candidates: [candidate], decisionStyle: "structured" });
    expect(prompt.options).toEqual([{ id: candidate.id, label: "Candidate 1" }]);
    expect(prompt.user).not.toContain(candidate.label);
    expect(prompt.user).toContain("Candidate 1");
    expect(prompt.user).toContain("Royal Papworth Hospital");
    expect(prompt.user).toContain(candidate.familyArrangement);
    expect(prompt.user).toContain(candidate.religion);
    expect(prompt.user).toContain(candidate.otherFactors);
  });
});

describe("organ donation summary", () => {
  const candidates = BUILT_IN_DOSSIERS.slice(0, 2);
  const event = (choice?: string, error?: string): OrganDonationDecisionEvent => ({
    path: [], calls: [], startedAt: "2026-01-01T00:00:00.000Z", endedAt: "2026-01-01T00:00:01.000Z",
    decision: choice ? { choice, latencyMs: 10 } : undefined, error,
    data: { characterId: "hume", iteration: 1 },
  });

  it("counts known candidates and records unknown choices as errors", () => {
    const first = reduce(emptySummary({ candidates }), event(candidates[1]!.id));
    const second = reduce(first, event("not-a-candidate"));
    expect(second.perCandidate[candidates[1]!.id]).toBe(1);
    expect(second.errors).toBe(1);
    expect(second.decisions[1]?.candidateId).toBeUndefined();
  });
});
