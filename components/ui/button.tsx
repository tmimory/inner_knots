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
 *   quiet-link   a utility link — "Refresh models", "Enter model id manually" —
 *                set in body ink, so it does not join the page's red voices
 *
 * A disabled primary drops its fill and becomes an outline in the same red at
 * `opacity-disabled`: a filled oxblood block that happens to be 50% transparent
 * still reads as the thing to press, and the parchment behind it is close enough
 * in value that the dimming barely registers. The outline keeps the button's rank
 * and colour while plainly not being available. The reason it is off belongs
 * directly beneath it as muted text, not in the button's own styling.
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
        "quiet-link": "bg-transparent",
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
      { variant: ["destructive", "link", "quiet-link"], class: "px-none" },
      // The primary action, switched off: the red outline, not the red block.
      { variant: "default", disabled: true, class: "border-hairline border-primary bg-transparent" },
      // Nothing hovers when it cannot be pressed.
      { disabled: true, class: "web:hover:opacity-disabled web:hover:bg-transparent" },
    ],
    defaultVariants: { variant: "default", size: "default", disabled: false },
  },
);

/**
 * Links are not underlined at rest — a page of underlined red phrases reads as
 * marked-up prose — and take the underline under the cursor, where it is the
 * clearest possible "this is a link" and costs nothing when it is not wanted.
 */
const buttonTextVariants = cva("font-body", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      secondary: "text-secondary",
      outline: "text-foreground",
      ghost: "text-foreground",
      destructive: "text-destructive web:hover:underline",
      link: "text-primary web:hover:underline",
      "quiet-link": "text-foreground web:hover:underline",
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
  // A text link is read as part of a sentence, so it is set at body size whatever
  // box it is given: a 14px link beside 17px prose reads as a footnote.
  compoundVariants: [
    { variant: ["destructive", "link", "quiet-link"], size: "sm", class: "text-base" },
    // The disabled primary lost its fill, so its label takes the red back.
    { variant: "default", disabled: true, class: "text-primary" },
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
