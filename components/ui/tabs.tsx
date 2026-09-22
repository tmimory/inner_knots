import * as TabsPrimitive from "@rn-primitives/tabs";
import type { ComponentProps, ReactNode } from "react";

import { Text, TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

/**
 * The tab strip: a row of words with a rule under the one you are reading.
 *
 * No track, no fill, no box. A bordered bar holding three buttons is a control
 * that competes with the page it is filtering, and on a parchment surface the
 * inset panel read as a disabled toolbar; a tab is a heading you can choose, so
 * it is set as one. The strip keeps a wide band under it — the content below is a
 * new page, not the next line — which is the `mb-2xl` every tabbed screen used to
 * add for itself and get slightly wrong.
 */
export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("mb-2xl flex-row flex-wrap items-end gap-xl self-start", className)}
      {...props}
    />
  );
}

export type TabsTriggerProps = ComponentProps<typeof TabsPrimitive.Trigger> & {
  /**
   * A count to set after the label — "Spans 17". It rides the tab rather than
   * sitting in the panel below it, so the strip says how much there is of each
   * thing before you open it, and it is drawn in the quiet ink so the word still
   * leads.
   */
  count?: number;
};

/**
 * One tab.
 *
 * Active is a 2px rule in the rubric red directly under the label, with the label
 * in the same red; inactive is the quiet ink and a transparent rule of the same
 * weight, so nothing shifts when the choice moves. The state comes from the root
 * context rather than a `data-state` variant, because the label's colour lives on
 * a child `Text` that cannot see its parent's attributes.
 */
export function TabsTrigger({ className, value, count, children, ...props }: TabsTriggerProps) {
  const { value: active } = TabsPrimitive.useRootContext();
  const selected = active === value;

  return (
    <TextClassContext
      value={cn("font-display text-base", selected ? "text-primary" : "text-muted-foreground")}
    >
      <TabsPrimitive.Trigger
        value={value}
        className={cn(
          "flex-row items-baseline gap-sm border-b-thick pb-xs transition-colors duration-fast",
          selected ? "border-b-primary" : "border-b-transparent",
          className,
        )}
        {...props}
      >
        {children as ReactNode}
        {count === undefined ? null : (
          <Text variant="data" className="text-xs text-subtle-foreground">
            {count}
          </Text>
        )}
      </TabsPrimitive.Trigger>
    </TextClassContext>
  );
}

export function TabsContent({
  className,
  value,
  ...props
}: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content value={value} className={cn("gap-md", className)} {...props} />;
}
