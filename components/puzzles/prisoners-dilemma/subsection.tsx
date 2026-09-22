import type { ReactNode } from "react";
import { View } from "react-native";

import { Text } from "@/components/ui";
import { cn } from "@/lib/utils";

export type SubsectionProps = {
  /** What this group of controls is, in the display face at the caption step. */
  title: string;
  /** Controls that belong to the group, sitting directly after its heading. */
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/**
 * One group inside a section: a run-in subhead and the controls under it.
 *
 * The screen has two tiers — what the puzzle *is* (Setup) and what its rules
 * *are* (Rules) — and six small-caps headings with six rules between them made
 * six pages out of one. So the tier heading keeps the display face at its own
 * size, and this is the same face two steps down: small caps at the caption step,
 * which reads as the family of "Setup" rather than as a competitor to it, and
 * cannot be mistaken for the body-serif labels on the controls beneath it. Set in
 * the secondary ink for the same reason — a group is a heading over fields, not
 * one more thing to read.
 */
export function Subsection({ title, right, children, className }: SubsectionProps) {
  return (
    <View className={cn("gap-md", className)}>
      <View className="flex-row items-center gap-md">
        <Text className="font-display text-sm text-muted-foreground">{title}</Text>
        {right ? <View className="flex-row flex-wrap items-center gap-sm">{right}</View> : null}
      </View>
      <View className="gap-lg">{children}</View>
    </View>
  );
}
