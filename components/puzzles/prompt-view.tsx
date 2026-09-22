import type { ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { Avatar } from "@/components/avatars";
import { decisionStyleMeta, DECISION_STYLE_META } from "@/components/characters/labels";
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
import type { Avatar as AvatarSpec } from "@/lib/domain/character";
import type { DecisionStyle, ProviderId } from "@/lib/domain/enums";
import type { PromptOption } from "@/lib/puzzles/types";
import { cn } from "@/lib/utils";

/** One composed prompt. The dilemma needs two of these; the other puzzles, one. */
export type PromptPanel = {
  /** Which side this is, e.g. "Player A". Omitted when there is only one panel. */
  label?: string;
  /** Drawn beside the label — the avatar of the character this panel is for. */
  accessory?: ReactNode;
  /**
   * One quiet line under the label: how this panel ends, in words — see
   * `decisionStyleMeta`. The dilemma sets it per seat, since its two panels are
   * composed for two characters at once and it carries no selector.
   */
  meta?: string;
  /** The system message, when the puzzle itself supplies one. */
  system?: string;
  user: string;
  options: readonly PromptOption[];
};

/**
 * One character the preview can be composed as: a face, a name, and the ending
 * the prompt takes for it.
 *
 * Data only — the roster hands `usePromptPreview` characters and it builds these
 * (see `viewpointsOf`) — so the pure half is testable without rendering a face.
 */
export type Viewpoint = {
  /** The character's id, which is also the selector's value. */
  id: string;
  label: string;
  provider: ProviderId;
  decisionStyle: DecisionStyle;
  avatar: AvatarSpec;
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
  /**
   * The roster, as whom the single panel may be read. Omit it entirely on a
   * sheet that composes a panel per character already, such as the dilemma's.
   */
  viewpoints?: readonly Viewpoint[];
  /** The chosen viewpoint's id; the first one is used when it names none. */
  viewpointId?: string;
  onViewpointChange?: (id: string) => void;
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
        <View className="gap-xxs">
          <View className="flex-row items-center gap-sm">
            {panel.accessory}
            <Text variant="h4" className="flex-1" numberOfLines={1}>
              {panel.label}
            </Text>
          </View>
          {/* The ending this panel was composed with, under the name it belongs to. */}
          {panel.meta ? <Text variant="meta">{panel.meta}</Text> : null}
        </View>
      ) : panel.meta ? (
        <Text variant="meta">{panel.meta}</Text>
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

/** One face on the "Viewing as" row: the app's selection language, on a chip. */
function ViewpointChip({
  viewpoint,
  selected,
  onPress,
}: {
  viewpoint: Viewpoint;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      role="radio"
      aria-checked={selected}
      accessibilityLabel={`${viewpoint.label}, ${DECISION_STYLE_META[viewpoint.decisionStyle]}`}
      onPress={onPress}
    >
      <Badge variant={selected ? "selected" : "outline"}>
        <Avatar
          shape={viewpoint.avatar.shape}
          color={viewpoint.avatar.color}
          size="xs"
          frame={false}
        />
        <Text>{viewpoint.label}</Text>
      </Badge>
    </Pressable>
  );
}

/**
 * Whose prompt this is, and — since one follows from the other — how it ends.
 *
 * The last paragraph of every puzzle prompt is written for the character that
 * will answer it: a TypeSafe character is handed the options as criteria and
 * never told about a response format, a tool-calling one is told to call the
 * tool. So the roster is the control: pick a face and the sheet recomposes as
 * that character. One seat needs no choosing and says the name flat; an empty
 * roster says what seating somebody would buy.
 */
function ViewpointBar({
  viewpoints,
  selected,
  onChange,
  className,
}: {
  viewpoints: readonly Viewpoint[];
  selected: Viewpoint | undefined;
  onChange?: (id: string) => void;
  className?: string;
}) {
  if (selected === undefined) {
    return (
      <Text variant="muted" className={className}>
        Seat a character to preview the ending it will be given.
      </Text>
    );
  }

  return (
    <View className={cn("gap-xs", className)}>
      <View
        className="flex-row flex-wrap items-center gap-sm"
        role={viewpoints.length > 1 ? "radiogroup" : undefined}
        accessibilityLabel={viewpoints.length > 1 ? "Viewing as" : undefined}
      >
        <Text variant="meta">Viewing as</Text>
        {viewpoints.length > 1 ? (
          viewpoints.map((viewpoint) => (
            <ViewpointChip
              key={viewpoint.id}
              viewpoint={viewpoint}
              selected={viewpoint.id === selected.id}
              onPress={() => onChange?.(viewpoint.id)}
            />
          ))
        ) : (
          <View className="flex-row items-center gap-xs">
            <Avatar
              shape={selected.avatar.shape}
              color={selected.avatar.color}
              size="xs"
              frame={false}
            />
            <Text variant="small">{selected.label}</Text>
          </View>
        )}
      </View>
      <Text variant="meta">{decisionStyleMeta(selected.decisionStyle, selected.provider)}</Text>
    </View>
  );
}

/**
 * What would actually be sent to a model, composed by the same code a run uses.
 *
 * The character's steering prompt is not in here: it is prepended by the engine,
 * and the point of this sheet is to read the puzzle's own words without one
 * attached. Several panels sit side by side on a wide viewport and stack below it.
 *
 * Pass `viewpoints` (from `usePromptPreview`) on a one-panel sheet and the
 * roster becomes a "Viewing as" row: the prompt's closing instructions belong to
 * whoever will answer it, so the preview is read as one of them. A sheet with a
 * panel per character already — the dilemma's — passes none.
 */
export function PromptView({
  open,
  onOpenChange,
  title,
  description,
  panels,
  loading = false,
  error = null,
  viewpoints,
  viewpointId,
  onViewpointChange,
}: PromptViewProps) {
  const sideBySide = useSideBySide(panels.length);
  const selectedViewpoint =
    viewpoints?.find((entry) => entry.id === viewpointId) ?? viewpoints?.[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-full w-full max-w-content">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
          {/* A step of air under the description: the row is a control, not a
              third line of the title block. */}
          {viewpoints ? (
            <ViewpointBar
              className="pt-xs"
              viewpoints={viewpoints}
              selected={selectedViewpoint}
              onChange={onViewpointChange}
            />
          ) : null}
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
        <Separator />

        <View className="flex-row justify-end">
          <Button variant="outline" onPress={() => onOpenChange(false)}>
            <Text>Close</Text>
          </Button>
        </View>
      </DialogContent>
    </Dialog>
  );
}
