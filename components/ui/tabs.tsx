import * as TabsPrimitive from "@rn-primitives/tabs";
import type { ComponentProps } from "react";

import { TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "flex-row items-center gap-xxs rounded-md border-hairline border-border bg-muted p-xxs",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  value,
  ...props
}: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TextClassContext value="font-display text-sm text-foreground">
      <TabsPrimitive.Trigger
        value={value}
        className={cn(
          "h-control-sm items-center justify-center rounded-sm px-md transition-colors duration-fast",
          "data-[state=active]:bg-card data-[state=active]:shadow-ink-soft",
          className,
        )}
        {...props}
      />
    </TextClassContext>
  );
}

export function TabsContent({
  className,
  value,
  ...props
}: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content value={value} className={cn("gap-md pt-md", className)} {...props} />;
}
