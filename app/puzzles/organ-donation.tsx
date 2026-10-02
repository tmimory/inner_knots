import { useMemo, useState } from "react";
import { View } from "react-native";

import { Screen } from "@/components/shell";
import { PromptView } from "@/components/puzzles/prompt-view";
import { RosterBar } from "@/components/puzzles/roster-bar";
import { RunFooter } from "@/components/puzzles/run-footer";
import { Section } from "@/components/puzzles/section";
import { Subsection } from "@/components/puzzles/subsection";
import { VariantSelect, type VariantOption } from "@/components/puzzles/variant-select";
import { DossierEditor, DossierView, EMPTY_DOSSIER, OrganDonationResults, type DossierDraft } from "@/components/puzzles/organ-donation";
import { Button, Field, Segmented, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Text, type SelectOption } from "@/components/ui";
import { apiFetch } from "@/lib/client/api";
import { useCharacters } from "@/lib/client/use-characters";
import { usePersistedState } from "@/lib/client/use-persisted-state";
import { seatedCharacters, usePromptPreview } from "@/lib/client/use-prompt-preview";
import { useRun, useRunStarter } from "@/lib/client/use-run";
import type { RosterEntry } from "@/lib/domain/roster";
import { RUN_LIMITS } from "@/lib/domain/roster";
import { ORGAN_DONATION_LIMITS, ORGAN_DONATION_VARIANTS, TRANSPLANT_ORGANS, candidateDossierSchema, type CandidateDossier, type OrganDonationConfig } from "@/lib/domain/organ-donation";
import { pluralize } from "@/lib/format";
import { BUILT_IN_DOSSIERS, HOSPITALS } from "@/lib/puzzles/organ-donation/catalogue";
import { parseRoster } from "@/lib/puzzles/setup-parse";
import { indexById } from "@/lib/utils";

const VARIANTS: readonly VariantOption<OrganDonationConfig["variant"]>[] = [
  { id: "thought-experiment", label: "Thought experiment", description: "A hypothetical allocation with no real patients or clinical decision." },
  { id: "real-operator", label: "Real operator", description: "You act as the duty officer and the answer carries operational weight." },
];

type Setup = Omit<OrganDonationConfig, "puzzle"> & { custom: CandidateDossier[] };
const INITIAL: Setup = { variant: "thought-experiment", organ: "heart", hospitalId: "mayo-rochester", candidates: BUILT_IN_DOSSIERS.slice(0, 3), custom: [], roster: [] };

function parseSetup(raw: unknown): Setup | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const value = raw as Partial<Record<keyof Setup, unknown>>;
  const dossiers = (input: unknown) => Array.isArray(input) ? input.flatMap((item) => { const parsed = candidateDossierSchema.safeParse(item); return parsed.success ? [parsed.data] : []; }) : [];
  const variant = ORGAN_DONATION_VARIANTS.find((item) => item === value.variant) ?? INITIAL.variant;
  const organ = TRANSPLANT_ORGANS.find((item) => item === value.organ) ?? INITIAL.organ;
  const hospitalId = HOSPITALS.find((item) => item.id === value.hospitalId)?.id ?? INITIAL.hospitalId;
  return { variant, organ, hospitalId: hospitalId as Setup["hospitalId"], candidates: dossiers(value.candidates).slice(0, ORGAN_DONATION_LIMITS.maxCandidates), custom: dossiers(value.custom), roster: parseRoster(value.roster, { max: RUN_LIMITS.maxRoster, runs: "stored" }) };
}

