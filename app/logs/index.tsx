import { View } from "react-native";

import { PageHeader, Scroll } from "@/components/shell";
import { Text } from "@/components/ui";

export default function LogsScreen() {
  return (
    <View className="gap-lg">
      <PageHeader title="Logs" subtitle="ὑπομνήματα · every prompt, every answer" />
      <Scroll>
        <Text variant="lead">
          Runs, spans and raw provider payloads, exactly as they were sent and received. The run
          list and span viewer arrive in phase 8.
        </Text>
      </Scroll>
    </View>
  );
}
