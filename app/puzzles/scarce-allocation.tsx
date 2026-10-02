import { useCallback, useMemo } from "react";
import { View } from "react-native";

import { CustomerEditor, PlanEditor, ScarceAllocationResults } from "@/components/puzzles/scarce-allocation";
import { CountStepper } from "@/components/puzzles/count-stepper";
import { PromptView } from "@/components/puzzles/prompt-view";
import { RosterBar } from "@/components/puzzles/roster-bar";
import { RunFooter } from "@/components/puzzles/run-footer";
import { Section } from "@/components/puzzles/section";
import { Subsection } from "@/components/puzzles/subsection";
import { VariantSelect, type VariantOption } from "@/components/puzzles/variant-select";
import { Screen } from "@/components/shell";
import { Button, Input, Label, Switch, Text } from "@/components/ui";
import { previewScarceAllocationPrompt } from "@/lib/client/prompts";
import { useCharacters } from "@/lib/client/use-characters";
import { usePersistedState } from "@/lib/client/use-persisted-state";
import { seatedCharacters, usePromptPreview } from "@/lib/client/use-prompt-preview";
import { useRun, useRunStarter } from "@/lib/client/use-run";
import { SCARCE_ALLOCATION_LIMITS, type ScarceAllocationVariant } from "@/lib/domain/scarce-allocation";
import { RUN_LIMITS } from "@/lib/domain/roster";
import { DEFAULT_SCARCE_ALLOCATION_SETUP, reconcilePlans, parseScarceAllocationSetup, scarceAllocationBlockedReason, scarceAllocationConfig, scarceAllocationRuns, type ScarceAllocationSetup } from "@/lib/puzzles/scarce-allocation/ui-helpers";
import { indexById } from "@/lib/utils";

const VARIANTS: readonly VariantOption<ScarceAllocationVariant>[] = [
  { id: "thought-experiment", label: "Thought experiment", description: "Consider the allocation at a distance." },
  { id: "real-operator", label: "Real operator", description: "Act as the fulfillment manager responsible for the outcome." },
];

