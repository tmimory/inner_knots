import { useState } from "react";
import { View } from "react-native";

import { Button, ConfirmDialog, Field, Input, Separator, Text, Textarea } from "@/components/ui";
import { ADVENTURE_LIMITS, type Adventure, type AdventureNode } from "@/lib/domain/adventure";
import {
  addOption,
  removeNode,
  removeOption,
  setStartNode,
  updateNode,
  updateOption,
} from "@/lib/puzzles/adventure/edits";

import { PanelHeading } from "./panel-heading";
import { StartLabel } from "./start-label";

export type NodeEditorProps = {
  adventure: Adventure;
  /** The node the canvas has selected. */
  node: AdventureNode;
  onChange: (next: Adventure) => void;
  /** Called once the node is gone, so the screen can drop its selection. */
  onRemoved: () => void;
};

/** How many rows each of the long fields opens at. */
const ROWS = { context: 4, decision: 3, outcome: 2 } as const;

/** The name of the node an option leads to, or the fact that it ends there. */
function targetLabel(adventure: Adventure, nextNodeId: string | null): string {
  if (nextNodeId === null) return "ends the adventure";
  const target = adventure.nodes.find((node) => node.id === nextNodeId);
  const decision = target?.decision.trim();
  if (!target) return `points at a node that is gone (${nextNodeId})`;
  return decision && decision.length > 0 ? `leads to “${decision}”` : `leads to ${target.id}`;
}

/**
 * The inspector for the selected decision node.
 *
 * Deliberately platform-neutral: it is a form, and it is the half of the builder
 * that still works where React Flow cannot draw. Nothing here writes an edge by
 * hand — an option's target is set on the canvas — so what is edited is the node's
 * own words and the options it offers.
 */
export function NodeEditor({ adventure, node, onChange, onRemoved }: NodeEditorProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const isStart = adventure.startNodeId === node.id;
  const full = node.options.length >= ADVENTURE_LIMITS.maxOptions;

  function remove() {
    setConfirmingDelete(false);
    onChange(removeNode(adventure, node.id));
    onRemoved();
  }

  return (
    <View className="gap-md">
      <View className="flex-row flex-wrap items-center gap-sm">
        {/* The panel above already says which card this is, in its own words, so
            what is left here is the card's id — a marginal fact, set as one —
            and the two things that can be done to the whole card. A second
            display-size heading four pixels under the first read as two panels. */}
        <Text variant="meta" className="flex-1 font-mono" numberOfLines={1}>
          {node.id}
        </Text>
        {isStart ? (
          <StartLabel />
        ) : (
          <Button
            variant="outline"
            size="sm"
            onPress={() => onChange(setStartNode(adventure, node.id))}
          >
            <Text>Set as start</Text>
          </Button>
        )}
        <Button variant="destructive" size="sm" onPress={() => setConfirmingDelete(true)}>
          <Text>Delete node</Text>
        </Button>
      </View>

      <Field label="Context">
        <Textarea
          rows={ROWS.context}
          maxLength={ADVENTURE_LIMITS.context}
          placeholder="What the character is shown before the question."
          value={node.context}
          onChangeText={(context) => onChange(updateNode(adventure, node.id, { context }))}
        />
      </Field>

      <Field label="Decision">
        <Textarea
          rows={ROWS.decision}
          maxLength={ADVENTURE_LIMITS.decision}
          placeholder="The question this node asks."
          value={node.decision}
          onChangeText={(decision) => onChange(updateNode(adventure, node.id, { decision }))}
        />
      </Field>

      <Separator />

      <View className="flex-row items-center justify-between gap-md">
        <PanelHeading>Options</PanelHeading>
        {/* A count, not a caption with an opinion: metadata size in the metadata
            ink, so it sits beside the heading rather than under it. */}
        <Text variant="meta">{`${node.options.length} / ${ADVENTURE_LIMITS.maxOptions}`}</Text>
      </View>

      {node.options.length === 0 ? (
        <Text variant="muted">
          A node with no options is where a walk stops short. Give it at least one.
        </Text>
      ) : null}

      {node.options.map((option, index) => (
        <View key={option.id} className="gap-sm border-t-hairline border-border pt-md">
          <View className="flex-row items-center gap-sm">
            <Text variant="muted" className="font-mono text-xs">
              {index + 1}
            </Text>
            <Input
              className="flex-1"
              maxLength={ADVENTURE_LIMITS.optionLabel}
              accessibilityLabel={`Label for option ${index + 1}`}
              value={option.label}
              onChangeText={(label) =>
                onChange(updateOption(adventure, node.id, option.id, { label }))
              }
            />
            <Button
              variant="ghost"
              size="icon"
              accessibilityLabel={`Remove option ${index + 1}`}
              onPress={() => onChange(removeOption(adventure, node.id, option.id))}
            >
              <Text className="font-mono">×</Text>
            </Button>
          </View>

          <Textarea
            rows={ROWS.outcome}
            maxLength={ADVENTURE_LIMITS.outcome}
            placeholder="Outcome, injected into the next step"
            accessibilityLabel={`Outcome for option ${index + 1}`}
            value={option.outcome ?? ""}
            onChangeText={(outcome) =>
              onChange(
                updateOption(adventure, node.id, option.id, {
                  outcome: outcome === "" ? undefined : outcome,
                }),
              )
            }
          />
          <Text variant="muted">{targetLabel(adventure, option.nextNodeId)}</Text>
        </View>
      ))}

      <Button
        variant="outline"
        disabled={full}
        onPress={() => onChange(addOption(adventure, node.id))}
      >
        <Text>{full ? "Five options is the limit" : "Add option"}</Text>
      </Button>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="Delete this node?"
        description="Every option that led here will end the adventure instead. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        destructive
        onConfirm={remove}
      />
    </View>
  );
}
