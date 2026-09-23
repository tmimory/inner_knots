/**
 * A number field that keeps what was typed.
 *
 * A field bound straight to a number cannot be typed into: "2." on the way to
 * "2.50" parses to 2 and is redrawn as "2" before the next keystroke, and "1"
 * on the way to "12" is clamped to the minimum and redrawn. So the text is kept
 * as typed, tagged with the number it committed, and shown for as long as the
 * value is still that number — a value changed from outside (a stepper button,
 * a reset) still wins, and leaving the field settles it to its committed form.
 *
 * The parser and the clamp are the caller's, so a whole-number count and a
 * money amount with cents strike the same bargain through one hook.
 */
import { useState } from "react";

export type TypedNumberOptions = {
  /** The committed value the field is bound to. */
  value: number;
  /** Commits a new value; called only when the parsed, clamped number changes. */
  onChange: (value: number) => void;
  /** Reads a number out of the typed text; `NaN` for anything unreadable. */
  parse: (text: string) => number;
  /** Brings a readable number into range before it is committed. */
  clamp: (value: number) => number;
};

export type TypedNumberField = {
  /** What to draw in the field. */
  text: string;
  onChangeText: (text: string) => void;
  /** Settles the field to its committed value. */
  onBlur: () => void;
  /** The same, for a caller that swaps the field out from under the typist. */
  reset: () => void;
};

export function useTypedNumber({ value, onChange, parse, clamp }: TypedNumberOptions): TypedNumberField {
  const [typed, setTyped] = useState<{ text: string; from: number } | null>(null);

  return {
    text: typed?.from === value ? typed.text : String(value),
    onChangeText: (next) => {
      const parsed = parse(next);
      const committed = Number.isFinite(parsed) ? clamp(parsed) : value;
      setTyped({ text: next, from: committed });
      if (committed !== value) onChange(committed);
    },
    onBlur: () => setTyped(null),
    reset: () => setTyped(null),
  };
}
