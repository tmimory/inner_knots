import { useState } from "react";
import { Platform } from "react-native";

import { Button, Text } from "@/components/ui";
import { durations } from "@/theme";

/** How long the button admits to having copied before going back to the offer. */
const ACKNOWLEDGED_MS = durations.slow * 4;

/**
 * Puts text on the clipboard where the platform has one.
 *
 * Guarded rather than assumed: `navigator.clipboard` is absent on native and on
 * an insecure origin, and a promise that rejects into nothing is how a button
 * ends up claiming to have done something it did not.
 */
function copyToClipboard(text: string): Promise<boolean> {
  if (Platform.OS !== "web" || typeof navigator === "undefined") return Promise.resolve(false);
  const clipboard: Clipboard | undefined = navigator.clipboard;
  if (clipboard === undefined) return Promise.resolve(false);
  return clipboard.writeText(text).then(
    () => true,
    () => false,
  );
}

export type CopyIdProps = {
  /** The whole id, which is what a reader pasting it into a query actually wants. */
  value: string;
};

/**
 * "Copy id", beside the run's title.
 *
 * The page names the run by the eight characters that tell it apart from the
 * day's other runs, because a forty-character hash set as a page's leading fact
 * is a hash, not a title. The other thirty-two characters are still what a
 * `grep` needs, so they leave by the one route that does not cost the page a
 * line: a utility button that hands them over.
 */
export function CopyId({ value }: CopyIdProps) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      variant="ghost"
      size="sm"
      accessibilityLabel={`Copy the full run id, ${value}`}
      onPress={() => {
        void copyToClipboard(value).then((ok) => {
          if (!ok) return;
          setCopied(true);
          setTimeout(() => setCopied(false), ACKNOWLEDGED_MS);
        });
      }}
    >
      <Text>{copied ? "Copied" : "Copy id"}</Text>
    </Button>
  );
}
