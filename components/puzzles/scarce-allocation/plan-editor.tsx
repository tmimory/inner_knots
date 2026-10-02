import { View } from "react-native";
import { CountStepper } from "@/components/puzzles/count-stepper";
import { Button, Input, Label, Text } from "@/components/ui";
import { SCARCE_ALLOCATION_LIMITS, validateAllocation, type ScarceAllocationCustomer, type ScarceAllocationPlanOption } from "@/lib/domain/scarce-allocation";

export function PlanEditor({ plan, index, customers, availableQuantity, onChange, onRemove }: {
  plan: ScarceAllocationPlanOption;
  index: number;
  customers: ScarceAllocationCustomer[];
  availableQuantity: number;
  onChange: (plan: ScarceAllocationPlanOption) => void;
  onRemove: () => void;
}) {
  const total = plan.allocations.reduce((sum, entry) => sum + entry.quantity, 0);
  const error = validateAllocation(plan.allocations, { customers, availableQuantity });
  return (
    <View className="min-w-card flex-1 gap-md rounded-lg border-hairline border-border bg-card p-lg">
      <View className="flex-row items-center justify-between gap-sm">
        <Label>Plan {index + 1}</Label>
        <Button variant="ghost" size="sm" accessibilityLabel={`Remove plan ${index + 1}`} onPress={onRemove}><Text>Remove</Text></Button>
      </View>
      <Input accessibilityLabel={`Plan ${index + 1} name`} value={plan.name} onChangeText={(name) => onChange({ ...plan, name })} maxLength={SCARCE_ALLOCATION_LIMITS.name} />
      {customers.map((customer) => (
        <View key={customer.id} className="gap-xs">
          <Text variant="small">{customer.name || "Unnamed customer"} · {customer.orderedQuantity} ordered</Text>
          <CountStepper label={`${plan.name || `Plan ${index + 1}`}: ${customer.name || "Unnamed customer"} allocation`} value={plan.allocations.find((entry) => entry.customerId === customer.id)?.quantity ?? 0} min={0} max={Math.min(customer.orderedQuantity, availableQuantity)} onChange={(quantity) => onChange({ ...plan, allocations: plan.allocations.map((entry) => entry.customerId === customer.id ? { ...entry, quantity } : entry) })} />
        </View>
      ))}
      <Text variant="small" className={error ? "text-destructive" : "text-muted-foreground"}>{total} / {availableQuantity} allocated{error ? ` · ${error}` : " · Ready"}</Text>
    </View>
  );
}
