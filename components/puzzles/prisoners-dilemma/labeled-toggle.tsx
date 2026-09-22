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
 * The screen's one switch pattern: the label, then the switch right beside it.
 *
 * Four switches labelled four ways — a bare one in a heading, a "locked" word
 * beside one, a heading standing in for a label — read as four different
 * controls. This is the only one the prisoner's dilemma uses.
 *
 * The switch follows the words rather than sitting at the far edge of the column:
 * a control seven hundred pixels from its label is a control the eye has to go
 * looking for, and on a wide screen the pair stops being one thing. Whatever the
 * label needs to add goes underneath both, where a second line cannot push the
 * switch further away.
 */
export function LabeledToggle({
  label,
  description,
  checked,
  onCheckedChange,
  className,
}: LabeledToggleProps) {
  return (
    <View className={cn("gap-xxs", className)}>
      <View className="flex-row items-center gap-md">
        {/*
          Regular weight, not the label medium: a switch's caption sits under a
          run-in subhead, and two lines of the same weight make the subhead vanish.
        */}
        <Label className="font-body">{label}</Label>
        <Switch checked={checked} onCheckedChange={onCheckedChange} accessibilityLabel={label} />
      </View>
      {description ? <Text variant="muted">{description}</Text> : null}
    </View>
  );
}
