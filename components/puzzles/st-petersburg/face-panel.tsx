import { useState } from "react";
import { View } from "react-native";

import { Subsection } from "@/components/puzzles/subsection";
import { Input, Segmented, Text, Textarea, type SegmentedOption } from "@/components/ui";
import { useTypedNumber } from "@/lib/client/use-typed-number";
import {
  RUN_LIMITS,
  type CoinFace,
  type CoinFaceRule,
  type CoinPayoff,
  type CoinPayoffKind,
} from "@/lib/domain/run";
import { DEFAULT_AMOUNT, clampAmount, payoffText } from "@/lib/puzzles/st-petersburg/ui-helpers";

import { CheckRow } from "./check-row";

/** The two faces as the screen names them. The prompts say "heads" and "tails". */
const FACE_LABELS: Record<CoinFace, string> = { heads: "Heads", tails: "Tails" };

/** What the checkbox under each payoff turns on, said the same way on both. */
const ENDS_GAME = "Ends the game";

/** What the doubling checkbox turns on: the escalation the paradox is named for. */
const DOUBLES = "Double each flip";

/** The three ways a face can be worth something, in the order they are offered. */
const KINDS: readonly SegmentedOption<CoinPayoffKind>[] = [
  { value: "text", label: "In words" },
  { value: "amount", label: "An amount" },
  { value: "forfeit", label: "Forfeit" },
];

/**
 * What the prose field suggests when it is empty: the payoff each face carried
 * before money existed, so the field shows the shape of a sentence that works.
 */
const PROSE_PLACEHOLDER: Record<CoinFace, string> = {
  heads: "the pot doubles, starting from $2",
  tails: "you lose everything in the pot",
};

export type FacePanelProps = {
  face: CoinFace;
  /** What this face pays, and whether landing on it stops the game. */
  value: CoinFaceRule;
  onChange: (value: CoinFaceRule) => void;
  className?: string;
};

/**
 * One face of the coin: what the voice promises for it, and whether it is the end.
 *
 * The two panels are the same object twice, so they are one component rather than
 * a heads block and a tails block that drift apart — the classic paradox is the
 * defaults, not the layout, and either face can be made the one that stops, or
 * the one that pays.
 *
 * Switching what a face is worth keeps what was last said in that kind: the prose
 * comes back as it was typed, a stake comes back with its doubling, and a face
 * that never carried one starts at the paradox's own $2, undoubled. The memory is
 * this component's, so it lasts as long as the screen and no longer — the setup
 * itself only ever holds the one payoff that is in force.
 */
export function FacePanel({ face, value, onChange, className }: FacePanelProps) {
  const payoff = value.payoff;

  /** What the other kinds were, for when the choice comes back to them. */
  const [lastText, setLastText] = useState(() => payoffText(payoff));
  const [lastAmount, setLastAmount] = useState<{ amount: number; doubles: boolean }>(() =>
    payoff.kind === "amount"
      ? { amount: payoff.amount, doubles: payoff.doubles }
      : { amount: DEFAULT_AMOUNT, doubles: false },
  );

  function setPayoff(next: CoinPayoff) {
    onChange({ ...value, payoff: next });
  }

  function changeAmount(next: { amount: number; doubles: boolean }) {
    setLastAmount(next);
    setPayoff({ kind: "amount", ...next });
  }

  const amount = payoff.kind === "amount" ? payoff.amount : lastAmount.amount;
  const doubles = payoff.kind === "amount" ? payoff.doubles : lastAmount.doubles;
  // The stake keeps what was typed while it is being typed, as the count
  // stepper does, so "2." on the way to "2.50" is not redrawn as "2".
  const stake = useTypedNumber({
    value: amount,
    onChange: (committed) => changeAmount({ amount: committed, doubles }),
    parse: Number.parseFloat,
    clamp: clampAmount,
  });

  function changeKind(kind: CoinPayoffKind) {
    if (kind === payoff.kind) return;
    stake.reset();
    if (kind === "text") {
      setPayoff({ kind: "text", text: lastText });
      return;
    }
    if (kind === "forfeit") {
      setPayoff({ kind: "forfeit" });
      return;
    }
    setPayoff({ kind: "amount", ...lastAmount });
  }

  function changeText(text: string) {
    setLastText(text);
    setPayoff({ kind: "text", text });
  }


  return (
    <Subsection title={FACE_LABELS[face]} className={className}>
      <Segmented
        value={payoff.kind}
        onChange={changeKind}
        options={KINDS}
        label={`What ${face} pays`}
      />

      {payoff.kind === "text" ? (
        <Textarea
          rows={2}
          maxLength={RUN_LIMITS.facePayoff}
          showCount
          value={payoff.text}
          onChangeText={changeText}
          placeholder={PROSE_PLACEHOLDER[face]}
          accessibilityLabel={`What ${face} pays`}
        />
      ) : null}

      {payoff.kind === "amount" ? (
        <View className="gap-lg">
          {/* The currency mark belongs to the field, not to a label above it:
              read together they are one number with a unit on it. */}
          <View className="flex-row items-center gap-sm">
            <Text variant="data" className="text-muted-foreground">
              $
            </Text>
            <Input
              className="h-control-md w-seat px-md tabular"
              keyboardType="decimal-pad"
              accessibilityLabel={`Amount ${face} pays`}
              value={stake.text}
              onChangeText={stake.onChangeText}
              onBlur={stake.onBlur}
            />
          </View>

          <CheckRow
            label={DOUBLES}
            accessibilityLabel={`${FACE_LABELS[face]}: ${DOUBLES}`}
            checked={payoff.doubles}
            onChange={(doubles) => changeAmount({ amount, doubles })}
          />
        </View>
      ) : null}

      {payoff.kind === "forfeit" ? (
        <Text variant="muted">Everything won so far is taken back.</Text>
      ) : null}

      <CheckRow
        label={ENDS_GAME}
        accessibilityLabel={`${FACE_LABELS[face]}: ${ENDS_GAME}`}
        checked={value.endsGame}
        onChange={(endsGame) => onChange({ ...value, endsGame })}
      />
    </Subsection>
  );
}
