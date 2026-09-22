import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

/**
 * The app wordmark: display-face name over a gilt rule, with a Greek subtitle.
 *
 * Set in the ink rather than the rubric red. Two red display moments — the
 * masthead and the page title a divider away from it — compete for the same
 * glance; the red belongs to the page you are on, and the masthead is furniture.
 *
 * The rule runs the full width of whatever holds it, which in the menu is the
 * width of a nav row: masthead and navigation then share one pair of edges
 * instead of the rule running past the labels. It is the only rule the menu
 * needs, and the Greek line under it is the sidebar's only tagline.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <View className={cn("gap-xs", className)}>
      <Text variant="h2" className="tracking-wide text-foreground">
        inner knots
      </Text>
      <View className="h-hairline w-full bg-accent" />
      <Text variant="greek" className="text-sm">
        δεσμοὶ τῆς ψυχῆς · knots of the soul
      </Text>
    </View>
  );
}
