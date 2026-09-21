import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Separator,
  Text,
} from "@/components/ui";
import { useSideBySide } from "@/lib/client/use-viewport";
import type { PromptOption } from "@/lib/puzzles/types";
import { cn } from "@/lib/utils";

/** One composed prompt. The dilemma needs two of these; the other puzzles, one. */
export type PromptPanel = {
  /** Which side this is, e.g. "Player A". Omitted when there is only one panel. */
  label?: string;
  /** Drawn beside the label — the avatar of the character this panel is for. */
  accessory?: ReactNode;
  /** The system message, when the puzzle itself supplies one. */
  system?: string;
  user: string;
  options: readonly PromptOption[];
};

export type PromptViewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** One line saying what is and is not included. */
  description?: string;
  panels: readonly PromptPanel[];
  /** Shown in place of the panels while the preview is being composed. */
  loading?: boolean;
  /** Shown in place of the panels when the preview could not be composed. */
  error?: string | null;
};

/** A block of prompt text, set in the monospace face on a recessed parchment. */
function Block({ label, text }: { label: string; text: string }) {
  return (
    <View className="gap-xs">
      <Text variant="muted" className="font-display uppercase">
        {label}
      </Text>
      <View className="rounded-md border-hairline border-border bg-muted p-md">
        <Text variant="code" selectable>
          {text}
        </Text>
      </View>
    </View>
  );
}

function Panel({ panel, showLabel }: { panel: PromptPanel; showLabel: boolean }) {
  return (
    <View className="flex-1 gap-md">
      {showLabel && panel.label ? (
        <View className="flex-row items-center gap-sm">
          {panel.accessory}
          <Text variant="h4" className="flex-1" numberOfLines={1}>
            {panel.label}
          </Text>
        </View>
      ) : null}
      {panel.system ? <Block label="System" text={panel.system} /> : null}
      <Block label="User" text={panel.user} />
      <View className="gap-xs">
        <Text variant="muted" className="font-display uppercase">
          Options
        </Text>
        <View className="flex-row flex-wrap gap-xs">
          {panel.options.map((option) => (
            <Badge key={option.id} variant="outline">
              <Text className="font-mono">{`${option.id} · ${option.label}`}</Text>
            </Badge>
          ))}
        </View>
      </View>
    </View>
  );
}

/**
 * What would actually be sent to a model, composed by the same code a run uses.
 *
 * The character's steering prompt is not in here: it is prepended by the engine,
 * and the point of this sheet is to read the puzzle's own words without one
 * attached. Several panels sit side by side on a wide viewport and stack below it.
 */
export function PromptView({
  open,
  onOpenChange,
  title,
  description,
  panels,
  loading = false,
  error = null,
}: PromptViewProps) {
  const sideBySide = useSideBySide(panels.length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-full w-full max-w-content">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <Separator />

        <ScrollView className="flex-1" contentContainerClassName="gap-lg pb-md">
          {error ? <Text className="text-destructive">{error}</Text> : null}
          {loading && !error ? <Text variant="muted">Composing…</Text> : null}
          {!loading && !error ? (
            <View className={cn("gap-lg", sideBySide && "flex-row items-start")}>
              {panels.map((panel, index) => (
                <Panel
                  key={panel.label ?? String(index)}
                  panel={panel}
                  showLabel={panels.length > 1}
                />
              ))}
            </View>
          ) : null}
        </ScrollView>

        <View className="flex-row justify-end">
          <Button variant="outline" onPress={() => onOpenChange(false)}>
            <Text>Close</Text>
          </Button>
        </View>
      </DialogContent>
    </Dialog>
  );
}
