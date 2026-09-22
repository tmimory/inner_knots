import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { AdventureBuilder } from "@/components/flow";
import { NodeEditor, PanelHeading, splitIssues } from "@/components/puzzles/adventure";
import { PageHeader, Screen, SplitPane } from "@/components/shell";
import { Button, Field, Input, Text, Textarea } from "@/components/ui";
import { useAdventure } from "@/lib/client/use-adventures";
import {
  ADVENTURE_LIMITS,
  validateAdventure,
  type AdventureIssue,
  type AdventureNode,
} from "@/lib/domain/adventure";
import { pluralize, truncate } from "@/lib/format";
import { addNode } from "@/lib/puzzles/adventure/edits";
import { cn } from "@/lib/utils";
import { durations } from "@/theme";

/** How long the builder waits after the last edit before writing the draft back. */
const AUTOSAVE_DELAY_MS = durations.slow * 4;

/** How much of a card's question the inspector heading carries before it clamps. */
const PANEL_HEADING_CHARS = 64;

/** What the inspector is called while a card is selected: that card's question. */
function panelHeading(node: AdventureNode): string {
  const decision = node.decision.trim();
  return decision === "" ? "Untitled card" : truncate(decision, PANEL_HEADING_CHARS);
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

  /**
   * A new card, selected so the inspector is already pointed at it.
   *
   * Nothing is said about where it goes: the canvas lays the tree out from its
   * own shape, so an orphan card sits in a rank of its own until an option is
   * pointed at it, and re-frames itself the moment one is.
   */
  const addCard = useCallback(() => {
    if (!draft) return;
    const next = addNode(draft);
    setDraft(next);
    setSelectedNodeId(next.nodes[next.nodes.length - 1]?.id ?? null);
  }, [draft, setDraft]);

  if (loading) {
    return <Screen title="Opening the tree" subtitle="ὁδός — branching paths, recorded" />;
  }

  if (!draft) {
    return (
      <Screen title="No such adventure" subtitle="ὁδός — branching paths, recorded">
        <Text variant="lead">{error ?? "That adventure is not on the shelf any more."}</Text>
        <View className="flex-row">
          <Button variant="outline" onPress={() => router.push("/puzzles/adventure")}>
            <Text>Back to adventures</Text>
          </Button>
        </View>
      </Screen>
    );
  }

  const issues = validateAdventure(draft);
  const { blocking, runnable } = splitIssues(issues);
  const selected = draft.nodes.find((node) => node.id === selectedNodeId);
  const saveState = saving ? "Saving…" : dirty ? "Unsaved changes" : "Saved";
  const saveGlyph = !saving && !dirty ? "✓ " : "";

  return (
    <View className="gap-xl">
      <PageHeader
        breadcrumb={{ label: "Adventures", href: "/puzzles/adventure" }}
        title={draft.name}
        subtitle="ὁδός — branching paths, recorded"
      />

      <View className="flex-row flex-wrap items-center gap-sm">
        {/* Two verbs in one voice. An outlined "+ Add node" beside a bare one made
            the toolbar read as a control and an afterthought; the tools of a
            workshop are the same size and the same weight, and the one filled
            button on the row is Run. "Auto-layout" is gone with the dragging it
            used to undo: the tree is always laid out, and the canvas's own fit
            control is what brings it all back into view. */}
        <Button variant="ghost" size="sm" onPress={addCard}>
          <Text>+ Add node</Text>
        </Button>
        <Button variant="ghost" size="sm" onPress={() => setShowIssues((open) => !open)}>
          <Text>{showIssues ? "Hide problems" : "Validate"}</Text>
        </Button>

        <View className="flex-1" />

        {/* What the draft's state is: a marginal note at the far end of the row,
            beside the button it is about, with a check so it reads as a state
            rather than as a third thing to press. Set among the verbs at the left,
            it read as one more verb. */}
        <Text variant="meta">
          {saveGlyph}
          {saveState}
        </Text>

        {dirty || saving ? (
          <Button variant="outline" size="sm" disabled={saving} onPress={() => void save()}>
            <Text>Save</Text>
          </Button>
        ) : null}

        {/* The reason Run is off sits under Run, where the eye already is. */}
        <View className="items-end gap-xxs">
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
          {runnable ? null : (
            <Text variant="meta" className="text-xs">
              {`${pluralize(blocking.length, "problem")} to fix first`}
            </Text>
          )}
        </View>
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

      {/*
        Canvas and inspector are two columns of one spread, not a canvas with a
        card parked beside it: the inspector keeps no border of its own, and the
        hairline between them is drawn on the column, so it runs the full depth of
        the canvas and the workspace reads as one instrument rather than as a
        drawing next to a form that stopped early.
      */}
      <SplitPane
        railWidth="inspector"
        railRule="column"
        main={
          <AdventureBuilder
            adventure={draft}
            onChange={setDraft}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            fitSignal={fitSignal}
          />
        }
        rail={
          <View className="gap-lg">
            {/*
              The panel says what it is about rather than what it is: "Adventure"
              while nothing is picked, and the card's own question once one is. A
              heading reading "Details" over fields that change underneath it made
              the reader work out which object they were editing.
            */}
            <PanelHeading>{selected ? panelHeading(selected) : "Adventure"}</PanelHeading>

            {selected ? (
              <NodeEditor
                adventure={draft}
                node={selected}
                onChange={setDraft}
                onRemoved={() => setSelectedNodeId(null)}
              />
            ) : (
              <>
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
                {/* The one helper line on the screen, and it is this panel's empty
                    state — what to do to fill it — not a footnote under a counter. */}
                <Text variant="muted">
                  Select a card to write it; drag an option&apos;s handle onto another card.
                </Text>
              </>
            )}
          </View>
        }
      />
    </View>
  );
}
