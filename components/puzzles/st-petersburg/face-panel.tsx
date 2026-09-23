import { Pressable, View } from "react-native";

import { Subsection } from "@/components/puzzles/subsection";
import { Checkbox, Label, Textarea } from "@/components/ui";
import { RUN_LIMITS, type CoinFace, type CoinFaceRule } from "@/lib/domain/run";
import { DEFAULT_FACES } from "@/lib/puzzles/st-petersburg/ui-helpers";

/** The two faces as the screen names them. The prompts say "heads" and "tails". */
const FACE_LABELS: Record<CoinFace, string> = { heads: "Heads", tails: "Tails" };

/** What the checkbox under each payoff turns on, said the same way on both. */
const ENDS_GAME = "Ends the game";

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
 * defaults, not the layout, and either face can be made the one that stops.
 *
 * A checkbox rather than a switch: the two of them read as a pair of conditions
 * on the coin — either, neither or both may end the game — where two switches
 * side by side read as two settings being turned on and off. The whole row is one
 * hit target, with the box itself taken out of the pointer's way so a press on it
 * does not toggle twice, and out of the accessibility tree so the row is
 * announced once.
 */
export function FacePanel({ face, value, onChange, className }: FacePanelProps) {
  const endsGame = value.endsGame;

  return (
    <Subsection title={FACE_LABELS[face]} className={className}>
      <Textarea
        rows={2}
        maxLength={RUN_LIMITS.facePayoff}
        showCount
        value={value.payoff}
        onChangeText={(payoff) => onChange({ ...value, payoff })}
        placeholder={DEFAULT_FACES[face].payoff}
        accessibilityLabel={`What ${face} pays`}
      />

      <Pressable
        role="checkbox"
        accessibilityState={{ checked: endsGame }}
        accessibilityLabel={`${FACE_LABELS[face]}: ${ENDS_GAME}`}
        onPress={() => onChange({ ...value, endsGame: !endsGame })}
        className="flex-row items-center gap-md self-start"
      >
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Checkbox
            checked={endsGame}
            onCheckedChange={(next) => onChange({ ...value, endsGame: next })}
          />
        </View>
        {/* Regular weight: this is a caption on a field, not a second subhead. */}
        <Label className="font-body">{ENDS_GAME}</Label>
      </Pressable>
    </Subsection>
  );
}
