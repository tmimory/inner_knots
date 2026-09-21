import * as SwitchPrimitive from "@rn-primitives/switch";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * A two-state toggle.
 *
 * Off is the hairline tan — the same ink the rules and field borders are drawn
 * in — with the knob a lit disc carrying its own edge, so "off" reads as a track
 * with something sitting in it rather than as an empty field. On is the rubric
 * red every other committed state in the app uses.
 */
export type SwitchProps = ComponentProps<typeof SwitchPrimitive.Root>;

export function Switch({ className, checked, disabled, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      disabled={disabled}
      className={cn(
        "h-xl w-3xl flex-row items-center rounded-full border-hairline p-xxs transition-colors duration-fast",
        checked ? "border-primary bg-primary" : "border-border bg-border",
        disabled && "opacity-disabled",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "h-lg w-lg rounded-full border-hairline border-border bg-input shadow-ink-soft",
          checked && "translate-x-xl",
        )}
      />
    </SwitchPrimitive.Root>
  );
}
