import type { ReactNode } from "react";
import { View } from "react-native";

import { Scroll } from "@/components/shell";
import { Text } from "@/components/ui";

export type SectionProps = {
  title: string;
  /** One line under the heading, in the screen's own voice. */
  description?: string;
  /** Controls that belong to this section, aligned to the end of the heading row. */
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/**
 * One titled step of a puzzle screen: a Scroll panel with a display-font heading
 * and an optional slot for the controls that act on it.
 *
 * All three puzzle screens are the same shape — roster, framing, setup, run,
 * results — so they are built from these rather than each inventing a panel.
 */
export function Section({ title, description, right, children, className }: SectionProps) {
  return (
    <Scroll className={className}>
      <View className="flex-row items-start justify-between gap-lg">
        <View className="flex-1 gap-xxs">
          <Text variant="h3">{title}</Text>
          {description ? <Text variant="muted">{description}</Text> : null}
        </View>
        {right ? <View className="flex-row flex-wrap items-center gap-sm">{right}</View> : null}
      </View>
      {children ? <View className="gap-md">{children}</View> : null}
    </Scroll>
  );
}
