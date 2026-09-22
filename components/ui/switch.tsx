import * as SwitchPrimitive from "@rn-primitives/switch";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * A two-state toggle.
 *
 * Off is the hairline tan — the same ink the rules and field borders are drawn
 * in — with the knob a lit disc carrying its own edge, so "off" reads as a track
 * with something sitting in it rather than as an empty field.
 *
 * On is the dark ink, with the knob left cream. A toggle is a setting, not an
 * action: in the rubric red it joined the primary button, the active nav mark and
 * the page title as a fourth red voice, and a screen with three switches on had
 * three things claiming to be the thing to press. Ink reads as switched on and
 * stays furniture.
 */
export type SwitchProps = ComponentProps<typeof SwitchPrimitive.Root>;

export function Switch({
  className,
  checked,
  disabled,
  ...props
}: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      disabled={disabled}
      className={cn(
        "h-xl w-3xl flex-row items-center rounded-full border-hairline p-xxs transition-colors duration-fast",
        checked ? "border-foreground bg-foreground" : "border-border bg-border",
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
