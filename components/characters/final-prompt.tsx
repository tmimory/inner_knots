import { useEffect, useState } from "react";
import { View } from "react-native";

import { Text } from "@/components/ui";
import type { Steering } from "@/lib/domain";
import { previewSteering } from "@/lib/client/prompts";
import { describeApiError } from "@/lib/client/errors";
import { cn } from "@/lib/utils";

/** Long enough that typing a sentence is one request, short enough to feel live. */
const DEBOUNCE_MS = 300;

type PreviewState =
  | { status: "loading" }
  | { status: "ready"; prompt: string | null }
  | { status: "error"; message: string };

/**
 * The composed steering prompt for a draft character, debounced.
 *
 * The composition lives on the server in `prompts/characters/*.md`, so the
 * preview asks the same route a run would rather than re-deriving the wording in
 * the client — edit a fragment and this panel changes with it.
 */
function useSteeringPreview(steering: Steering): PreviewState {
  const [result, setResult] = useState<PreviewState | null>(null);
  const signature = JSON.stringify(steering);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      previewSteering({ steering: JSON.parse(signature) as Steering })
        .then((prompt) => {
          if (!cancelled) setResult({ status: "ready", prompt });
        })
        .catch((cause: unknown) => {
          if (!cancelled) {
            setResult({ status: "error", message: describeApiError(cause) });
          }
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [signature]);

  // An answer for an older draft is one keystroke behind, not wrong: holding it
  // while the next one composes keeps the panel from blinking out on every letter
  // typed into the bio. Only the very first draft has nothing to show.
  return result ?? { status: "loading" };
}

export type FinalPromptProps = {
  steering: Steering;
  className?: string;
};

/**
 * What the model will actually be told before it hears the puzzle. Read-only on
 * purpose: the prompt is derived from the fields above it, never edited here.
 *
 * A character that sends no system prompt draws nothing at all: the steering
 * mode's own line already says what that means, and there is no box to frame.
 */
export function FinalPrompt({ steering, className }: FinalPromptProps) {
  const state = useSteeringPreview(steering);

  if (state.status === "error") {
    return (
      <Text variant="small" className={cn("text-destructive", className)}>
        {state.message}
      </Text>
    );
  }

  // Nothing to show is nothing to draw: a character that sends no system prompt
  // has already been told so by the steering mode's own line, and a titled panel
  // around that sentence would say it twice.
  if (state.status === "loading" || state.prompt === null) return null;

  return (
    <View className={cn("gap-md", className)}>
      <Text variant="h3">Final prompt</Text>
      <View className="rounded-md border-hairline border-border bg-muted p-lg">
        <Text selectable className="font-mono text-sm">
          {state.prompt}
        </Text>
      </View>
    </View>
  );
}
