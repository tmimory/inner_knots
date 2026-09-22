import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";

import {
  ConfigView,
  ExportButton,
  FieldCode,
  LogList,
  PUZZLE_LABELS,
  SpanDetail,
  SpanTree,
  StatusMark,
  SummaryView,
  spanDepths,
} from "@/components/logs";
import { Screen } from "@/components/shell";
import {
  Button,
  EmptyState,
  Progress,
  SectionHeading,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
  useToast,
} from "@/components/ui";
import { cancelRun } from "@/lib/client/runs";
import {
  LOGS_POLL_MS,
  isRunActive,
  useAdventureName,
  useCharacterIndex,
  useObjectIndex,
  useRunDetail,
} from "@/lib/client/use-runs";
import { errorMessage } from "@/lib/errors";
import { formatDateTime, formatElapsed } from "@/lib/format";

export default function RunDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const runId = typeof params.id === "string" ? params.id : "";
  const { toast } = useToast();

  const { run, spans, logs, loading, error, refresh } = useRunDetail(runId, { pollMs: LOGS_POLL_MS });
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
        description: errorMessage(failure),
        tone: "destructive",
      });
    }
  }

  if (!run) {
    return (
      <Screen title="Run" subtitle="ὑπόμνημα — one run, in full">
        <EmptyState
          title={loading ? "Reading the run…" : "No such run"}
          body={loading ? undefined : (error ?? `No run is recorded under "${runId}".`)}
          links={[{ label: "Back to the ledger", href: "/logs" }]}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title={PUZZLE_LABELS[run.puzzle]}
      subtitle="ὑπόμνημα — one run, in full"
      right={
        <>
          <StatusMark status={run.status} />
          {isRunActive(run) ? (
            <Button variant="destructive" size="sm" onPress={() => void cancel()}>
              <Text>Cancel</Text>
            </Button>
          ) : null}
          <ExportButton run={run} spans={spans} logs={logs} />
        </>
      }
    >
      <View className="gap-lg">
        <View className="flex-row flex-wrap items-center gap-xl">
          {/* The id is what this page is, so it leads the stat row rather than
              standing in for the Greek subtitle every other screen carries. */}
          <FieldCode label="Run" value={run.id} />
          <FieldCode label="Started" value={formatDateTime(run.startedAt)} />
          <FieldCode label="Duration" value={formatElapsed(run.startedAt, run.finishedAt)} />
          <FieldCode label="Progress" value={`${run.progress.done} / ${run.progress.total}`} />
          <FieldCode label="Spans" value={String(spans.length)} />
          <FieldCode label="Log lines" value={String(logs.length)} />
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
      </View>

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
          <View className="gap-xl">
            <View className="gap-lg">
              <SectionHeading title="Configuration" />
              <ConfigView
                config={run.config}
                characters={characters}
                objects={objects}
                adventureName={adventureName}
              />
            </View>
            <View className="gap-lg border-t-hairline border-border pt-md">
              <SectionHeading title="Summary" />
              <SummaryView run={run} characters={characters} />
            </View>
          </View>
        </TabsContent>

        <TabsContent value="spans">
          {/* The tree and what it opens are two columns of one spread, divided by
              a rule. Two bordered panels side by side read as two documents. */}
          <View className="gap-lg wide:flex-row wide:items-stretch wide:gap-xl">
            <View className="flex-1">
              <SpanTree
                spans={spans}
                puzzle={run.puzzle}
                characters={characters}
                selectedId={selectedSpanId}
                onSelect={setSelectedSpanId}
              />
            </View>
            <View className="flex-1 wide:border-l-hairline wide:border-border wide:pl-xl">
              <SpanDetail
                span={selected}
                puzzle={run.puzzle}
                depth={selected ? (depths.get(selected.spanId) ?? 0) : 0}
                characters={characters}
              />
            </View>
          </View>
        </TabsContent>

        <TabsContent value="logs">
          <LogList logs={logs} />
        </TabsContent>
      </Tabs>
    </Screen>
  );
}
