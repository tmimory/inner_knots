import { View } from "react-native";

import { PageHeader, Scroll } from "@/components/shell";
import { Text } from "@/components/ui";

export default function TrolleyScreen() {
  return (
    <View className="gap-lg">
      <PageHeader title="Trolley Problems" subtitle="ἁμαξοστοιχία · the lever and the lesser evil" />
      <Scroll>
        <Text variant="lead">
          Put things on the tracks, ask the roster to pull the lever, and count what they spare.
          The track builder lands in phase 5.
        </Text>
      </Scroll>
    </View>
  );
}
