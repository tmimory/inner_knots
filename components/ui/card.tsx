import type { ComponentProps } from "react";
import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<typeof View>) {
  return (
    <View
      className={cn("rounded-lg border-hairline border-border bg-card shadow-ink-soft", className)}
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
