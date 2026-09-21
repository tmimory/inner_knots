import { View } from "react-native";

import { Badge, Text, type BadgeProps } from "@/components/ui";
import { cn } from "@/lib/utils";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

/** Who is speaking. An unknown role still gets a label rather than being hidden. */
const ROLE_VARIANTS: Record<string, BadgeVariant> = {
  system: "outline",
  user: "muted",
  assistant: "secondary",
};

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
        <Badge variant={ROLE_VARIANTS[role] ?? "muted"}>
          <Text>{role}</Text>
        </Badge>
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
