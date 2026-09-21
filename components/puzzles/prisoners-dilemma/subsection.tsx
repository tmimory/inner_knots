import type { ReactNode } from "react";
import { View } from "react-native";

import { Label } from "@/components/ui";
import { cn } from "@/lib/utils";

export type SubsectionProps = {
  /** What this group of controls is, in the body voice rather than small caps. */
  title: string;
  /** Controls that belong to the group, aligned to the end of its heading row. */
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/**
 * One group inside a section: a run-in subhead and the controls under it.
 *
 * The screen has two tiers — what the puzzle *is* (Setup) and what its rules
 * *are* (Rules) — and six small-caps headings with six rules between them made
 * six pages out of one. The tier heading is the display-font {@link Section};
 * this is the quieter step under it — the body serif at label weight — so "The
 * charge" reads as part of the rules rather than as another chapter, while still
 * outweighing the field labels beneath it.
 */
export function Subsection({ title, right, children, className }: SubsectionProps) {
  return (
    <View className={cn("gap-sm", className)}>
      <View className="flex-row items-center justify-between gap-lg">
        <Label className="flex-1">{title}</Label>
        {right ? <View className="flex-row flex-wrap items-center gap-sm">{right}</View> : null}
      </View>
      <View className="gap-md">{children}</View>
    </View>
  );
}