export default function OrganDonationScreen() {
  const { characters } = useCharacters();
  const [setup, setSetup] = usePersistedState<Setup>("puzzles.organ-donation", INITIAL, parseSetup);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<DossierDraft>(EMPTY_DOSSIER);
  const [libraryId, setLibraryId] = useState<string | undefined>(undefined);
  const patch = (changes: Partial<Setup>) => setSetup({ ...setup, ...changes });
  const characterIndex = useMemo(() => indexById(characters), [characters]);
  const seated = useMemo(() => seatedCharacters(setup.roster, characterIndex), [setup.roster, characterIndex]);
  const allDossiers = useMemo(() => [...setup.custom, ...BUILT_IN_DOSSIERS], [setup.custom]);
  const selectedHospital = HOSPITALS.find((item) => item.id === setup.hospitalId) ?? HOSPITALS[0]!;
  const prompt = usePromptPreview(async (viewpoint) => {
    const response = await apiFetch<{ prompt: { system?: string; user: string; options: {id:string;label:string}[] } }>("/api/prompts/organ-donation", { method: "POST", body: JSON.stringify({ config: { puzzle: "organ-donation", ...setup, custom: undefined, roster: undefined, decisionStyle: viewpoint?.decisionStyle } }) });
    return [response.prompt];
  }, { characters: seated });
  const starter = useRunStarter();
  const { run, summary } = useRun(starter.runId);
  const donationSummary = summary?.kind === "organ-donation" ? summary : undefined;
  const resultCandidates = run?.config.puzzle === "organ-donation"
    ? run.config.candidates
    : setup.candidates;
  const chosen = new Set(setup.candidates.map((item) => item.id));
  const blocked = setup.roster.length === 0 ? "Put at least one character on the roster." : setup.candidates.length === 0 ? "Choose at least one candidate." : null;
  const total = setup.roster.reduce((sum, entry) => sum + entry.runs, 0);
  const hospitalOption: SelectOption = { value: selectedHospital.id, label: `${selectedHospital.name} — ${selectedHospital.city}` };
  const availableDossiers = allDossiers.filter((dossier) => !chosen.has(dossier.id));
  const libraryDossier = availableDossiers.find((dossier) => dossier.id === libraryId);
  const libraryOption: SelectOption | undefined = libraryDossier
    ? { value: libraryDossier.id, label: libraryDossier.label }
    : undefined;

  return (
    <Screen title="Organ Donation" subtitle="μία δωρεά · one organ, several claims">
      <View className="border-t-hairline border-border pt-xl"><Subsection title="Characters"><RosterBar value={setup.roster} onChange={(roster: RosterEntry[]) => patch({ roster })} characters={characters} max={RUN_LIMITS.maxRoster} min={0} showRuns showCount={false} /></Subsection></View>
      <Section title="Framing" right={<Button variant="link" size="sm" onPress={() => void prompt.show()}><Text>View prompt</Text></Button>}><VariantSelect value={setup.variant} onChange={(variant) => patch({ variant })} options={VARIANTS} /></Section>
      <Section title="Transplant setting" description="Hospitals are real institutions. Every candidate and clinical detail is synthetic.">
        <View className="flex-row flex-wrap gap-lg">
          <Field label="Hospital" className="min-w-popover flex-1"><Select value={hospitalOption} onValueChange={(option) => option?.value && patch({ hospitalId: option.value as Setup["hospitalId"] })}><SelectTrigger><SelectValue placeholder="Choose a hospital" /></SelectTrigger><SelectContent>{HOSPITALS.map((hospital) => <SelectItem key={hospital.id} value={hospital.id} label={`${hospital.name} — ${hospital.city}, ${hospital.country}`} />)}</SelectContent></Select></Field>
          <Field label="Organ" className="min-w-popover flex-1"><Segmented label="Organ" value={setup.organ} onChange={(organ) => patch({ organ })} options={TRANSPLANT_ORGANS.map((organ) => ({ value: organ, label: organ[0]!.toUpperCase() + organ.slice(1) }))} /></Field>
        </View>
      </Section>
      <Section title="Anonymous candidates" description={`Choose 1–${ORGAN_DONATION_LIMITS.maxCandidates}. The model sees ordinal labels only.`} right={<Button variant="outline" size="sm" onPress={() => setCreating(true)}><Text>Create dossier</Text></Button>}>
        {creating ? <DossierEditor value={draft} onChange={setDraft} onCancel={() => setCreating(false)} onSave={(dossier) => { patch({ custom: [dossier, ...setup.custom], candidates: setup.candidates.length < ORGAN_DONATION_LIMITS.maxCandidates ? [...setup.candidates, dossier] : setup.candidates }); setDraft(EMPTY_DOSSIER); setCreating(false); }} /> : null}
        <View className="flex-row flex-wrap items-end gap-sm">
          <Field label="Dossier library" className="min-w-card flex-1">
            <Select
              value={libraryOption}
              onValueChange={(option) => setLibraryId(option?.value)}
              disabled={availableDossiers.length === 0}
            >
              <SelectTrigger><SelectValue placeholder="Choose a synthetic dossier" /></SelectTrigger>
              <SelectContent>
                {availableDossiers.map((dossier) => <SelectItem key={dossier.id} value={dossier.id} label={dossier.label} />)}
              </SelectContent>
            </Select>
          </Field>
          <Button
            variant="outline"
            disabled={!libraryDossier || setup.candidates.length >= ORGAN_DONATION_LIMITS.maxCandidates}
            onPress={() => {
              if (!libraryDossier) return;
              patch({ candidates: [...setup.candidates, libraryDossier] });
              setLibraryId(undefined);
            }}
          ><Text>Add candidate</Text></Button>
        </View>
        <View className="gap-md">
          {setup.candidates.map((dossier, index) => (
            <DossierView
              key={dossier.id}
              dossier={dossier}
              ordinal={index + 1}
              action={<Button variant="ghost" size="sm" onPress={() => patch({ candidates: setup.candidates.filter((item) => item.id !== dossier.id) })}><Text>Remove candidate {index + 1}</Text></Button>}
            />
          ))}
        </View>
        <RunFooter blocked={blocked} cost={`${pluralize(total, "decision")} across ${pluralize(setup.candidates.length, "candidate")}.`} label="Allocate organ" starting={starter.starting} onStart={() => void starter.start({ puzzle: "organ-donation", variant: setup.variant, organ: setup.organ, hospitalId: setup.hospitalId, candidates: setup.candidates, roster: setup.roster })} run={run} error={starter.error} />
      </Section>
      {donationSummary?.decisions.length ? <Section title="Results"><OrganDonationResults summary={donationSummary} candidates={resultCandidates} /></Section> : null}
      <PromptView open={prompt.open} onOpenChange={prompt.setOpen} title="Organ donation prompt" description="The puzzle prompt for the selected character; steering is prepended separately." panels={prompt.panels} loading={prompt.loading} error={prompt.error} viewpoints={prompt.viewpoints} viewpointId={prompt.viewpoint?.id} onViewpointChange={prompt.setViewpoint} />
    </Screen>
  );
}
