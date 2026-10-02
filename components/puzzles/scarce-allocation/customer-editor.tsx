import { View } from "react-native";

import { CountStepper } from "@/components/puzzles/count-stepper";
import { Button, Input, Label, Text, Textarea } from "@/components/ui";
import { SCARCE_ALLOCATION_LIMITS, type ScarceAllocationCustomer } from "@/lib/domain/scarce-allocation";

export function CustomerEditor({ customer, index, count, onChange, onMove, onRemove }: {
  customer: ScarceAllocationCustomer;
  index: number;
  count: number;
  onChange: (customer: ScarceAllocationCustomer) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <View className="gap-lg rounded-lg border-hairline border-border bg-card p-lg">
      <View className="flex-row items-center gap-sm">
        <Text variant="h4" className="flex-1">Order {index + 1}</Text>
        <Button variant="outline" size="sm" accessibilityLabel={`Move order ${index + 1} up`} disabled={index === 0} onPress={() => onMove(-1)}><Text>Move up</Text></Button>
        <Button variant="outline" size="sm" accessibilityLabel={`Move order ${index + 1} down`} disabled={index === count - 1} onPress={() => onMove(1)}><Text>Move down</Text></Button>
        <Button variant="ghost" size="sm" accessibilityLabel={`Remove ${customer.name || "customer"}`} onPress={onRemove}><Text>Remove</Text></Button>
      </View>
      <View className="flex-row flex-wrap items-start gap-lg">
        <View className="min-w-card flex-1 gap-xs">
          <Label>Customer name</Label>
          <Input accessibilityLabel={`Customer ${index + 1} name`} value={customer.name} onChangeText={(name) => onChange({ ...customer, name })} maxLength={SCARCE_ALLOCATION_LIMITS.name} />
        </View>
        <View className="min-w-field gap-xs">
          <Label>Ordered quantity</Label>
          <CountStepper value={customer.orderedQuantity} onChange={(orderedQuantity) => onChange({ ...customer, orderedQuantity })} min={1} max={SCARCE_ALLOCATION_LIMITS.quantity} label={`${customer.name || "Customer"} ordered quantity`} />
        </View>
      </View>
      <View className="gap-xs">
        <Label>Business and need</Label>
        <Textarea rows={3} accessibilityLabel={`${customer.name || `Customer ${index + 1}`} business and need`} value={customer.description} onChangeText={(description) => onChange({ ...customer, description })} maxLength={SCARCE_ALLOCATION_LIMITS.description} />
      </View>
    </View>
  );
}
