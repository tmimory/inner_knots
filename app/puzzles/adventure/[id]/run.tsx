import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";

import { AdventureOutcomes } from "@/components/flow";
import { PathList, pathKey, splitIssues } from "@/components/puzzles/adventure";
import { PromptView } from "@/components/puzzles/prompt-view";
import { RosterBar } from "@/components/puzzles/roster-bar";
import { RunProgress } from "@/components/puzzles/run-progress";
import { Section } from "@/components/puzzles/section";
import { Screen } from "@/components/shell";
import { Button, Label, Switch, Text } from "@/components/ui";
import { describeApiError } from "@/lib/client/errors";
import { previewAdventurePrompt } from "@/lib/client/prompts";
import { useAdventure } from "@/lib/client/use-adventures";
import { useCharacters } from "@/lib/client/use-characters";
import { usePromptPreview } from "@/lib/client/use-prompt-preview";
import { useRun, useRunStarter } from "@/lib/client/use-run";
import { validateAdventure } from "@/lib/domain/adventure";
import { RUN_LIMITS, type RosterEntry } from "@/lib/domain/run";
import type { AdventureSummary } from "@/lib/domain/summary";
import { pluralize } from "@/lib/format";

export default function AdventureRunScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { draft: adventure, loading, error } = useAdventure(id ?? null);
  const { characters } = useCharacters();

  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [amnesia, setAmnesia] = useState(false);
  const [selectedPath, setSelectedPath] = useState<{ runId: string; key: string } | null>(null);
  const [fitSignal, setFitSignal] = useState(0);

  const prompt = usePromptPreview(async () => {
    if (!adventure) return [];
    const { prompt: composed } = await previewAdventurePrompt(adventure.id, amnesia);
    return [{ system: composed.system, user: composed.user, options: composed.options }];
  });

  const starter = useRunStarter();
  const { run, summary } = useRun(starter.runId);
  const adventureSummary: AdventureSummary | undefined =
    summary?.kind === "adventure" ? summary : undefined;

  // A walk selected on an earlier poll is re-read from the newest summary, because
  // the engine extends a path step by step while the run is still going. Tagging
  // the selection with its run is also what drops it when a new run starts.
  const highlight = useMemo(() => {
    if (selectedPath === null || selectedPath.runId !== starter.runId) return undefined;
    return adventureSummary?.paths.find((path) => pathKey(path) === selectedPath.key);
  }, [adventureSummary, selectedPath, starter.runId]);

  const issues = adventure ? validateAdventure(adventure) : [];
  const { blocking, runnable } = splitIssues(issues);

  const blocked =
    roster.length === 0
      ? "Put at least one character on the roster."
      : !runnable
        ? `${pluralize(blocking.length, "problem")} in the tree stop a run.`
        : null;

  if (loading || !adventure) {
    return (
      <Screen title="Opening the tree" subtitle="ὁδός · branching paths, recorded">
        {error ? (
          <View className="gap-md">
            <Text variant="lead">{error}</Text>
            <View className="flex-row">
              <Button variant="outline" onPress={() => router.push("/puzzles/adventure")}>
                <Text>Back to the shelf</Text>
              </Button>
            </View>
          </View>
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen
      title={adventure.name}
      subtitle="ὁδός · branching paths, recorded"
      right={
        <>
          <Button
            variant="outline"
            size="sm"
            onPress={() =>
              router.push({ pathname: "/puzzles/adventure/[id]", params: { id: adventure.id } })
            }
          >
            <Text>Edit the tree</Text>
          </Button>
        </>
      }
    >
      <Section
        title="The cast"
        description="Who walks the tree, and how many times each of them walks it."
      >
        <RosterBar
          value={roster}
          onChange={setRoster}
          characters={characters}
          max={RUN_LIMITS.maxRoster}
          min={0}
        />
      </Section>

      <Section
        title="The framing"
        description="What every character is told before every node, and what they are allowed to remember."
      >
        <View className="flex-row items-center justify-between gap-md">
          <View className="flex-1 gap-xs">
            <Label nativeID="amnesia">Amnesia Switch</Label>
            <Text variant="muted">
              {amnesia
                ? "Each node arrives fresh: no memory of the choices that led there."
                : "Earlier nodes, choices and outcomes travel along as history."}
            </Text>
          </View>
          <Switch aria-labelledby="amnesia" checked={amnesia} onCheckedChange={setAmnesia} />
        </View>

        <View className="gap-xs rounded-md border-hairline border-border bg-muted p-md">
          <Text variant="muted" className="font-display uppercase">
            Briefing
          </Text>
          <Text variant="small">
            {adventure.briefing.trim() === ""
              ? "This adventure has no briefing; each node speaks for itself."
              : adventure.briefing}
          </Text>
        </View>
      </Section>

      <Section
        title="The run"
        description="The first node, exactly as it would be sent, and then the walk itself."
        right={
          <>
            <Button variant="outline" size="sm" onPress={() => void prompt.show()}>
              <Text>Prompt View</Text>
            </Button>
            <Button
              disabled={blocked !== null || starter.starting}
              onPress={() =>
                void starter.start({
                  puzzle: "adventure",
                  adventureId: adventure.id,
                  amnesia,
                  roster,
                })
              }
            >
              <Text>{starter.starting ? "Starting…" : "Run"}</Text>
            </Button>
          </>
        }
      >
        {blocked ? <Text variant="muted">{blocked}</Text> : null}
        {starter.error ? (
          <Text variant="small" className="text-destructive">
            {describeApiError(starter.error)}
          </Text>
        ) : null}
        <RunProgress run={run} idleMessage="No walk has been sent out yet." />
        {run ? (
          <View className="flex-row">
            <Button
              variant="ghost"
              size="sm"
              onPress={() => router.push({ pathname: "/logs/[id]", params: { id: run.id } })}
            >
              <Text>View in Logs →</Text>
            </Button>
          </View>
        ) : null}
      </Section>

      {adventureSummary ? (
        <Section
          title="Where they went"
          description="Node counts and option frequencies over the tree; pick a walk to trace one path."
          right={
            <Button variant="ghost" size="sm" onPress={() => setFitSignal((signal) => signal + 1)}>
              <Text>Fit view</Text>
            </Button>
          }
        >
          <AdventureOutcomes
            adventure={adventure}
            summary={adventureSummary}
            highlight={highlight}
            fitSignal={fitSignal}
          />
          <PathList
            adventure={adventure}
            paths={adventureSummary.paths}
            characters={characters}
            selected={highlight}
            onSelect={(path) =>
              setSelectedPath(
                path && starter.runId !== null ? { runId: starter.runId, key: pathKey(path) } : null,
              )
            }
          />
        </Section>
      ) : null}

      <PromptView
        open={prompt.open}
        onOpenChange={prompt.setOpen}
        title="The first node, as sent"
        description="The briefing and the start node. A character's own steering prompt is prepended by the engine."
        panels={prompt.panels}
        loading={prompt.loading}
        error={prompt.error}
      />
    </Screen>
  );
}
