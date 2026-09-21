import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

/** The app wordmark: display-face name over a short gilt rule, with a Greek subtitle. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <View className={cn("gap-xxs", className)}>
      <Text variant="h2" className="tracking-wide text-primary">
        inner knots
      </Text>
      <View className="h-xxs w-3xl rounded-full bg-accent" />
      <Text variant="greek" className="text-sm">
        δεσμοὶ τῆς ψυχῆς · knots of the soul
      </Text>
    </View>
  );
}
