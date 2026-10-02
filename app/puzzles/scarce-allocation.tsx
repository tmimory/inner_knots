import { useCallback, useMemo } from "react";
import { View } from "react-native";

import { CustomerEditor, ScarceAllocationResults } from "@/components/puzzles/scarce-allocation";
import { CountStepper } from "@/components/puzzles/count-stepper";
import { PromptView } from "@/components/puzzles/prompt-view";
import { RosterBar } from "@/components/puzzles/roster-bar";
import { RunFooter } from "@/components/puzzles/run-footer";
import { Section } from "@/components/puzzles/section";
import { Subsection } from "@/components/puzzles/subsection";
import { VariantSelect, type VariantOption } from "@/components/puzzles/variant-select";
import { Screen } from "@/components/shell";
import { Button, Input, Label, Text } from "@/components/ui";
import { previewScarceAllocationPrompt } from "@/lib/client/prompts";
import { useCharacters } from "@/lib/client/use-characters";
import { usePersistedState } from "@/lib/client/use-persisted-state";
import { seatedCharacters, usePromptPreview } from "@/lib/client/use-prompt-preview";
import { useRun, useRunStarter } from "@/lib/client/use-run";
import { SCARCE_ALLOCATION_LIMITS, type ScarceAllocationVariant } from "@/lib/domain/scarce-allocation";
import { RUN_LIMITS } from "@/lib/domain/roster";
import { DEFAULT_SCARCE_ALLOCATION_SETUP, parseScarceAllocationSetup, scarceAllocationBlockedReason, scarceAllocationConfig, scarceAllocationRuns, type ScarceAllocationSetup } from "@/lib/puzzles/scarce-allocation/ui-helpers";
import { indexById } from "@/lib/utils";

const VARIANTS: readonly VariantOption<ScarceAllocationVariant>[] = [
  { id: "thought-experiment", label: "Thought experiment", description: "Consider the allocation at a distance." },
  { id: "real-operator", label: "Real operator", description: "Act as the fulfillment manager responsible for the outcome." },
];

export default function ScarceAllocationScreen() {
  const { characters } = useCharacters();
  const [setup, setSetup] = usePersistedState<ScarceAllocationSetup>("puzzles.scarce-allocation", DEFAULT_SCARCE_ALLOCATION_SETUP, parseScarceAllocationSetup);
  const byId = useMemo(() => indexById(characters), [characters]);
  const seated = useMemo(() => seatedCharacters(setup.roster, byId), [setup.roster, byId]);
  const patch = useCallback((changes: Partial<ScarceAllocationSetup>) => setSetup({ ...setup, ...changes }), [setup, setSetup]);
  const prompt = usePromptPreview(async (viewpoint) => {
    const { roster: _roster, ...config } = scarceAllocationConfig(setup);
    const response = await previewScarceAllocationPrompt({ ...config, decisionStyle: viewpoint?.decisionStyle });
    return [{ user: response.prompt.user, system: response.prompt.system, options: response.prompt.options }];
  }, { characters: seated });
  const starter = useRunStarter();
  const { run, summary } = useRun(starter.runId);
  const allocation = summary?.kind === "scarce-allocation" ? summary : undefined;
  const runConfig = run?.config.puzzle === "scarce-allocation" ? run.config : undefined;
  const blocked = scarceAllocationBlockedReason(setup);

  const updateCustomer = (index: number, customer: ScarceAllocationSetup["customers"][number]) => patch({ customers: setup.customers.map((item, itemIndex) => itemIndex === index ? customer : item) });
  const moveCustomer = (index: number, direction: -1 | 1) => {
    const customers = [...setup.customers];
    const target = index + direction;
    [customers[index], customers[target]] = [customers[target]!, customers[index]!];
    patch({ customers });
  };
  const addCustomer = () => patch({ customers: [...setup.customers, { id: `customer-${Date.now()}`, name: "", orderedQuantity: 100, description: "" }] });

  return (
    <Screen title="Scarce Allocation" subtitle="Who receives what when supply fails">
      <View className="border-t-hairline border-border pt-xl"><Subsection title="Characters"><RosterBar value={setup.roster} onChange={(roster) => patch({ roster })} characters={characters} max={RUN_LIMITS.maxRoster} min={0} showRuns showCount={false} /></Subsection></View>
      <Section title="The shortage" right={<Button variant="link" size="sm" onPress={() => void prompt.show()}><Text>View prompt</Text></Button>}>
        <View className="gap-lg">
          <Subsection title="Framing"><VariantSelect value={setup.variant} onChange={(variant) => patch({ variant })} options={VARIANTS} /></Subsection>
          <View className="flex-row flex-wrap items-start gap-lg">
            <View className="min-w-field gap-xs">
              <Label>Quantity available</Label>
              <CountStepper value={setup.availableQuantity} onChange={(availableQuantity) => patch({ availableQuantity })} min={0} max={SCARCE_ALLOCATION_LIMITS.quantity} label="Quantity available" />
            </View>
            <View className="min-w-card flex-1 gap-xs">
              <Label>Delivery time frame</Label>
              <Input accessibilityLabel="Delivery time frame" value={setup.timeFrame} onChangeText={(timeFrame) => patch({ timeFrame })} maxLength={SCARCE_ALLOCATION_LIMITS.timeFrame} />
            </View>
          </View>
        </View>
      </Section>
      <Section title="Customers">
        <View className="gap-lg">
          {setup.customers.map((customer, index) => <CustomerEditor key={customer.id} customer={customer} index={index} count={setup.customers.length} onChange={(next) => updateCustomer(index, next)} onMove={(direction) => moveCustomer(index, direction)} onRemove={() => patch({ customers: setup.customers.filter((_, itemIndex) => itemIndex !== index) })} />)}
          <Button className="self-start" variant="outline" disabled={setup.customers.length >= SCARCE_ALLOCATION_LIMITS.customers} onPress={addCustomer}><Text>Add customer</Text></Button>
        </View>
        <RunFooter blocked={blocked} cost={`${setup.availableQuantity} available · ${setup.customers.reduce((sum, customer) => sum + customer.orderedQuantity, 0)} ordered · ${scarceAllocationRuns(setup.roster)} allocation decision${scarceAllocationRuns(setup.roster) === 1 ? "" : "s"} across ${setup.customers.length} customer${setup.customers.length === 1 ? "" : "s"}.`} label="Allocate supply" starting={starter.starting} onStart={() => void starter.start(scarceAllocationConfig(setup))} run={run} error={starter.error} />
      </Section>
      {allocation?.decisions.length && runConfig ? <Section title="Results"><ScarceAllocationResults summary={allocation} config={runConfig} characters={byId} runId={starter.runId} /></Section> : null}
      <PromptView open={prompt.open} onOpenChange={prompt.setOpen} title="Scarce allocation prompt" description="The initial strategy decision as the selected character will read it." panels={prompt.panels} loading={prompt.loading} error={prompt.error} viewpoints={prompt.viewpoints} viewpointId={prompt.viewpoint?.id} onViewpointChange={prompt.setViewpoint} />
    </Screen>
  );
}
