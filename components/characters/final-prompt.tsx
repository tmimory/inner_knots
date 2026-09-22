import { useEffect, useState } from "react";
import { Platform, View } from "react-native";

import { Button, SectionHeading, Text } from "@/components/ui";
import type { Steering } from "@/lib/domain";
import { previewSteering } from "@/lib/client/prompts";
import { describeApiError } from "@/lib/client/errors";
import { cn } from "@/lib/utils";

/** Long enough that typing a sentence is one request, short enough to feel live. */
const DEBOUNCE_MS = 300;

/**
 * Where the puzzle itself lands in what is sent.
 *
 * Drawn in the same mono block as the composed prompt, because a character that
 * steers nothing still sends something: without the slot, "Raw" turned the panel
 * into a sentence about an absence, which is the one state the rail is least able
 * to show.
 */
const PUZZLE_SLOT = "< the puzzle >";

/** How long the copy link says it worked before going back to offering it. */
const COPIED_MS = 1600;

/**
 * Puts the composed prompt on the clipboard, where the platform has one.
 *
 * Guarded rather than assumed: `navigator.clipboard` is absent on native, and on
 * the web it is undefined outside a secure context, so the link simply does
 * nothing rather than throwing into a render.
 */
function copyToClipboard(text: string): Promise<void> {
  if (Platform.OS !== "web" || typeof navigator === "undefined") return Promise.resolve();
  const clipboard: Clipboard | undefined = navigator.clipboard;
  if (clipboard === undefined) return Promise.resolve();
  return clipboard.writeText(text);
}

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
 * It reads as marginalia: the rail's hairline down its left edge — passed in by
 * the page that places it, so the rule ends where this panel ends — and the
 * composed prompt set in the mono voice beside it. The tinted, bordered panel it
 * used to wear was a second frame inside a column that is already set apart by
 * sitting in the margin.
 *
 * Whatever the mode, the panel renders what will actually be sent — never a
 * sentence about it. A character that steers nothing still sends the puzzle, so
 * "Raw" draws the puzzle's own slot in the same mono block the composed prompt
 * would fill, with one line under it saying what is missing. A column that
 * empties itself when a segment is pressed leaves a third of the page blank and
 * makes the form jump sideways on the next press.
 *
 * Mono at the caption size rather than the body's: a fixed-width face in a 360px
 * rail sets about forty characters to the line at 14px, which breaks a composed
 * prompt into a ragged stack; a step down buys the measure the block needs.
 */
export function FinalPrompt({ steering, className }: FinalPromptProps) {
  const state = useSteeringPreview(steering);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const prompt = state.status === "ready" ? state.prompt : null;

  return (
    <View className={cn("gap-md", className)}>
      {/*
        The one thing you do with a composed prompt other than read it, on the
        heading's own line: paste it into the provider's console and ask the same
        question by hand.
      */}
      <SectionHeading
        title="Final prompt"
        right={
          prompt === null ? undefined : (
            <Button
              variant="link"
              size="sm"
              onPress={() => {
                void copyToClipboard(prompt).then(() => setCopied(true));
              }}
            >
              <Text>{copied ? "Copied" : "Copy"}</Text>
            </Button>
          )
        }
      />
      {state.status === "error" ? (
        <Text variant="small" className="text-destructive">
          {state.message}
        </Text>
      ) : prompt !== null ? (
        <Text selectable variant="code" className="text-xs">
          {prompt}
        </Text>
      ) : state.status === "ready" ? (
        <>
          <Text selectable variant="code" className="text-xs text-subtle-foreground">
            {PUZZLE_SLOT}
          </Text>
          <Text variant="meta">No system prompt. The puzzle is sent as the only message.</Text>
        </>
      ) : null}
    </View>
  );
}
