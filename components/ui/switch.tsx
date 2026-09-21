import * as SwitchPrimitive from "@rn-primitives/switch";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export type SwitchProps = ComponentProps<typeof SwitchPrimitive.Root>;

export function Switch({ className, checked, disabled, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      disabled={disabled}
      className={cn(
        "h-xl w-3xl flex-row items-center rounded-full border-hairline border-border p-xxs transition-colors duration-fast",
        checked ? "bg-primary" : "bg-muted",
        disabled && "opacity-disabled",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "h-lg w-lg rounded-full bg-card shadow-ink-soft",
          checked && "translate-x-xl",
        )}
      />
    </SwitchPrimitive.Root>
  );
}
