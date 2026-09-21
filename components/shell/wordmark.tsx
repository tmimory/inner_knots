import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

/**
 * The app wordmark: display-face name over a gilt rule, with a Greek subtitle.
 *
 * The rule runs the full width of whatever holds it. A short one under the first
 * word reads as an ornament that lost its sentence; a full one reads as the line
 * that closes the masthead, and it is the only rule the menu needs.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <View className={cn("gap-xs", className)}>
      <Text variant="h2" className="tracking-wide text-primary">
        inner knots
      </Text>
      <View className="h-hairline w-full bg-accent" />
      <Text variant="greek" className="text-sm">
        δεσμοὶ τῆς ψυχῆς · knots of the soul
      </Text>
    </View>
  );
}
