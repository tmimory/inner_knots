import { View } from "react-native";

import { Badge, Text, type BadgeProps } from "@/components/ui";
import type { RunStatus } from "@/lib/domain/run";
import type { LogLevel, SpanStatus } from "@/lib/domain/span";
import { cn } from "@/lib/utils";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

/**
 * One mapping from a state to a semantic token, used by every screen that shows
 * a run, a span or a log line. Verdigris is settled, gilt is in motion, oxblood
 * is a failure, and a cancelled run is muted because nobody is waiting on it.
 */
const RUN_STATUS_VARIANTS: Record<RunStatus, BadgeVariant> = {
  queued: "outline",
  running: "accent",
  finished: "secondary",
  failed: "destructive",
  cancelled: "muted",
};

export function StatusBadge({ status }: { status: RunStatus }) {
  return (
    <Badge variant={RUN_STATUS_VARIANTS[status]}>
      <Text>{status}</Text>
    </Badge>
  );
}

const LOG_LEVEL_VARIANTS: Record<LogLevel, BadgeVariant> = {
  debug: "outline",
  info: "muted",
  warn: "accent",
  error: "destructive",
};

export function LevelBadge({ level }: { level: LogLevel }) {
  return (
    <Badge variant={LOG_LEVEL_VARIANTS[level]}>
      <Text>{level}</Text>
    </Badge>
  );
}

const SPAN_STATUS_DOTS: Record<SpanStatus, string> = {
  ok: "bg-secondary",
  error: "bg-destructive",
  running: "bg-accent",
};

/** A span's state in the width of a bullet, for a dense tree row. */
export function StatusDot({ status, className }: { status: SpanStatus; className?: string }) {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={status}
      className={cn("h-sm w-sm rounded-full", SPAN_STATUS_DOTS[status], className)}
    />
  );
}
