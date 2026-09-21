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

/** A settled answer, tagged with the draft it answers for. */
type PreviewResult = PreviewState & { signature: string };

/**
 * The composed steering prompt for a draft character, debounced.
 *
 * The composition lives on the server in `prompts/characters/*.md`, so the
 * preview asks the same route a run would rather than re-deriving the wording in
 * the client — edit a fragment and this panel changes with it.
 */
function useSteeringPreview(steering: Steering): PreviewState {
  const [result, setResult] = useState<PreviewResult | null>(null);
  const signature = JSON.stringify(steering);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      previewSteering({ steering: JSON.parse(signature) as Steering })
        .then((prompt) => {
          if (!cancelled) setResult({ signature, status: "ready", prompt });
        })
        .catch((cause: unknown) => {
          if (!cancelled) {
            setResult({ signature, status: "error", message: describeApiError(cause) });
          }
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [signature]);

  // An answer for an older draft is a stale answer, which reads as "still composing".
  return result?.signature === signature ? result : { status: "loading" };
}

export type FinalPromptProps = {
  steering: Steering;
  className?: string;
};

/**
 * What the model will actually be told before it hears the puzzle. Read-only on
 * purpose: the prompt is derived from the fields above it, never edited here.
 *
 * A character that sends no system prompt gets one line, not a titled panel
 * around an empty box: there is nothing there to frame.
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

  if (state.status === "loading") {
    return (
      <Text variant="muted" className={className}>
        Composing the final prompt…
      </Text>
    );
  }

  if (state.prompt === null) {
    return (
      <Text variant="muted" className={className}>
        No steering prompt; this character speaks for the raw model.
      </Text>
    );
  }

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
