import { useState } from "react";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui";
import { LOG_LEVELS, type LogEvent, type LogLevel } from "@/lib/domain/span";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

import { JsonTree } from "./json-tree";
import { LevelMark } from "./status-mark";

/** One line, with its structured data hidden until asked for. */
function LogRow({ event }: { event: LogEvent }) {
  const [open, setOpen] = useState(false);
  const hasData = event.data !== undefined && event.data !== null;

  return (
    <View className="gap-xs border-b-hairline border-border py-xs">
      <Pressable
        role={hasData ? "button" : undefined}
        aria-expanded={hasData ? open : undefined}
        disabled={!hasData}
        onPress={() => setOpen((current) => !current)}
        className="flex-row items-center gap-sm"
      >
        <Text variant="muted" className="font-mono text-xs">
          {formatTime(event.ts)}
        </Text>
        <LevelMark level={event.level} />
        <Text variant="small" className="flex-1">
          {event.message}
        </Text>
        {hasData ? (
          <Text variant="muted" className="font-mono text-xs">
            {open ? "▾" : "▸"}
          </Text>
        ) : null}
      </Pressable>
      {hasData && open ? <JsonTree value={event.data} label="data" openDepth={2} /> : null}
    </View>
  );
}

/** The level filter: every level, or one of them. */
function LevelFilter({
  level,
  onChange,
}: {
  level?: LogLevel;
  onChange: (level?: LogLevel) => void;
}) {
  const options: (LogLevel | undefined)[] = [undefined, ...LOG_LEVELS];
  return (
    <View className="flex-row flex-wrap items-center gap-xs">
      {options.map((option) => {
        const active = option === level;
        return (
          <Pressable
            key={option ?? "all"}
            role="button"
            aria-selected={active}
            onPress={() => onChange(option)}
            className={cn(
              "h-control-sm justify-center rounded-full border-hairline px-md transition-colors duration-fast",
              active ? "border-ring bg-muted" : "border-border bg-transparent web:hover:bg-muted/subtle",
            )}
          >
            <Text variant="small" className="font-display text-xs">
              {option ?? "all"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A run's log stream, oldest first, filterable by level. */
export function LogList({ logs }: { logs: readonly LogEvent[] }) {
  const [level, setLevel] = useState<LogLevel | undefined>(undefined);
  const shown = level === undefined ? logs : logs.filter((event) => event.level === level);

  return (
    <View className="gap-md">
      <LevelFilter level={level} onChange={setLevel} />
      {shown.length === 0 ? (
        <Text variant="muted">
          {logs.length === 0 ? "Nothing has been logged for this run." : "No lines at that level."}
        </Text>
      ) : (
        <View>
          {shown.map((event, index) => (
            <LogRow key={`${event.ts}-${index}`} event={event} />
          ))}
        </View>
      )}
    </View>
  );
}
