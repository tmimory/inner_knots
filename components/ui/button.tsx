import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { Pressable } from "react-native";

import { TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";

/**
 * One ladder of emphasis, so a screen can only ever have one loudest control:
 *
 *   default      the single primary action — full oxblood, cream text
 *   secondary    an outlined action in the verdigris tone
 *   outline      an outlined action in the neutral ink
 *   ghost        a tertiary action with no edge at all
 *   destructive  a red text link; it never gets a fill beside Save
 *   link         a text link in the rubric red
 *
 * A disabled filled button drops its fill rather than fading it: a washed-out
 * oxblood reads as a new, softer hue instead of as "not yet", which is the
 * mistake the rose-coloured Create button was making.
 */
const buttonVariants = cva(
  "flex-row items-center justify-center gap-sm rounded-sm transition-colors duration-fast web:focus-visible:outline-none web:focus-visible:ring-thick web:focus-visible:ring-ring",
  {
    variants: {
      variant: {
        default: "bg-primary active:opacity-hover web:hover:opacity-hover",
        secondary:
          "border-hairline border-secondary bg-transparent active:bg-muted web:hover:bg-muted",
        outline: "border-hairline border-border bg-transparent active:bg-muted web:hover:bg-muted",
        ghost: "bg-transparent active:bg-muted web:hover:bg-muted",
        destructive: "bg-transparent active:opacity-hover web:hover:opacity-hover",
        link: "bg-transparent",
      },
      size: {
        sm: "h-control-sm px-md",
        default: "h-control-md px-lg",
        lg: "h-control-lg px-xl",
        icon: "h-control-icon w-control-icon px-none",
      },
      disabled: {
        true: "opacity-disabled",
        false: "",
      },
    },
    // Compound classes are emitted last, so they win the tailwind-merge pass.
    compoundVariants: [
      // A text link has no box: it sits on the line it belongs to.
      { variant: ["destructive", "link"], class: "px-none" },
      // Disabled: the outline of the control at reduced opacity, never a soft fill.
      {
        variant: ["default", "secondary"],
        disabled: true,
        class: "border-hairline border-border bg-transparent",
      },
    ],
    defaultVariants: { variant: "default", size: "default", disabled: false },
  },
);

const buttonTextVariants = cva("font-body", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      secondary: "text-secondary",
      outline: "text-foreground",
      ghost: "text-foreground",
      destructive: "text-destructive underline",
      link: "text-primary underline",
    },
    size: {
      sm: "text-sm",
      default: "text-base",
      lg: "text-lg",
      icon: "text-base",
    },
    disabled: {
      true: "",
      false: "",
    },
  },
  compoundVariants: [
    { variant: ["default", "secondary"], disabled: true, class: "text-foreground" },
  ],
  defaultVariants: { variant: "default", size: "default", disabled: false },
});

export type ButtonProps = ComponentProps<typeof Pressable> &
  Omit<VariantProps<typeof buttonVariants>, "disabled">;

export function Button({ className, variant, size, disabled, ...props }: ButtonProps) {
  const off = disabled ?? false;
  return (
    <TextClassContext value={buttonTextVariants({ variant, size, disabled: off })}>
      <Pressable
        role="button"
        disabled={off}
        className={cn(buttonVariants({ variant, size, disabled: off }), className)}
        {...props}
      />
    </TextClassContext>
  );
}

export { buttonTextVariants, buttonVariants };
