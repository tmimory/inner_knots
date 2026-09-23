import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";

import {
  ConfigView,
  CopyId,
  ExportButton,
  Field,
  LogList,
  PUZZLE_LABELS,
  SpanDetail,
  SpanTree,
  StatusMark,
  SummaryView,
  nameOf,
  rosterOf,
  shortRunId,
  spanDepths,
  variantLabel,
} from "@/components/logs";
import { PageHeader, Screen, SplitPane } from "@/components/shell";
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
import type { Character } from "@/lib/domain/character";
import type { Run } from "@/lib/domain/run";
import { errorMessage } from "@/lib/errors";
import { formatElapsed, formatStamp } from "@/lib/format";

/** One labelled value in the run's metadata row, sharing the row evenly. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Field label={label} className="min-w-field flex-1">
      <Text variant="data">{value}</Text>
    </Field>
  );
}

/** The framing a run was put under, where the puzzle has one. */
function configVariant(config: Run["config"]): string | undefined {
  switch (config.puzzle) {
    case "trolley":
    case "prisoners-dilemma":
    case "st-petersburg":
      return variantLabel(config.variant);
    // The adventure's framing is the graph it walks: there is no framing to name
    // here that the configuration below does not already say.
    case "adventure":
      return undefined;
  }
}

/** Who answered, in the order the run seated them. */
function rosterNames(config: Run["config"], characters: ReadonlyMap<string, Character>): string {
  const names = rosterOf(config).map((seat) => nameOf(seat.characterId, characters));
  return [...new Set(names)].join(" · ");
}

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

  const active = isRunActive(run);
  const variant = configVariant(run.config);

  // The page is a header with a breadcrumb over it, which `Screen` does not draw,
  // so the wrapper carries the screen's rhythm itself. It runs the full content
  // width like the ledger it was opened from: a span tree beside its inspector, a
  // log list and a summary table are data, not prose, and set in a reading column
  // they used half the pane on a wide window and the tree was squeezed to a third.
  return (
    <View className="gap-2xl">
      {/*
        The page is named after the run it is: the puzzle, and the eight
        characters that tell this run from the other six the same puzzle ran
        today. Titled "Trolley problem" alone it was indistinguishable from the
        puzzle's own screen and from every other run in the ledger.
      */}
      <PageHeader
        breadcrumb={{ label: "Logs", href: "/logs" }}
        title={`${PUZZLE_LABELS[run.puzzle]} · ${shortRunId(run.id).trim()}`}
        subtitle="ὑπόμνημα — one run, in full"
        right={
          <>
            <StatusMark status={run.status} />
            {active ? (
              <Button variant="destructive" size="sm" onPress={() => void cancel()}>
                <Text>Cancel</Text>
              </Button>
            ) : null}
            <CopyId value={run.id} />
            <ExportButton run={run} spans={spans} logs={logs} />
          </>
        }
      />

      <View className="gap-lg">
        {/*
          Four facts about the run, on four even columns: when it started, how long
          it took, what framing it was put under and who answered. Progress is not
          among them once a run has settled — "7 / 7" beside a state that already
          says the run is done is the same fact twice — so it joins the row only
          while there is still something to be part-way through.
        */}
        <View className="flex-row flex-wrap gap-lg">
          <Stat label="Started" value={formatStamp(run.startedAt)} />
          <Stat label="Duration" value={formatElapsed(run.startedAt, run.finishedAt)} />
          {variant ? <Stat label="Variant" value={variant} /> : null}
          <Stat label="Roster" value={rosterNames(run.config, characters)} />
          {active ? (
            <Stat label="Progress" value={`${run.progress.done} / ${run.progress.total}`} />
          ) : null}
        </View>
        {active ? (
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
        {/* How much there is of each thing rides its own tab: as two more stats
            in the meta row they were counts of things the reader could not see
            yet, sitting beside the id and the clock as though they ranked with
            them. */}
        <TabsList>
          <TabsTrigger value="overview">
            <Text>Overview</Text>
          </TabsTrigger>
          <TabsTrigger value="spans" count={spans.length}>
            <Text>Spans</Text>
          </TabsTrigger>
          <TabsTrigger value="logs" count={logs.length}>
            <Text>Logs</Text>
          </TabsTrigger>
        </TabsList>

        {/* One rhythm and it is held: the air within a section is two thirds of
            the air between two of them. */}
        <TabsContent value="overview">
          <View className="gap-2xl">
            <View className="gap-lg">
              <SectionHeading title="Configuration" />
              <ConfigView config={run.config} objects={objects} adventureName={adventureName} />
            </View>
            <View className="gap-lg border-t-hairline border-border pt-xl">
              <SectionHeading title="Summary" />
              <SummaryView run={run} characters={characters} />
            </View>
          </View>
        </TabsContent>

        <TabsContent value="spans">
          {/* The tree and what it opens are two columns of one spread, divided by
              a rule. Two bordered panels side by side read as two documents. */}
          <SplitPane
            railWidth="inspector"
            railRule="content"
            main={
              <SpanTree
                spans={spans}
                puzzle={run.puzzle}
                characters={characters}
                selectedId={selectedSpanId}
                onSelect={setSelectedSpanId}
              />
            }
            rail={
              <SpanDetail
                span={selected}
                puzzle={run.puzzle}
                depth={selected ? (depths.get(selected.spanId) ?? 0) : 0}
                characters={characters}
              />
            }
          />
        </TabsContent>

        <TabsContent value="logs">
          <LogList logs={logs} />
        </TabsContent>
      </Tabs>
    </View>
  );
}
