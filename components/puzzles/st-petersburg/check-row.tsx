import { Pressable, View } from "react-native";

import { Checkbox, Label } from "@/components/ui";
import { cn } from "@/lib/utils";

export type CheckRowProps = {
  /** The words beside the box, as they read on the page. */
  label: string;
  /**
   * What a screen reader announces instead, when the words alone do not say what
   * they are a condition on ("Heads: Ends the game").
   */
  accessibilityLabel?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
};

/**
 * A checkbox and its label as one pressable line.
 *
 * A checkbox rather than a switch: the coin's conditions read as a set of things
 * that may be true of a face — it may double, it may end the game, either,
 * neither or both — where switches side by side read as settings being turned on
 * and off. The whole row is one hit target, with the box itself taken out of the
 * pointer's way so a press on it does not toggle twice (nested pressables
 * double-fire on react-native-web), and out of the accessibility tree so the row
 * is announced once rather than as a box and a word.
 */
export function CheckRow({
  label,
  accessibilityLabel,
  checked,
  onChange,
  className,
}: CheckRowProps) {
  return (
    <Pressable
      role="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={() => onChange(!checked)}
      className={cn("flex-row items-center gap-md self-start", className)}
    >
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Checkbox checked={checked} onCheckedChange={onChange} />
      </View>
      {/* Regular weight: this is a caption on a field, not a second subhead. */}
      <Label className="font-body">{label}</Label>
    </Pressable>
  );
}
