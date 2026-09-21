import type { ComponentProps } from "react";
import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

/**
 * How a card answers a pointer when the whole card is the control: the surface
 * warms, the edge takes the ring, and both cross over the theme's fast duration.
 * It lives here rather than in each screen so two pressable cards cannot end up
 * reacting differently.
 */
const PRESSABLE =
  "transition-colors duration-fast active:bg-muted web:hover:border-ring web:hover:bg-muted/subtle";

export type CardProps = ComponentProps<typeof View> & {
  /** True when the card is the hit area of a link or button, and should react like one. */
  pressable?: boolean;
};

export function Card({ className, pressable = false, ...props }: CardProps) {
  return (
    <View
      className={cn(
        "rounded-lg border-hairline border-border bg-card shadow-ink-soft",
        pressable && PRESSABLE,
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<typeof View>) {
  return <View className={cn("gap-xs p-lg", className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentProps<typeof Text>) {
  return <Text variant="h3" className={cn("text-card-foreground", className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<typeof Text>) {
  return <Text variant="muted" className={className} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<typeof View>) {
  return <View className={cn("gap-md px-lg pb-lg", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<typeof View>) {
  return (
    <View className={cn("flex-row items-center gap-sm px-lg pb-lg", className)} {...props} />
  );
}
