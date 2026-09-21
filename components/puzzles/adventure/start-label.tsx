import { Text } from "@/components/ui";

/**
 * "start", where a walk begins.
 *
 * Not a control and not a badge: a bordered chip beside real buttons claims to
 * be pressable, and the canvas already has enough boxes. It is a kicker — the
 * display face at caption size in the rubric red — and it is one component
 * because the card on the canvas and the inspector beside it must say it the
 * same way.
 */
export function StartLabel() {
  return <Text className="font-display text-xs text-primary">start</Text>;
}
