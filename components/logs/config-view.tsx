import { View } from "react-native";

import { ObjectGlyph } from "@/components/icons/objects";
import { Separator, Text } from "@/components/ui";
import type { CoinFaceRule, Payoffs, RunConfig } from "@/lib/domain/run";
import type { ObjectEntry } from "@/lib/client/use-runs";

import { Field, FieldText } from "./field";

/**
 * One thing on a track: its glyph and the label the catalogue gives it.
 *
 * No fill and no border. What is on a track is a fact about a run that has
 * already happened, and a bordered, tinted box beside a real button is a control
 * that does nothing when you press it — the reader finds that out by pressing it.
 * So the track reads as what it is: a list, in the page's own ink, with the
 * glyphs that name its members.
 *
 * Every glyph keeps the same square, whatever it draws: a cow fills its box and a
 * framed painting does not, so unboxed they set the row at three different
 * heights and the widest-stroked one read as picked out.
 */
function TrackItem({ id, objects }: { id: string; objects: ReadonlyMap<string, ObjectEntry> }) {
  const entry = objects.get(id);
  return (
    <View className="flex-row items-center gap-xs">
      <View className="h-icon-md w-icon-md items-center justify-center">
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
        <View className="flex-row flex-wrap items-center gap-sm">
          {ids.map((id, index) => (
            <View key={`${id}-${index}`} className="flex-row items-center gap-sm">
              {index === 0 ? null : <Text variant="muted">·</Text>}
              <TrackItem id={id} objects={objects} />
            </View>
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

/**
 * One face of the coin: what the voice said it pays, and whether landing that
 * way stops the game. The second line is the rule, not the payoff, so it is set
 * as the quieter of the two — a reader scanning the two faces is looking for the
 * one that ends things.
 */
function Face({ label, rule }: { label: string; rule: CoinFaceRule }) {
  return (
    <Field label={label}>
      <Text variant="small">{rule.payoff}</Text>
      <Text variant="muted">{rule.endsGame ? "ends the game" : "play on"}</Text>
    </Field>
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
      {/* The framing is said once, in the run's own metadata row above this
          block, so it is not said again here. */}
      {config.puzzle === "trolley" ? (
        <>
          <Track label="Track 1" ids={config.track1} objects={objects} />
          <Track label="Track 2" ids={config.track2} objects={objects} />
        </>
      ) : null}

      {config.puzzle === "prisoners-dilemma" ? (
        <>
          <View className="flex-row flex-wrap gap-xl">
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

      {config.puzzle === "st-petersburg" ? (
        <View className="flex-row flex-wrap gap-xl">
          <FieldText label="Flips at most" value={String(config.maxFlips)} />
          <Face label="Heads" rule={config.faces.heads} />
          <Face label="Tails" rule={config.faces.tails} />
        </View>
      ) : null}
    </View>
  );
}
