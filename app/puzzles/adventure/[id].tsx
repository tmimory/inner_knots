import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { AdventureBuilder } from "@/components/flow";
import { NodeEditor, splitIssues } from "@/components/puzzles/adventure";
import { PageHeader, Screen, Scroll } from "@/components/shell";
import { Button, Field, Input, Separator, Text, Textarea } from "@/components/ui";
import { useAdventure } from "@/lib/client/use-adventures";
import {
  ADVENTURE_LIMITS,
  validateAdventure,
  type AdventureIssue,
  type AdventureNode,
} from "@/lib/domain/adventure";
import { pluralize } from "@/lib/format";
import { addNode } from "@/lib/puzzles/adventure/edits";
import { ADVENTURE_LAYOUT, layoutAdventure } from "@/lib/puzzles/adventure/layout";
import { cn } from "@/lib/utils";
import { durations } from "@/theme";

/** How long the builder waits after the last edit before writing the draft back. */
const AUTOSAVE_DELAY_MS = durations.slow * 4;

/** Where a new node lands: to the right of everything already on the canvas, as the graph flows. */
function nextNodePosition(nodes: readonly AdventureNode[]): {
  x: number;
  y: number;
} {
  if (nodes.length === 0) return { x: 0, y: 0 };
  const right = Math.max(...nodes.map((node) => node.position.x + ADVENTURE_LAYOUT.nodeWidth));
  const top = Math.min(...nodes.map((node) => node.position.y));
  return { x: right + ADVENTURE_LAYOUT.rankGap, y: top };
}

/** One finding from `validateAdventure`, as a row that selects the node it names. */
function IssueRow({
  issue,
  blocking,
  onPress,
}: {
  issue: AdventureIssue;
  blocking: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      role="button"
      className="flex-row items-center gap-sm rounded-md p-sm transition-colors duration-fast active:bg-muted web:hover:bg-muted"
      onPress={onPress}
    >
      <View className={cn("h-sm w-sm rounded-full", blocking ? "bg-destructive" : "bg-accent")} />
      <Text variant="small" className="flex-1">
        {issue.message}
      </Text>
    </Pressable>
  );
}

