import { View } from "react-native";

import { PageHeader, Scroll } from "@/components/shell";
import { Text } from "@/components/ui";

export default function AdventureScreen() {
  return (
    <View className="gap-lg">
      <PageHeader title="Choose Your Own Adventure" subtitle="ὁδός · branching paths, recorded" />
      <Scroll>
        <Text variant="lead">
          Author a decision tree, send characters down it, and watch where the branches thin out.
          The React Flow builder arrives in phase 7.
        </Text>
      </Scroll>
    </View>
  );
}
