import { View } from "react-native";

import { Label, Switch, Text } from "@/components/ui";
import { cn } from "@/lib/utils";

export type LabeledToggleProps = {
  /** What the switch turns on, read from the left. */
  label: string;
  /** One line, only where the off state is not obvious from the label. */
  description?: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  className?: string;
};

/**
 * The screen's one switch pattern: label on the left, switch on the right.
 *
 * Four switches labelled four ways — a bare one in a heading, a "locked" word
 * beside one, a heading standing in for a label — read as four different
 * controls. This is the only one the prisoner's dilemma uses.
 */
export function LabeledToggle({
  label,
  description,
  checked,
  onCheckedChange,
  className,
}: LabeledToggleProps) {
  return (
    <View className={cn("flex-row items-start gap-md", className)}>
      <View className="flex-1 gap-xxs">
        <Label>{label}</Label>
        {description ? <Text variant="muted">{description}</Text> : null}
      </View>
      <Switch checked={checked} onCheckedChange={onCheckedChange} accessibilityLabel={label} />
    </View>
  );
}
