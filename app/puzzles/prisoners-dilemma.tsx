import { View } from "react-native";

import { PageHeader, Scroll } from "@/components/shell";
import { Text } from "@/components/ui";

export default function PrisonersDilemmaScreen() {
  return (
    <View className="gap-lg">
      <PageHeader title="Prisoner's Dilemma" subtitle="πίστις · cooperate, defect, repeat" />
      <Scroll>
        <Text variant="lead">
          Two characters, two cells, one payoff matrix, and however many rounds of memory we grant
          them. The matrix editor and the tournament arrive in phase 6.
        </Text>
      </Scroll>
    </View>
  );
}
