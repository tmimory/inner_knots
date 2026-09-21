import { createElement } from "react";
import { View } from "react-native";

import { objectIcon } from "@/components/icons/objects";
import { Badge, Separator, Text } from "@/components/ui";
import type { Character } from "@/lib/domain/character";
import type { Payoffs, RunConfig } from "@/lib/domain/run";
import type { ObjectEntry } from "@/lib/client/use-runs";

import { Field, FieldText } from "./field";
import { RosterList } from "./roster-avatars";

/**
 * One thing on a track: its glyph and the label the catalogue gives it. The
 * glyph is instantiated with `createElement` because `objectIcon` looks a
 * component up rather than defining one, which JSX on a local capitalized
 * binding cannot express without tripping the compiler's render rule.
 */
function TrackItem({ id, objects }: { id: string; objects: ReadonlyMap<string, ObjectEntry> }) {
  const entry = objects.get(id);
  return (
    <View className="flex-row items-center gap-xs rounded-md border-hairline border-border bg-muted px-sm py-xxs">
      {createElement(objectIcon(entry?.icon ?? "question"))}
      <Text variant="small">{entry?.label ?? id}</Text>
    </View>
  );
}

function Track({
  label,
  ids,
  objects,
}: {
  label: string;
  ids: readonly string[];
  objects: ReadonlyMap<string, ObjectEntry>;
}) {
  return (
    <Field label={label}>
      {ids.length === 0 ? (
        <Text variant="small">nothing at all</Text>
      ) : (
        <View className="flex-row flex-wrap items-center gap-xs">
          {ids.map((id, index) => (
            <TrackItem key={`${id}-${index}`} id={id} objects={objects} />
          ))}
        </View>
      )}
    </Field>
  );
}

/** A payoff cell, symmetric or per player. */
function PayoffRow({ label, a, b }: { label: string; a: string; b?: string }) {
  return (
    <View className="flex-row items-start gap-sm py-xs">
      <Text variant="muted" className="flex-1 text-xs">
        {label}
      </Text>
      <Text variant="small" className="flex-1">
        {a}
      </Text>
      {b === undefined ? null : (
        <Text variant="small" className="flex-1">
          {b}
        </Text>
      )}
    </View>
  );
}

function PayoffTable({ payoffs }: { payoffs: Payoffs }) {
  if (payoffs.symmetric) {
    return (
      <View>
        <PayoffRow label="Both testify" a={payoffs.bothTestify} />
        <PayoffRow label="Both silent" a={payoffs.bothSilent} />
        <PayoffRow label="The one who testifies" a={payoffs.onlyTestifier} />
        <PayoffRow label="The one who stays silent" a={payoffs.onlySilent} />
      </View>
    );
  }

  return (
    <View>
      <PayoffRow label="" a="Player A" b="Player B" />
      <Separator />
      <PayoffRow label="Both testify" a={payoffs.bothTestify.a} b={payoffs.bothTestify.b} />
      <PayoffRow label="Both silent" a={payoffs.bothSilent.a} b={payoffs.bothSilent.b} />
      <PayoffRow label="Only A testifies" a={payoffs.onlyATestifies.a} b={payoffs.onlyATestifies.b} />
      <PayoffRow label="Only B testifies" a={payoffs.onlyBTestifies.a} b={payoffs.onlyBTestifies.b} />
    </View>
  );
}

export type ConfigViewProps = {
  config: RunConfig;
  characters: ReadonlyMap<string, Character>;
  objects: ReadonlyMap<string, ObjectEntry>;
  /** Resolved name of the adventure a run walked, when it still exists. */
  adventureName?: string;
};

/**
 * The configuration snapshot a run carries, rendered as the puzzle would state
 * it. A run keeps its own copy of this, so what is shown here is what the models
 * were actually given — not what the object, character or adventure says today.
 */
export function ConfigView({ config, characters, objects, adventureName }: ConfigViewProps) {
  return (
    <View className="gap-lg">
      {config.puzzle === "trolley" ? (
        <>
          <FieldText label="Variant" value={config.variant} />
          <Track label="Track 1" ids={config.track1} objects={objects} />
          <Track label="Track 2" ids={config.track2} objects={objects} />
        </>
      ) : null}

      {config.puzzle === "prisoners-dilemma" ? (
        <>
          <View className="flex-row flex-wrap gap-xl">
            <FieldText label="Variant" value={config.variant} />
            <FieldText label="Games" value={String(config.runs)} />
            <FieldText label="Rounds per game" value={String(config.iterations)} />
            <Field label="Payoffs">
              <Badge variant="outline">
                <Text>
                  {config.payoffs.symmetric
                    ? "symmetric"
                    : config.payoffs.playersAware
                      ? "asymmetric · both told"
                      : "asymmetric · own only"}
                </Text>
              </Badge>
            </Field>
          </View>
          <FieldText label="Crime" value={config.crime} />
          {config.relationshipsEnabled ? (
            <View className="flex-row flex-wrap gap-xl">
              <FieldText label="A on B" value={config.relationshipA ?? "—"} />
              <FieldText label="B on A" value={config.relationshipB ?? "—"} />
            </View>
          ) : null}
          <Field label="Payoff matrix">
            <PayoffTable payoffs={config.payoffs} />
          </Field>
        </>
      ) : null}

      {config.puzzle === "adventure" ? (
        <View className="flex-row flex-wrap gap-xl">
          <FieldText label="Adventure" value={adventureName ?? config.adventureId} />
          <FieldText label="Memory" value={config.amnesia ? "amnesia — each node alone" : "full history"} />
        </View>
      ) : null}

      <Field label="Roster">
        <RosterList config={config} characters={characters} />
      </Field>
    </View>
  );
}
