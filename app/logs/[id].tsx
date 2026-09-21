import { Link, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { View, useWindowDimensions } from "react-native";

import {
  ConfigView,
  ExportButton,
  LogList,
  SpanDetail,
  SpanTree,
  StatusBadge,
  SummaryView,
  spanDepths,
} from "@/components/logs";
import { PageHeader, Scroll } from "@/components/shell";
import { Button, Progress, Separator, Tabs, TabsContent, TabsList, TabsTrigger, Text, useToast } from "@/components/ui";
import { cancelRun } from "@/lib/client/runs";
import {
  isRunActive,
  useAdventureName,
  useCharacterIndex,
  useObjectIndex,
  useRunDetail,
} from "@/lib/client/use-runs";
import { formatDateTime, formatElapsed } from "@/lib/format";
import { layout } from "@/theme";

/** A labelled figure in the run's vital-statistics row. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-xxs">
      <Text variant="muted" className="text-xs">
        {label}
      </Text>
      <Text variant="small" className="font-mono">
        {value}
      </Text>
    </View>
  );
}

export default function RunDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const runId = typeof params.id === "string" ? params.id : "";
  const { width } = useWindowDimensions();
  const wide = width >= layout.wideBreakpoint;
  const { toast } = useToast();

  const { run, spans, logs, loading, error, refresh } = useRunDetail(runId);
  const characters = useCharacterIndex();
  const objects = useObjectIndex();
  const adventureName = useAdventureName(
    run?.config.puzzle === "adventure" ? run.config.adventureId : undefined,
  );

  const [tab, setTab] = useState("overview");
  const [selectedSpanId, setSelectedSpanId] = useState<string | undefined>(undefined);
  const depths = useMemo(() => spanDepths(spans), [spans]);
  const selected = spans.find((span) => span.spanId === selectedSpanId);

  async function cancel(): Promise<void> {
    try {
      await cancelRun(runId);
      toast({ title: "Cancellation requested", description: "The run stops after the current decision." });
      refresh();
    } catch (failure) {
      toast({
        title: "The run could not be cancelled",
        description: failure instanceof Error ? failure.message : String(failure),
        tone: "destructive",
      });
    }
  }

  if (!run) {
    return (
      <View className="gap-lg">
        <PageHeader title="Run" subtitle="ὑπόμνημα · one run, in full" />
        <Scroll>
          <Text variant="lead">
            {loading ? "Reading the run…" : (error ?? `No run is recorded under "${runId}".`)}
          </Text>
          <Link href="/logs">
            <Text variant="small" className="text-primary underline">
              back to the ledger
            </Text>
          </Link>
        </Scroll>
      </View>
    );
  }

  return (
    <View className="gap-lg">
      <PageHeader
        title={run.puzzle}
        subtitle={run.id}
        right={
          <>
            <StatusBadge status={run.status} />
            {isRunActive(run) ? (
              <Button variant="destructive" size="sm" onPress={() => void cancel()}>
                <Text>Cancel</Text>
              </Button>
            ) : null}
            <ExportButton run={run} spans={spans} logs={logs} />
          </>
        }
      />

      <Scroll>
        <View className="flex-row flex-wrap items-center gap-xl">
          <Stat label="Started" value={formatDateTime(run.startedAt)} />
          <Stat label="Duration" value={formatElapsed(run.startedAt, run.finishedAt)} />
          <Stat label="Progress" value={`${run.progress.done} / ${run.progress.total}`} />
          <Stat label="Spans" value={String(spans.length)} />
          <Stat label="Log lines" value={String(logs.length)} />
        </View>
        {isRunActive(run) ? (
          <Progress
            value={run.progress.done}
            max={Math.max(1, run.progress.total)}
            indicatorClassName="bg-accent"
          />
        ) : null}
        {run.error ? (
          <View className="rounded-md border-hairline border-destructive bg-muted p-md">
            <Text variant="code" className="text-destructive" selectable>
              {run.error}
            </Text>
          </View>
        ) : null}
        {error ? <Text variant="muted">the last refresh failed: {error}</Text> : null}
      </Scroll>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="self-start">
          <TabsTrigger value="overview">
            <Text>Overview</Text>
          </TabsTrigger>
          <TabsTrigger value="spans">
            <Text>Spans</Text>
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Text>Logs</Text>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Scroll>
            <Text variant="h3" className="text-lg">
              Configuration
            </Text>
            <ConfigView
              config={run.config}
              characters={characters}
              objects={objects}
              adventureName={adventureName}
            />
            <Separator />
            <Text variant="h3" className="text-lg">
              Summary
            </Text>
            <SummaryView run={run} characters={characters} />
          </Scroll>
        </TabsContent>

        <TabsContent value="spans">
          <View className={wide ? "flex-row items-start gap-lg" : "gap-lg"}>
            <View className="flex-1">
              <Scroll>
                <SpanTree
                  spans={spans}
                  puzzle={run.puzzle}
                  characters={characters}
                  selectedId={selectedSpanId}
                  onSelect={setSelectedSpanId}
                />
              </Scroll>
            </View>
            <View className="flex-1">
              <Scroll>
                <SpanDetail
                  span={selected}
                  puzzle={run.puzzle}
                  depth={selected ? (depths.get(selected.spanId) ?? 0) : 0}
                  characters={characters}
                />
              </Scroll>
            </View>
          </View>
        </TabsContent>

        <TabsContent value="logs">
          <Scroll>
            <LogList logs={logs} />
          </Scroll>
        </TabsContent>
      </Tabs>
    </View>
  );
}
