import * as ProgressPrimitive from "@rn-primitives/progress";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export type ProgressProps = ComponentProps<typeof ProgressPrimitive.Root> & {
  /** Classes for the filled portion, e.g. `bg-track1`. */
  indicatorClassName?: string;
};

export function Progress({
  className,
  indicatorClassName,
  value,
  max = 100,
  ...props
}: ProgressProps) {
  const percent = Math.min(100, Math.max(0, ((value ?? 0) / max) * 100));
  return (
    <ProgressPrimitive.Root
      value={value}
      max={max}
      className={cn("h-sm w-full overflow-hidden rounded-full bg-muted", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        style={{ width: `${percent}%` }}
        className={cn("h-full rounded-full bg-primary", indicatorClassName)}
      />
    </ProgressPrimitive.Root>
  );
}
