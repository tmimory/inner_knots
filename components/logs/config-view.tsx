import { View } from "react-native";

import { ObjectGlyph } from "@/components/icons/objects";
import { Separator, Text } from "@/components/ui";
import type { Payoffs, RunConfig } from "@/lib/domain/run";
import type { ObjectEntry } from "@/lib/client/use-runs";

import { Field, FieldText } from "./field";

/** One thing on a track: its glyph and the label the catalogue gives it. */
function TrackItem({ id, objects }: { id: string; objects: ReadonlyMap<string, ObjectEntry> }) {
  const entry = objects.get(id);
  return (
    <View className="flex-row items-center gap-xs rounded-md border-hairline border-border bg-muted px-sm py-xxs">
      {/* Every glyph in the same square, whatever it draws: a cow fills its box
          and a framed painting does not, so unboxed they set the chips at three
          different heights and the widest-stroked one read as selected. */}
      <View className="h-xl w-xl items-center justify-center">
        <ObjectGlyph icon={entry?.icon ?? "question"} />
      </View>
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
  objects: ReadonlyMap<string, ObjectEntry>;
  /** Resolved name of the adventure a run walked, when it still exists. */
  adventureName?: string;
};

/**
 * The configuration snapshot a run carries, rendered as the puzzle would state
 * it. A run keeps its own copy of this, so what is shown here is what the models
 * were actually given — not what the object, character or adventure says today.
 */
export function ConfigView({ config, objects, adventureName }: ConfigViewProps) {
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
            <FieldText
              label="Payoffs"
              value={
                config.payoffs.symmetric
                  ? "symmetric"
                  : config.payoffs.playersAware
                    ? "asymmetric · both told"
                    : "asymmetric · own only"
              }
            />
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
    </View>
  );
}
