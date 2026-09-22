import { View } from "react-native";

import { RunProgress } from "@/components/puzzles/run-progress";
import { Button, Text } from "@/components/ui";
import type { Run } from "@/lib/domain/run";

export type RunFooterProps = {
  /** Why the run cannot start, or `null` when it can. Shown in place of `cost`. */
  blocked: string | null;
  /** What the run will do, as prose: "12 decisions across 3 characters." */
  cost: string;
  /** The button's label while idle; it reads "Starting…" while a run is being asked for. */
  label: string;
  starting: boolean;
  onStart: () => void;
  /** The run once there is one, for the progress line under the row. */
  run: Run | null | undefined;
  /** What went wrong starting it, if anything. */
  error?: string | null;
};

/**
 * The row that closes a puzzle's last section and starts its run.
 *
 * A hairline across the column, what the run comes to on the left, and the
 * screen's one filled control at the right edge, where a page's terminal action
 * belongs. Blocked, the same line says what is missing instead of counting
 * decisions. The progress line and the starter's error follow underneath.
 *
 * The trolley and the dilemma end the same way, and had each written it out; a
 * third puzzle would have copied it a third time.
 */
export function RunFooter({
  blocked,
  cost,
  label,
  starting,
  onStart,
  run,
  error,
}: RunFooterProps) {
  return (
    <>
      <View className="flex-row flex-wrap items-center justify-end gap-lg border-t-hairline border-border pt-lg">
        {/* Body size: the line that says what the button will do is prose, not
            a caption under it. */}
        <Text className="flex-1 text-muted-foreground">{blocked ?? cost}</Text>
        <Button disabled={blocked !== null || starting} onPress={onStart}>
          <Text>{starting ? "Starting…" : label}</Text>
        </Button>
      </View>

      <RunProgress run={run ?? null} />
      {error ? (
        <Text variant="small" className="text-destructive">
          {error}
        </Text>
      ) : null}
    </>
  );
}
