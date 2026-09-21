import * as CheckboxPrimitive from "@rn-primitives/checkbox";
import type { ComponentProps } from "react";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export type CheckboxProps = ComponentProps<typeof CheckboxPrimitive.Root>;

export function Checkbox({ className, checked, disabled, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      disabled={disabled}
      className={cn(
        "h-lg w-lg items-center justify-center rounded-sm border-hairline border-border",
        checked ? "border-primary bg-primary" : "bg-input",
        disabled && "opacity-disabled",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="items-center justify-center">
        <Text variant="small" className="font-display text-xs text-primary-foreground">
          ✓
        </Text>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
