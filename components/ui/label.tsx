import * as LabelPrimitive from "@rn-primitives/label";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export type LabelProps = ComponentProps<typeof LabelPrimitive.Text> & {
  /** Classes for the pressable wrapper (the hit area). */
  rootClassName?: string;
};

export function Label({ className, rootClassName, ...props }: LabelProps) {
  return (
    <LabelPrimitive.Root className={rootClassName}>
      <LabelPrimitive.Text
        className={cn("font-bodyMedium text-base text-foreground", className)}
        {...props}
      />
    </LabelPrimitive.Root>
  );
}
