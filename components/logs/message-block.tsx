import { View } from "react-native";

import { Text } from "@/components/ui";
import { cn } from "@/lib/utils";

export type MessageBlockProps = {
  role: string;
  content: string;
  className?: string;
};

/**
 * One turn of a conversation, exactly as it was sent: a role label over a
 * parchment block of monospace text. This is the thing a researcher came to
 * read, so nothing here paraphrases, wraps or shortens the content.
 */
export function MessageBlock({ role, content, className }: MessageBlockProps) {
  return (
    <View className={cn("gap-xs", className)}>
      <View className="flex-row items-center gap-sm">
        <Text variant="muted" className="font-display text-xs">
          {role}
        </Text>
        <Text variant="muted" className="text-xs">
          {content.length} characters
        </Text>
      </View>
      <View className="rounded-md border-hairline border-border bg-muted p-md">
        <Text variant="code" selectable>
          {content === "" ? "(empty)" : content}
        </Text>
      </View>
    </View>
  );
}
