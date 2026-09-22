import type { ReactNode } from "react";
import { View } from "react-native";

import { Input, Text } from "@/components/ui";
import type { Character } from "@/lib/domain/character";
import { RUN_LIMITS } from "@/lib/domain/run";
import {
  PAYOFF_CELLS,
  scenarioLabel,
  symmetricFieldFor,
  type AsymmetricPayoffField,
  type AsymmetricPayoffValues,
  type PayoffCell,
  type PrisonersDilemmaSetup,
  type SymmetricPayoffField,
  type SymmetricPayoffValues,
} from "@/lib/puzzles/prisoners-dilemma/ui-helpers";
import { cn } from "@/lib/utils";

import { LabeledToggle } from "./labeled-toggle";
import { OutcomeGrid } from "./outcome-grid";
import { PlayerFace } from "./player-face";

/** The slice of the setup this control owns. */
export type PayoffMatrixValue = Pick<
  PrisonersDilemmaSetup,
  "symmetric" | "playersAware" | "symmetricPayoffs" | "asymmetricPayoffs"
>;

export type PayoffMatrixProps = {
  value: PayoffMatrixValue;
  onChange: (changes: Partial<PayoffMatrixValue>) => void;
  /** What to call the two players, seated or not. */
  names: { a: string; b: string };
  /** The seated characters, for the face beside each outcome. Either may be empty. */
  players?: { a?: Character; b?: Character };
  className?: string;
};

/**
 * Who this line of a cell is about: the face if there is one, the name either way.
 *
 * Fixed width, so the two outcomes of a square line up under each other and the
 * eight of the matrix line up down the page. When the square is too narrow to
 * hold a name and a field side by side, the field wraps underneath instead of
 * being squeezed to nothing.
 */
function PlayerTag({ name, character }: { name: string; character?: Character }) {
  return (
    <View className="w-avatar-xl flex-row items-center gap-xs">
      <PlayerFace character={character} size="xs" frame={false} />
      <Text variant="meta" numberOfLines={1} className="shrink">
        {name}
      </Text>
    </View>
  );
}

/** One outcome: who gets it, and the field or the derived value that says what. */
function PayoffLine({
  name,
  character,
  children,
}: {
  name: string;
  character?: Character;
  children: ReactNode;
}) {
  return (
    <View className="flex-row flex-wrap items-center gap-sm">
      <PlayerTag name={name} character={character} />
      {/*
        Capped at a seat's width: "10 years" in a field three hundred pixels wide
        is a field with a band of nothing in it, and eight of them made the matrix
        look emptier the more it held.
      */}
      <View className="min-w-field max-w-seat flex-1">{children}</View>
    </View>
  );
}

/**
 * A mirrored outcome: the same quantity, read off the field the other player's
 * line edits.
 *
 * Quiet and italic, at the height a field would have stood at, so the pair reads
 * as "this one is set, that one follows" rather than as a field that has stopped
 * working.
 */
function DerivedPayoff({ value, label }: { value: string; label: string }) {
  return (
    // `px-md` is the field's own inner padding: the mirrored value lines up with
    // the text of the field it mirrors rather than with the box around it.
    <View className="min-h-control-md justify-center px-md">
      <Text
        numberOfLines={1}
        accessibilityLabel={`${label}: ${value}, mirrored`}
        className="font-bodyItalic text-base text-muted-foreground"
      >
        {value}
      </Text>
    </View>
  );
}

/** One square: what happened in it, then what each of them walks away with. */
function PayoffCellCard({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <View className="gap-sm rounded-md border-hairline border-border bg-card p-md">
      <Text variant="meta" numberOfLines={1}>
        {caption}
      </Text>
      {children}
    </View>
  );
}

/**
 * The bargain, as a two-by-two matrix.
 *
 * Rows are Player A's move and columns are Player B's, which is the arrangement
 * the fragments are written against. Every square says what happened in it and
 * what each player gets for it, because a single field in a square left the
 * reader to work out whose outcome it was and to find the other one in the
 * square opposite. The payoffs are free text rather than numbers because "walks
 * free" and "ten years" are not the same kind of quantity, and the interesting
 * variations are rarely arithmetic.
 *
 * Symmetric, the same four quantities are read eight times: the first player's
 * line is the field, the second's is the same value mirrored and read-only, so
 * each quantity is typed once and still appears wherever it is collected.
 * Asymmetric, every line is its own field.
 */
export function PayoffMatrix({ value, onChange, names, players, className }: PayoffMatrixProps) {
  const { symmetric, playersAware, symmetricPayoffs, asymmetricPayoffs } = value;

  function setSymmetric(field: SymmetricPayoffField, text: string) {
    onChange({ symmetricPayoffs: { ...symmetricPayoffs, [field]: text } as SymmetricPayoffValues });
  }

  function setAsymmetric(field: AsymmetricPayoffField, side: "a" | "b", text: string) {
    onChange({
      asymmetricPayoffs: {
        ...asymmetricPayoffs,
        [field]: { ...asymmetricPayoffs[field], [side]: text },
      } as AsymmetricPayoffValues,
    });
  }

  /** One player's outcome in one square: a field, or the mirror of one. */
  function line(cell: PayoffCell, side: "a" | "b", scenario: string) {
    const name = names[side];
    const label = `${scenario}: what ${name} gets`;

    if (!symmetric) {
      return (
        <Input
          value={asymmetricPayoffs[cell.field][side]}
          onChangeText={(text) => setAsymmetric(cell.field, side, text)}
          maxLength={RUN_LIMITS.payoff}
          accessibilityLabel={label}
        />
      );
    }

    const mine = side === "a" ? cell.a : cell.b;
    const theirs = side === "a" ? cell.b : cell.a;
    const field = symmetricFieldFor(mine, theirs);

    // The first player's column carries the four fields — one per square, and
    // between them exactly the four quantities a symmetric matrix stores.
    if (side === "a") {
      return (
        <Input
          value={symmetricPayoffs[field]}
          onChangeText={(text) => setSymmetric(field, text)}
          maxLength={RUN_LIMITS.payoff}
          accessibilityLabel={label}
        />
      );
    }
    return <DerivedPayoff value={symmetricPayoffs[field]} label={label} />;
  }

  const cells = PAYOFF_CELLS.map((cell) => {
    const scenario = scenarioLabel(cell, names);
    return (
      <PayoffCellCard key={cell.field} caption={scenario}>
        {(["a", "b"] as const).map((side) => (
          <PayoffLine key={side} name={names[side]} character={players?.[side]}>
            {line(cell, side, scenario)}
          </PayoffLine>
        ))}
      </PayoffCellCard>
    );
  });

  return (
    <View className={cn("gap-xl", className)}>
      <LabeledToggle
        label="The same bargain for both"
        checked={symmetric}
        onCheckedChange={(next) => onChange({ symmetric: next })}
      />

      <OutcomeGrid
        rowPlayer={names.a}
        columnPlayer={names.b}
        cells={cells}
        footnote={
          symmetric ? (
            <Text variant="muted">
              {`The bargain is the same for both: set what ${names.a} gets and ${names.b}'s outcome mirrors it.`}
            </Text>
          ) : undefined
        }
      />

      {symmetric ? null : (
        <LabeledToggle
          label="Players know the payoffs are asymmetric"
          description="Off, each sees only their own column, and has no reason to assume it matches."
          checked={playersAware}
          onCheckedChange={(next) => onChange({ playersAware: next })}
        />
      )}
    </View>
  );
}
