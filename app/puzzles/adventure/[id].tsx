import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { AdventureBuilder } from "@/components/flow";
import { NodeEditor, issueBadge, splitIssues } from "@/components/puzzles/adventure";
import { PageHeader, Scroll } from "@/components/shell";
import { Badge, Button, Input, Separator, Text, Textarea } from "@/components/ui";
import { useAdventure } from "@/lib/client/use-adventures";
import { useWideViewport } from "@/lib/client/use-viewport";
import {
  ADVENTURE_LIMITS,
  validateAdventure,
  type AdventureIssue,
  type AdventureNode,
} from "@/lib/domain/adventure";
import { addNode } from "@/lib/puzzles/adventure/edits";
import {
  ADVENTURE_LAYOUT,
  adventureNodeHeight,
  layoutAdventure,
} from "@/lib/puzzles/adventure/layout";
import { durations } from "@/theme";

/** How long the builder waits after the last edit before writing the draft back. */
const AUTOSAVE_DELAY_MS = durations.slow * 4;

/** Where a new node lands: under everything already on the canvas. */
function nextNodePosition(nodes: readonly AdventureNode[]): { x: number; y: number } {
  if (nodes.length === 0) return { x: 0, y: 0 };
  const bottom = Math.max(...nodes.map((node) => node.position.y + adventureNodeHeight(node)));
  const left = Math.min(...nodes.map((node) => node.position.x));
  return { x: left, y: bottom + ADVENTURE_LAYOUT.rankGap };
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
      className="flex-row items-start gap-sm rounded-md p-sm transition-colors duration-fast active:bg-muted web:hover:bg-muted"
      onPress={onPress}
    >
      <Badge variant={blocking ? "destructive" : "accent"}>
        <Text>{blocking ? "blocks" : "note"}</Text>
      </Badge>
      <Text variant="small" className="flex-1">
        {issue.message}
      </Text>
    </Pressable>
  );
}

export default function AdventureBuilderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const wide = useWideViewport();

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

  const addBelow = useCallback(() => {
    if (!draft) return;
    const position = nextNodePosition(draft.nodes);
    const next = addNode(draft, position);
    setDraft(next);
    setSelectedNodeId(next.nodes[next.nodes.length - 1]?.id ?? null);
  }, [draft, setDraft]);

  if (loading) {
    return (
      <View className="gap-lg">
        <PageHeader title="Opening the tree" subtitle="ὁδός · branching paths, recorded" />
      </View>
    );
  }

  if (!draft) {
    return (
      <View className="gap-lg">
        <PageHeader title="No such adventure" subtitle="ὁδός · branching paths, recorded" />
        <Scroll>
          <Text variant="lead">{error ?? "That adventure is not on the shelf any more."}</Text>
          <View className="flex-row">
            <Button variant="outline" onPress={() => router.push("/puzzles/adventure")}>
              <Text>Back to the shelf</Text>
            </Button>
          </View>
        </Scroll>
      </View>
    );
  }

  const issues = validateAdventure(draft);
  const { blocking, runnable } = splitIssues(issues);
  const badge = issueBadge(issues);
  const selected = draft.nodes.find((node) => node.id === selectedNodeId);

  return (
    <View className="gap-lg">
      <PageHeader
        title={draft.name}
        subtitle="ὁδός · branching paths, recorded"
        right={
          <>
            <Badge variant={badge.variant}>
              <Text>{badge.label}</Text>
            </Badge>
            <Badge variant={dirty || saving ? "accent" : "muted"}>
              <Text>{saving ? "saving…" : dirty ? "unsaved" : "saved"}</Text>
            </Badge>
          </>
        }
      />

      <View className="flex-row flex-wrap items-center gap-sm">
        <Button variant="ghost" size="sm" onPress={() => router.push("/puzzles/adventure")}>
          <Text>← Shelf</Text>
        </Button>
        <Button size="sm" disabled={!dirty || saving} onPress={() => void save()}>
          <Text>Save</Text>
        </Button>
        <Button variant="outline" size="sm" onPress={addBelow}>
          <Text>Add node</Text>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onPress={() => {
            setDraft(layoutAdventure(draft));
            setFitSignal((signal) => signal + 1);
          }}
        >
          <Text>Auto-layout</Text>
        </Button>
        <Button variant="outline" size="sm" onPress={() => setShowIssues((open) => !open)}>
          <Text>{showIssues ? "Hide problems" : "Validate"}</Text>
        </Button>
        <Button variant="outline" size="sm" onPress={() => setFitSignal((signal) => signal + 1)}>
          <Text>Fit view</Text>
        </Button>
        <View className="flex-1" />
        <Button
          variant="secondary"
          size="sm"
          disabled={!runnable}
          onPress={() =>
            router.push({ pathname: "/puzzles/adventure/[id]/run", params: { id: draft.id } })
          }
        >
          <Text>{runnable ? "Run" : `${blocking.length} to fix first`}</Text>
        </Button>
      </View>

      {showIssues ? (
        <Scroll ornament={false}>
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
        </Scroll>
      ) : null}

      {error ? (
        <Text variant="small" className="text-destructive">
          {error}
        </Text>
      ) : null}

      <View className={wide ? "flex-row items-start gap-lg" : "gap-lg"}>
        <View className="flex-1">
          <AdventureBuilder
            adventure={draft}
            onChange={setDraft}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            fitSignal={fitSignal}
          />
          <Text variant="muted" className="pt-xs">
            Drag an option&apos;s handle onto another card to connect it; double-click an edge to
            cut it. An option with no edge ends the adventure.
          </Text>
        </View>

        <Scroll className={wide ? "w-inspector" : "w-full"} ornament={false}>
          <Text variant="h3">The tree</Text>
          <Input
            maxLength={ADVENTURE_LIMITS.name}
            accessibilityLabel="Adventure name"
            value={draft.name}
            onChangeText={(name) => setDraft({ ...draft, name })}
          />
          <Text variant="muted">Briefing — read to every character before every node.</Text>
          <Textarea
            rows={5}
            maxLength={ADVENTURE_LIMITS.briefing}
            accessibilityLabel="Briefing"
            value={draft.briefing}
            onChangeText={(briefing) => setDraft({ ...draft, briefing })}
          />

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
              Select a card on the canvas to write its context, its question and the ways out of it.
            </Text>
          )}
        </Scroll>
      </View>
    </View>
  );
}
