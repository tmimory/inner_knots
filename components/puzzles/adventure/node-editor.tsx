import { View } from "react-native";

import {
  Button,
  Field,
  FieldCounter,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Text,
  Textarea,
  type SelectOption,
} from "@/components/ui";
import { ADVENTURE_LIMITS, type Adventure, type AdventureNode } from "@/lib/domain/adventure";
import { truncate } from "@/lib/format";
import {
  addOption,
  removeOption,
  setOptionTarget,
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
  /** Asks the screen to confirm the deletion; the screen owns the one dialog. */
  onRequestDelete: () => void;
};

/** How many rows each of the long fields opens at. */
/*
  Context and Decision share a row, so they open at the same height: two boxes
  side by side at different heights put their counters on different baselines.
*/
const ROWS = { context: 4, decision: 4, outcome: 2 } as const;

/**
 * The value the "Leads to" select carries for a branch that stops where it is.
 *
 * Deliberately not a node id: `null` is a real target in the domain, and a select
 * has to name every choice, so the sentinel has to be a string no id can be.
 */
const ENDS_VALUE = "__end__";

/** What the select calls that choice. */
const ENDS_LABEL = "Ends the adventure";

/** How much of a card's question the "Leads to" list carries before it clamps. */
const TARGET_LABEL_CHARS = 48;

/** What one card is called in another card's "Leads to" list. */
function targetLabel(node: AdventureNode): string {
  const decision = node.decision.trim();
  return decision === "" ? node.id : truncate(decision, TARGET_LABEL_CHARS);
}

/** A target that is not in the graph any more, named so the author can repoint it. */
function goneLabel(nextNodeId: string): string {
  return `gone: ${nextNodeId}`;
}

/**
 * The inspector for the selected decision node.
 *
 * Deliberately platform-neutral: it is a form, and it is the half of the builder
 * that still works where React Flow cannot draw. Every edge the node owns can be
 * written from here — the "Leads to" select and a drag on the canvas are two ways
 * to say the same thing — so what the author cannot reach with a mouse they can
 * still reach with a list.
 */
export function NodeEditor({ adventure, node, onChange, onRequestDelete }: NodeEditorProps) {
  const isStart = adventure.startNodeId === node.id;
  const full = node.options.length >= ADVENTURE_LIMITS.maxOptions;
  /** Every card an option may point at: itself is not a branch, it is a loop of one. */
  const targets = adventure.nodes.filter((candidate) => candidate.id !== node.id);

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
        <Button variant="destructive" size="sm" onPress={onRequestDelete}>
          <Text>Delete node</Text>
        </Button>
      </View>

      {/* What the card shows and what it asks are one thought read in order, and
          the inspector now has the page's whole width to hold it: side by side
          they are read in a glance, stacked one under the other the second field
          started below the fold of a laptop. Under the breakpoint they stack. */}
      <View className="gap-md wide:flex-row">
        <Field label="Context" className="flex-1">
          <Textarea
            rows={ROWS.context}
            maxLength={ADVENTURE_LIMITS.context}
            placeholder="What the character is shown before the question."
            value={node.context}
            onChangeText={(context) => onChange(updateNode(adventure, node.id, { context }))}
          />
        </Field>

        <Field label="Decision" className="flex-1">
          <Textarea
            rows={ROWS.decision}
            maxLength={ADVENTURE_LIMITS.decision}
            placeholder="The question this node asks."
            value={node.decision}
            onChangeText={(decision) => onChange(updateNode(adventure, node.id, { decision }))}
          />
        </Field>
      </View>

      <Separator />

      <View className="flex-row items-center justify-between gap-md">
        <PanelHeading>Options</PanelHeading>
        {/* A count, not a caption with an opinion: metadata size in the metadata
            ink, so it sits beside the heading rather than under it. */}
        <FieldCounter value={node.options.length} max={ADVENTURE_LIMITS.maxOptions} />
      </View>

      {node.options.length === 0 ? (
        <Text variant="muted">
          A node with no options is where a walk stops short. Give it at least one.
        </Text>
      ) : null}

      {node.options.map((option, index) => {
        const target = targets.find((candidate) => candidate.id === option.nextNodeId);
        /* A target the graph has lost still has to show as itself, or the select
           would silently report a dangling option as an ending. */
        const orphaned = option.nextNodeId !== null && target === undefined;
        const value: SelectOption =
          option.nextNodeId === null
            ? { value: ENDS_VALUE, label: ENDS_LABEL }
            : {
                value: option.nextNodeId,
                label: target ? targetLabel(target) : goneLabel(option.nextNodeId),
              };

        return (
          <View key={option.id} className="gap-sm border-t-hairline border-border pt-md">
            {/* What the option says and where it goes are the same fact, so they
                share a row. Both wear a label, so the two inputs sit on one
                baseline; the option's number is its label, the same number its
                row and its handle carry on the card. A bare numeral beside an
                unlabelled input hung that input a label's height above the
                select it was paired with. */}
            <View className="flex-row items-end gap-sm">
              <Field label={`Option ${index + 1}`} className="flex-1">
                <Input
                  maxLength={ADVENTURE_LIMITS.optionLabel}
                  accessibilityLabel={`Label for option ${index + 1}`}
                  value={option.label}
                  onChangeText={(label) =>
                    onChange(updateOption(adventure, node.id, option.id, { label }))
                  }
                />
              </Field>
              {/* Fixed rather than fluid: the destination of a branch is a name,
                  not prose, and a select that grew with the page would make the
                  label field — the part that is written — the smaller of the two. */}
              <Field label="Leads to" className="w-inspector">
                <Select
                  value={value}
                  onValueChange={(next) => {
                    if (!next) return;
                    onChange(
                      setOptionTarget(
                        adventure,
                        node.id,
                        option.id,
                        next.value === ENDS_VALUE ? null : next.value,
                      ),
                    );
                  }}
                >
                  <SelectTrigger accessibilityLabel={`Target for option ${index + 1}`}>
                    <SelectValue placeholder={ENDS_LABEL} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ENDS_VALUE} label={ENDS_LABEL} />
                    {targets.map((candidate) => (
                      <SelectItem
                        key={candidate.id}
                        value={candidate.id}
                        label={targetLabel(candidate)}
                      />
                    ))}
                    {orphaned && option.nextNodeId !== null ? (
                      <SelectItem
                        value={option.nextNodeId}
                        label={goneLabel(option.nextNodeId)}
                      />
                    ) : null}
                  </SelectContent>
                </Select>
              </Field>
              <View className="h-control-md justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  accessibilityLabel={`Remove option ${index + 1}`}
                  onPress={() => onChange(removeOption(adventure, node.id, option.id))}
                >
                  <Text className="font-mono">×</Text>
                </Button>
              </View>
            </View>

            {/* Named like the card's own fields: a second box under the label with
                no word over it read as a footnote, not as the outcome. */}
            <Field label="Outcome">
              <Textarea
                rows={ROWS.outcome}
                maxLength={ADVENTURE_LIMITS.outcome}
                placeholder="What happens, injected into the next step"
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
            </Field>
          </View>
        );
      })}

      {/* A row, so the button is as wide as its word. Left to the column it
          stretched across the page and carried the weight of a primary action;
          adding a fourth option is a small thing done under the third. */}
      <View className="flex-row">
        <Button
          variant="outline"
          size="sm"
          disabled={full}
          onPress={() => onChange(addOption(adventure, node.id))}
        >
          <Text>{full ? "Five options is the limit" : "Add option"}</Text>
        </Button>
      </View>
    </View>
  );
}
