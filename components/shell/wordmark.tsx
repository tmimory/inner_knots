import { View } from "react-native";

import { GreekKey } from "@/components/shell/greek-key";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

/** The app wordmark: display-face name over a meander rule, with a Greek subtitle. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <View className={cn("gap-xxs", className)}>
      <Text variant="h2" className="tracking-wide text-primary">
        inner knots
      </Text>
      <GreekKey repeats={10} tone="accent" />
      <Text variant="greek" className="text-sm">
        δεσμοὶ τῆς ψυχῆς · knots of the soul
      </Text>
    </View>
  );
}