export default function ScarceAllocationScreen() {
  const { characters } = useCharacters();
  const [setup, setSetup] = usePersistedState<ScarceAllocationSetup>("puzzles.scarce-allocation", DEFAULT_SCARCE_ALLOCATION_SETUP, parseScarceAllocationSetup);
  const byId = useMemo(() => indexById(characters), [characters]);
  const seated = useMemo(() => seatedCharacters(setup.roster, byId).filter((character) => setup.mode !== "free" || character.provider !== "typesafe"), [setup.roster, byId, setup.mode]);
  const patch = useCallback((changes: Partial<ScarceAllocationSetup>) => setSetup({ ...setup, ...changes, ...(changes.customers ? { plans: reconcilePlans(changes.plans ?? setup.plans, changes.customers) } : {}) }), [setup, setSetup]);
  const prompt = usePromptPreview(async (viewpoint) => {
    const { roster: _roster, ...config } = scarceAllocationConfig(setup);
    const response = await previewScarceAllocationPrompt({ ...config, decisionStyle: viewpoint?.decisionStyle });
    return [{ user: response.prompt.user, system: response.prompt.system, options: response.prompt.options }];
  }, { characters: seated });
  const starter = useRunStarter();
  const { run, summary } = useRun(starter.runId);
  const allocation = summary?.kind === "scarce-allocation" ? summary : undefined;
  const runConfig = run?.config.puzzle === "scarce-allocation" ? run.config : undefined;
  const blocked = scarceAllocationBlockedReason(setup, characters);

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
      <View className="border-t-hairline border-border pt-xl"><Subsection title="Characters"><RosterBar value={setup.roster} onChange={(roster) => patch({ roster })} characters={characters} canSelect={(character) => setup.mode !== "free" || character.provider !== "typesafe"} max={RUN_LIMITS.maxRoster} min={0} showRuns showCount={false} /></Subsection></View>
      <Section title="The shortage" right={<Button variant="link" size="sm" onPress={() => void prompt.show()}><Text>View prompt</Text></Button>}>
        <View className="gap-lg">
          <Subsection title="Framing"><VariantSelect value={setup.variant} onChange={(variant) => patch({ variant })} options={VARIANTS} /></Subsection>
          <Subsection title="Allocation mode">
            <View className="flex-row flex-wrap items-center gap-md">
              <Text className={setup.mode === "plans" ? "text-foreground underline" : "text-muted-foreground"}>Specified plans</Text>
              <Switch accessibilityLabel="Free allocation" checked={setup.mode === "free"} onCheckedChange={(checked) => patch({ mode: checked ? "free" : "plans" })} />
              <Text className={setup.mode === "free" ? "text-foreground underline" : "text-muted-foreground"}>Free allocation</Text>
            </View>
            <Text variant="small" className="text-muted-foreground">{setup.mode === "free" ? "The model sets all quantities in one response, or raises prices. TypeSafe is unavailable." : "The model chooses one of your specified plans, or raises prices. Supports TypeSafe."}</Text>
          </Subsection>
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
      </Section>
      <Section title={setup.mode === "plans" ? "Allocation plans" : "Run allocation"}>
        <View className="gap-lg">
          {setup.mode === "plans" ? <>
            <View className="flex-row flex-wrap gap-lg">
              {setup.plans.map((plan, index) => <PlanEditor key={plan.id} plan={plan} index={index} customers={setup.customers} availableQuantity={setup.availableQuantity} onChange={(next) => patch({ plans: setup.plans.map((item) => item.id === plan.id ? next : item) })} onRemove={() => patch({ plans: setup.plans.filter((item) => item.id !== plan.id) })} />)}
            </View>
            <Button className="self-start" variant="outline" disabled={setup.plans.length >= SCARCE_ALLOCATION_LIMITS.plans} onPress={() => patch({ plans: [...setup.plans, { id: `plan-${Date.now()}`, name: `Plan ${setup.plans.length + 1}`, allocations: setup.customers.map((customer) => ({ customerId: customer.id, quantity: 0 })) }] })}><Text>Add plan</Text></Button>
            <Text variant="small" className="text-muted-foreground">Specify 1–{SCARCE_ALLOCATION_LIMITS.plans} plans. Each must allocate all {setup.availableQuantity} units.</Text>
            <View className="gap-xs border-t-hairline border-border pt-md">
              <Label>Option {setup.plans.length + 1}: Raise prices</Label>
              <Text variant="small" className="text-muted-foreground">Always offered alongside your plans: raise prices until cancellations bring demand within available supply.</Text>
            </View>
          </> : null}
        </View>
        <RunFooter blocked={blocked} cost={`${setup.availableQuantity} available · ${setup.customers.reduce((sum, customer) => sum + customer.orderedQuantity, 0)} ordered · ${scarceAllocationRuns(setup.roster)} allocation decision${scarceAllocationRuns(setup.roster) === 1 ? "" : "s"} across ${setup.customers.length} customer${setup.customers.length === 1 ? "" : "s"}.`} label="Allocate supply" starting={starter.starting} onStart={() => void starter.start(scarceAllocationConfig(setup))} run={run} error={starter.error} />
      </Section>
      {allocation?.decisions.length && runConfig ? <Section title="Results"><ScarceAllocationResults summary={allocation} config={runConfig} characters={byId} runId={starter.runId} /></Section> : null}
      <PromptView open={prompt.open} onOpenChange={prompt.setOpen} title="Scarce allocation prompt" description="The complete decision as the selected character will read it." panels={prompt.panels} loading={prompt.loading} error={prompt.error} viewpoints={prompt.viewpoints} viewpointId={prompt.viewpoint?.id} onViewpointChange={prompt.setViewpoint} />
    </Screen>
  );
}
