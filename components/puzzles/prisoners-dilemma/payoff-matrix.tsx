import type { ReactNode } from "react";
import { View } from "react-native";

import { Input, Label, Switch, Text } from "@/components/ui";
import { RUN_LIMITS } from "@/lib/domain/run";
import {
  type AsymmetricPayoffField,
  type AsymmetricPayoffValues,
  type PrisonersDilemmaSetup,
  type SymmetricPayoffField,
  type SymmetricPayoffValues,
} from "@/lib/puzzles/prisoners-dilemma/ui-helpers";
import { cn } from "@/lib/utils";

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

/** What each symmetric cell is asking for, in the order the matrix reads. */
const SYMMETRIC_CELLS: readonly { field: SymmetricPayoffField; label: string; hint: string }[] = [
  { field: "bothTestify", label: "Both testify", hint: "what they each get" },
  { field: "onlyTestifier", label: "Only the testifier", hint: "what the one who testifies gets" },
  { field: "onlySilent", label: "Only the silent one", hint: "what the one who stays silent gets" },
  { field: "bothSilent", label: "Both stay silent", hint: "what they each get" },
];

/** The same four cells, asymmetric: each holds one outcome per player. */
const ASYMMETRIC_CELLS: readonly { field: AsymmetricPayoffField; label: (n: { a: string; b: string }) => string }[] = [
  { field: "bothTestify", label: () => "Both testify" },
  { field: "onlyATestifies", label: (n) => `Only ${n.a} testifies` },
  { field: "onlyBTestifies", label: (n) => `Only ${n.b} testifies` },
  { field: "bothSilent", label: () => "Both stay silent" },
];

function Cell({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View className="flex-1 gap-xs rounded-md border-hairline border-border bg-muted p-sm">
      <Text variant="small" className="font-display" numberOfLines={2}>
        {label}
      </Text>
      {children}
      {hint ? (
        <Text variant="muted" className="text-xs" numberOfLines={2}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

function ColumnHeader({ label }: { label: string }) {
  return (
    <View className="flex-1">
      <Text variant="muted" className="font-display text-xs" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function RowHeader({ label }: { label: string }) {
  return (
    <View className="w-avatar-xl justify-center">
      <Text variant="muted" className="font-display text-xs">
        {label}
      </Text>
    </View>
  );
}

/** One switch and the sentence that explains what it does to the bargain. */
function Toggle({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <View className="flex-row items-start gap-md">
      <View className="flex-1 gap-xs">
        <Label>{label}</Label>
        <Text variant="muted">{description}</Text>
      </View>
      <Switch checked={checked} onCheckedChange={onCheckedChange} accessibilityLabel={label} />
    </View>
  );
}

/**
 * The bargain, as a two-by-two matrix.
 *
 * Rows are Player A's move and columns are Player B's, which is the arrangement
 * the fragments are written against: a symmetric cell holds what the player on
 * that row gets, and an asymmetric cell holds one outcome each. The payoffs are
 * free text rather than numbers because "walks free" and "ten years" are not the
 * same kind of quantity, and the interesting variations are rarely arithmetic.
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
    ? SYMMETRIC_CELLS.map((cell) => (
        <Cell key={cell.field} label={cell.label} hint={cell.hint}>
          <Input
            value={symmetricPayoffs[cell.field]}
            onChangeText={(text) => setSymmetric(cell.field, text)}
            maxLength={RUN_LIMITS.payoff}
            accessibilityLabel={`${cell.label}: ${cell.hint}`}
          />
        </Cell>
      ))
    : ASYMMETRIC_CELLS.map((cell) => (
        <Cell key={cell.field} label={cell.label(names)}>
          {(["a", "b"] as const).map((side) => (
            <View key={side} className="gap-xxs">
              <Text variant="muted" className="text-xs" numberOfLines={1}>
                {names[side]}
              </Text>
              <Input
                value={asymmetricPayoffs[cell.field][side]}
                onChangeText={(text) => setAsymmetric(cell.field, side, text)}
                maxLength={RUN_LIMITS.payoff}
                accessibilityLabel={`${cell.label(names)}: ${names[side]}`}
              />
            </View>
          ))}
        </Cell>
      ));

  return (
    <View className={cn("gap-md", className)}>
      <Toggle
        label="The same bargain for both"
        description={
          symmetric
            ? "One matrix, four outcomes, and both of them know the terms."
            : "Each side gets its own consequences — the classic dilemma, off balance."
        }
        checked={symmetric}
        onCheckedChange={(next) => onChange({ symmetric: next })}
      />

      <View className="gap-sm">
        <View className="flex-row items-end gap-sm">
          <View className="w-avatar-xl">
            <Text variant="muted" className="font-mono text-xs">
              A ↓ B →
            </Text>
          </View>
          <ColumnHeader label="Testify" />
          <ColumnHeader label="Stay silent" />
        </View>

        <View className="flex-row items-stretch gap-sm">
          <RowHeader label="Testify" />
          {cells[0]}
          {cells[1]}
        </View>
        <View className="flex-row items-stretch gap-sm">
          <RowHeader label="Stay silent" />
          {cells[2]}
          {cells[3]}
        </View>
      </View>

      <Text variant="muted">
        {symmetric
          ? "Each cell is what the player on that row walks away with."
          : "Each cell holds both sides of the same outcome."}
      </Text>

      {symmetric ? null : (
        <Toggle
          label="Players know the payoffs are asymmetric"
          description="On, each is shown both columns. Off, each sees only their own, and has no reason to assume it matches."
          checked={playersAware}
          onCheckedChange={(next) => onChange({ playersAware: next })}
        />
      )}
    </View>
  );
}
