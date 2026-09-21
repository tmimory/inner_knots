import { View } from "react-native";

import { Input, Text } from "@/components/ui";
import { RUN_LIMITS } from "@/lib/domain/run";
import {
  type AsymmetricPayoffField,
  type AsymmetricPayoffValues,
  type PrisonersDilemmaSetup,
  type SymmetricPayoffField,
  type SymmetricPayoffValues,
} from "@/lib/puzzles/prisoners-dilemma/ui-helpers";
import { cn } from "@/lib/utils";

import { LabeledToggle } from "./labeled-toggle";
import { MOVES, OutcomeGrid } from "./outcome-grid";

/** The slice of the setup this control owns. */
export type PayoffMatrixValue = Pick<
  PrisonersDilemmaSetup,
  "symmetric" | "playersAware" | "symmetricPayoffs" | "asymmetricPayoffs"
>;

export type PayoffMatrixProps = {
  value: PayoffMatrixValue;
  onChange: (changes: Partial<PayoffMatrixValue>) => void;
  /** What to call the two players in the asymmetric cells. */
  names: { a: string; b: string };
  className?: string;
};

/**
 * The symmetric cells, in reading order: A's move down, B's move across. Each
 * holds what the player on that row walks away with.
 */
const SYMMETRIC_CELLS: readonly SymmetricPayoffField[] = [
  "bothTestify",
  "onlyTestifier",
  "onlySilent",
  "bothSilent",
];

/** The same four cells, asymmetric: each holds one outcome per player. */
const ASYMMETRIC_CELLS: readonly AsymmetricPayoffField[] = [
  "bothTestify",
  "onlyATestifies",
  "onlyBTestifies",
  "bothSilent",
];

/** How each cell reads to a screen reader: the pair of moves that reaches it. */
function cellName(index: number): string {
  return `${MOVES[Math.floor(index / 2)]} and ${MOVES[index % 2]?.toLowerCase()}`;
}

/**
 * The bargain, as a two-by-two matrix.
 *
 * Rows are Player A's move and columns are Player B's, which is the arrangement
 * the fragments are written against. The cells are bare inputs under one set of
 * headers rather than four labelled cards: a matrix that is already a grid does
 * not need every square to announce which square it is. The payoffs are free text
 * rather than numbers because "walks free" and "ten years" are not the same kind
 * of quantity, and the interesting variations are rarely arithmetic.
 */
export function PayoffMatrix({ value, onChange, names, className }: PayoffMatrixProps) {
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

  const cells = symmetric
    ? SYMMETRIC_CELLS.map((field, index) => (
        <View key={field}>
          <Input
            value={symmetricPayoffs[field]}
            onChangeText={(text) => setSymmetric(field, text)}
            maxLength={RUN_LIMITS.payoff}
            accessibilityLabel={cellName(index)}
          />
        </View>
      ))
    : ASYMMETRIC_CELLS.map((field, index) => (
        <View key={field} className="gap-xs">
          {(["a", "b"] as const).map((side) => (
            <View key={side} className="gap-xxs">
              <Text variant="muted" numberOfLines={1}>
                {names[side]}
              </Text>
              <Input
                value={asymmetricPayoffs[field][side]}
                onChangeText={(text) => setAsymmetric(field, side, text)}
                maxLength={RUN_LIMITS.payoff}
                accessibilityLabel={`${cellName(index)}: ${names[side]}`}
              />
            </View>
          ))}
        </View>
      ));

  return (
    <View className={cn("gap-lg", className)}>
      <LabeledToggle
        label="The same bargain for both"
        checked={symmetric}
        onCheckedChange={(next) => onChange({ symmetric: next })}
      />

      <OutcomeGrid
        rowPlayer="Player A"
        columnPlayer="Player B"
        cells={cells}
        footnote={
          <Text variant="muted">
            {symmetric
              ? "Each cell is what the player on that row walks away with."
              : "Each cell holds both sides of the same outcome."}
          </Text>
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
