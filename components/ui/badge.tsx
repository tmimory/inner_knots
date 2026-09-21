import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { View } from "react-native";

import { TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";

const badgeVariants = cva("flex-row items-center rounded-full px-sm py-xxs", {
  variants: {
    variant: {
      default: "bg-primary",
      secondary: "bg-secondary",
      accent: "bg-accent",
      outline: "border-hairline border-border bg-transparent",
      destructive: "bg-destructive",
      muted: "bg-muted",
    },
  },
  defaultVariants: { variant: "default" },
});

const badgeTextVariants = cva("font-display text-xs", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      secondary: "text-secondary-foreground",
      accent: "text-accent-foreground",
      outline: "text-foreground",
      destructive: "text-destructive-foreground",
      muted: "text-muted-foreground",
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