export default function AdventureBuilderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { draft, setDraft, loading, error, saving, dirty, save } = useAdventure(id ?? null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [fitSignal, setFitSignal] = useState(0);
  const [showIssues, setShowIssues] = useState(false);

  // Autosave: the builder is a canvas, and a canvas that loses work is a trap.
  useEffect(() => {
    if (!dirty || saving) return;
    const timer = setTimeout(() => void save(), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [dirty, saving, save]);

  const addBeside = useCallback(() => {
    if (!draft) return;
    const position = nextNodePosition(draft.nodes);
    const next = addNode(draft, position);
    setDraft(next);
    setSelectedNodeId(next.nodes[next.nodes.length - 1]?.id ?? null);
  }, [draft, setDraft]);

  if (loading) {
    return <Screen title="Opening the tree" subtitle="ὁδός · branching paths, recorded" />;
  }

  if (!draft) {
    return (
      <Screen title="No such adventure" subtitle="ὁδός · branching paths, recorded">
        <Text variant="lead">{error ?? "That adventure is not on the shelf any more."}</Text>
        <View className="flex-row">
          <Button variant="outline" onPress={() => router.push("/puzzles/adventure")}>
            <Text>Back to the shelf</Text>
          </Button>
        </View>
      </Screen>
    );
  }

  const issues = validateAdventure(draft);
  const { blocking, runnable } = splitIssues(issues);
  const selected = draft.nodes.find((node) => node.id === selectedNodeId);
  const saveState = saving ? "Saving…" : dirty ? "Unsaved changes" : "Saved";

  return (
    <View className="gap-xl">
      <View className="gap-xs">
        {/* Where this tree sits, not a thing to do with it — so it leads the
            title instead of standing in the row of actions. */}
        <Pressable
          role="link"
          className="self-start"
          onPress={() => router.push("/puzzles/adventure")}
        >
          <Text variant="meta" className="transition-colors duration-fast web:hover:text-primary">
            ← Shelf
          </Text>
        </Pressable>
        <PageHeader title={draft.name} subtitle="ὁδός · branching paths, recorded" />
      </View>

      <View className="flex-row flex-wrap items-center gap-sm">
        <Button variant="outline" size="sm" onPress={addBeside}>
          <Text>Add node</Text>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onPress={() => {
            setDraft(layoutAdventure(draft));
            setFitSignal((signal) => signal + 1);
          }}
        >
          <Text>Auto-layout</Text>
        </Button>
        <Button variant="ghost" size="sm" onPress={() => setShowIssues((open) => !open)}>
          <Text>{showIssues ? "Hide problems" : "Validate"}</Text>
        </Button>

        <View className="flex-1" />

        {/* One line about the draft's state. The Save button only appears when
            there is something to save; the rest of the time autosave has it. */}
        <Text variant="meta">{saveState}</Text>
        {dirty || saving ? (
          <Button variant="outline" size="sm" disabled={saving} onPress={() => void save()}>
            <Text>Save</Text>
          </Button>
        ) : null}
        {runnable ? null : (
          <Text variant="meta">{`${pluralize(blocking.length, "problem")} to fix first`}</Text>
        )}
        <Button
          size="sm"
          disabled={!runnable}
          onPress={() =>
            router.push({
              pathname: "/puzzles/adventure/[id]/run",
              params: { id: draft.id },
            })
          }
        >
          <Text>Run</Text>
        </Button>
      </View>

      {showIssues ? (
        <View className="gap-sm">
          <Text variant="h4">What the graph says</Text>
          {issues.length === 0 ? (
            <Text variant="muted">
              Nothing dangles, nothing is stranded, and every node offers a way on.
            </Text>
          ) : (
            issues.map((issue, index) => (
              <IssueRow
                key={`${issue.code}-${issue.nodeId ?? index}-${issue.optionId ?? index}`}
                issue={issue}
                blocking={blocking.includes(issue)}
                onPress={() => {
                  if (issue.nodeId !== undefined) setSelectedNodeId(issue.nodeId);
                  setFitSignal((signal) => signal + 1);
                }}
              />
            ))
          )}
        </View>
      ) : null}

      {error ? (
        <Text variant="small" className="text-destructive">
          {error}
        </Text>
      ) : null}

      <View className="gap-lg wide:flex-row wide:items-start">
        <View className="flex-1">
          <AdventureBuilder
            adventure={draft}
            onChange={setDraft}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            fitSignal={fitSignal}
          />
        </View>

        <Scroll className="w-full wide:w-inspector">
          {/* The inspector reads top to bottom: the tree, then the card in it. */}
          <Text variant="h4">Adventure</Text>

          <Field label="Title">
            <Input
              maxLength={ADVENTURE_LIMITS.name}
              accessibilityLabel="Adventure name"
              value={draft.name}
              onChangeText={(name) => setDraft({ ...draft, name })}
            />
          </Field>
          <Field label="Briefing">
            <Textarea
              rows={5}
              maxLength={ADVENTURE_LIMITS.briefing}
              accessibilityLabel="Briefing"
              placeholder="Read to every character before every node."
              value={draft.briefing}
              onChangeText={(briefing) => setDraft({ ...draft, briefing })}
            />
          </Field>

          <Separator />

          {selected ? (
            <NodeEditor
              adventure={draft}
              node={selected}
              onChange={setDraft}
              onRemoved={() => setSelectedNodeId(null)}
            />
          ) : (
            <Text variant="muted">
              Select a card to write it; drag an option&apos;s handle onto another card.
            </Text>
          )}
        </Scroll>
      </View>
    </View>
  );
}
