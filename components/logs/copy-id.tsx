import { Button, Text } from "@/components/ui";
import { useClipboardCopy } from "@/lib/client/use-clipboard-copy";

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
  const { copied, copy } = useClipboardCopy(() => value);

  return (
    <Button
      variant="ghost"
      size="sm"
      accessibilityLabel={`Copy the full run id, ${value}`}
      onPress={copy}
    >
      <Text>{copied ? "Copied" : "Copy id"}</Text>
    </Button>
  );
}
