import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { View } from "react-native";

import { TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";

/**
 * A quiet label on a thing, not a decoration.
 *
 * Badges are outlined and square-shouldered: a full-round filled pill carries as
 * much weight as a button, which is how a screen ends up with six things shouting
 * at once. The one exception is `selected`, which is a chip the user turned on.
 *
 * `selected` is the app's one selection language, shared with the segmented
 * control and the variant rows: a tan `muted` fill, a hairline in the rubric red
 * and the label in the same red. A dark fill would make a turned-on chip heavier
 * than the screen's primary button, and a second near-black into a four-tone
 * palette; tan and red say "on" using colours the page already has.
 */
const badgeVariants = cva("flex-row items-center gap-xs rounded-sm border-hairline px-sm py-xxs", {
  variants: {
    variant: {
      default: "border-border bg-transparent",
      secondary: "border-secondary bg-transparent",
      accent: "border-accent bg-transparent",
      outline: "border-border bg-transparent",
      destructive: "border-destructive bg-transparent",
      muted: "border-transparent bg-muted",
      /** A chip the user has turned on: tan fill, red hairline, red label. */
      selected: "border-primary bg-muted",
    },
  },
  defaultVariants: { variant: "default" },
});

const badgeTextVariants = cva("font-body text-xs", {
  variants: {
    variant: {
      default: "text-muted-foreground",
      secondary: "text-secondary",
      accent: "text-foreground",
      outline: "text-foreground",
      destructive: "text-destructive",
      muted: "text-muted-foreground",
      selected: "text-primary",
    },
  },
  defaultVariants: { variant: "default" },
});

export type BadgeProps = ComponentProps<typeof View> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <TextClassContext value={badgeTextVariants({ variant })}>
      <View className={cn(badgeVariants({ variant }), className)} {...props} />
    </TextClassContext>
  );
}

export { badgeTextVariants, badgeVariants };
