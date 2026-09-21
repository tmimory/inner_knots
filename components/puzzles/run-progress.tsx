import { useEffect, useState } from "react";
import { View } from "react-native";

import { Badge, Button, Progress, Text } from "@/components/ui";
import { cancelRun } from "@/lib/client/runs";
import { describeApiError } from "@/lib/client/errors";
import { isTerminalRunStatus, type Run, type RunStatus } from "@/lib/domain/run";
import { formatElapsed } from "@/lib/format";
import { cn } from "@/lib/utils";
import { durations } from "@/theme";

/** How often the elapsed clock redraws while a run is going. */
const TICK_MS = durations.slow * 3;

type BadgeVariant = "muted" | "accent" | "secondary" | "destructive" | "outline";

/** How each status reads at a glance. */
const STATUS_BADGES: Record<RunStatus, { variant: BadgeVariant; label: string }> = {
  queued: { variant: "muted", label: "queued" },
  running: { variant: "accent", label: "running" },
  finished: { variant: "secondary", label: "finished" },
  failed: { variant: "destructive", label: "failed" },
  cancelled: { variant: "outline", label: "cancelled" },
};

/** A cancel request, remembered against the run it was made for. */
type CancelState = { runId: string; pending: boolean; error: string | null };

export type RunProgressProps = {
  /** The run being watched, or `null` before one has been started. */
  run: Run | null | undefined;
  /** Shown in place of the bar when there is no run yet. */
  idleMessage?: string;
  className?: string;
};

/** A clock that only ticks while it is being watched. */
function useElapsed(run: Run | null | undefined): string {
  const running = run !== undefined && run !== null && !isTerminalRunStatus(run.status);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setTick((value) => value + 1), TICK_MS);
    return () => clearInterval(timer);
  }, [running]);

  if (!run) return "";
  return formatElapsed(run.startedAt, run.finishedAt);
}

/**
 * How far along a run is: the bar, the count, the clock, and the way out.
 *
 * The engine persists progress after every decision, so this is a direct reading
 * of the polled run rather than an estimate. Cancelling goes through the store,
 * which is why the button stops being offered only once the run has settled — a
 * cancelled run keeps running for as long as the decisions already in flight take.
 */
export function RunProgress({ run, idleMessage, className }: RunProgressProps) {
  // Tagged with the run it belongs to, so starting a second run cannot inherit
  // the first one's "cancelling…" or its error without a reset effect.
  const [cancelState, setCancelState] = useState<CancelState | null>(null);
  const elapsed = useElapsed(run);

  if (!run) {
    return idleMessage ? (
      <Text variant="muted" className={className}>
        {idleMessage}
      </Text>
    ) : null;
  }

  const running = !isTerminalRunStatus(run.status);
  const { done, total } = run.progress;
  const badge = STATUS_BADGES[run.status];
  const mine = cancelState?.runId === run.id ? cancelState : null;
  const cancelling = mine?.pending ?? false;
  const cancelError = mine?.error ?? null;

  async function cancel() {
    if (!run) return;
    const runId = run.id;
    setCancelState({ runId, pending: true, error: null });
    try {
      await cancelRun(runId);
    } catch (error) {
      setCancelState({ runId, pending: false, error: describeApiError(error) });
    }
  }

  return (
    <View className={cn("gap-sm", className)}>
      <View className="flex-row flex-wrap items-center gap-md">
        <Badge variant={badge.variant}>
          <Text>{badge.label}</Text>
        </Badge>
        <Text variant="small" className="font-mono">
          {`${done} / ${total}`}
        </Text>
        <Text variant="muted">{elapsed}</Text>
        <View className="flex-1" />
        {running ? (
          <Button variant="outline" size="sm" disabled={cancelling} onPress={() => void cancel()}>
            <Text>{cancelling ? "Cancelling…" : "Cancel"}</Text>
          </Button>
        ) : null}
      </View>

      <Progress
        value={done}
        max={Math.max(1, total)}
        indicatorClassName={run.status === "failed" ? "bg-destructive" : "bg-primary"}
        accessibilityLabel={`${done} of ${total} decisions`}
      />

      {run.error ? (
        <Text variant="small" className="text-destructive">
          {run.error}
        </Text>
      ) : null}
      {cancelError ? (
        <Text variant="small" className="text-destructive">
          {cancelError}
        </Text>
      ) : null}
    </View>
  );
}
