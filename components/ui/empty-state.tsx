import { Link, type Href } from "expo-router";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

/** The one thing to do from an empty screen: a route to open, or a handler to run. */
export type EmptyStateAction = {
  label: string;
  href?: Href;
  onPress?: () => void;
};

/** A further way in, set as a link rather than a second button. */
export type EmptyStateLink = {
  label: string;
  href: Href;
};

export type EmptyStateProps = {
  /** The headline: what is not here yet, in the page's own words. */
  title: string;
  /** One sentence saying what will fill it. */
  body?: string;
  /** The single next step. Rendered as the screen's primary button. */
  action?: EmptyStateAction;
  /** Other ways in, on one line under the button. */
  links?: readonly EmptyStateLink[];
  className?: string;
};

/**
 * What a screen shows before it has anything to show.
 *
 * A composed block, not a footnote: a headline, one sentence, one primary action
 * and — where there is genuinely more than one way in — a line of links. An empty
 * screen is the first thing a new reader meets, and a single grey sentence
 * floating under a title tells them the app is broken rather than new.
 *
 * Capped at `layout.measure` so the sentence breaks once and the block reads as a
 * paragraph with a button under it rather than a line of text running the width
 * of the window.
 */
export function EmptyState({ title, body, action, links, className }: EmptyStateProps) {
  const button = action ? (
    <Button onPress={action.onPress}>
      <Text>{action.label}</Text>
    </Button>
  ) : null;

  return (
    <View className={cn("w-full max-w-measure gap-lg", className)}>
      <View className="gap-xs">
        <Text variant="h4">{title}</Text>
        {body ? <Text variant="muted" className="text-base">{body}</Text> : null}
      </View>

      {action ? (
        <View className="flex-row">
          {action.href !== undefined ? (
            <Link href={action.href} asChild>
              {button}
            </Link>
          ) : (
            button
          )}
        </View>
      ) : null}

      {links && links.length > 0 ? (
        <View className="flex-row flex-wrap items-center gap-lg">
          {links.map((link) => (
            <Link key={link.label} href={link.href} asChild>
              <Button variant="link" size="sm">
                <Text>{link.label}</Text>
              </Button>
            </Link>
          ))}
        </View>
      ) : null}
    </View>
  );
}
