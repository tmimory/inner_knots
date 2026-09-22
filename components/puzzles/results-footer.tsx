import { Link } from "expo-router";
import { View } from "react-native";

import { Button, Text } from "@/components/ui";

export type ResultsFooterProps = {
  /** What was recorded, as prose: "12 decisions recorded". */
  note: string;
  /** The run the results belong to, so the reader can go to its logs. */
  runId?: string | null;
};

/**
 * The line under a puzzle's results: how much was recorded, and the way to the
 * logs that hold all of it. Every puzzle's results end this way.
 */
export function ResultsFooter({ note, runId }: ResultsFooterProps) {
  return (
    <View className="flex-row flex-wrap items-center gap-md">
      <Text variant="muted">{note}</Text>
      <View className="flex-1" />
      {runId ? (
        <Link href={`/logs/${runId}`} asChild>
          <Button variant="outline" size="sm">
            <Text>View in Logs</Text>
          </Button>
        </Link>
      ) : null}
    </View>
  );
}
