import { useCallback, useMemo, useState } from "react";
import { FlatList, LayoutChangeEvent, Pressable, View } from "react-native";

import { Button, Input, Separator, Text } from "@/components/ui";
import type { TrolleyObject } from "@/lib/puzzles/trolley/catalogue";
import {
  CUSTOM_TAG,
  TAG_GROUPS,
  TAG_GROUP_ORDER,
  chunk,
  filterCatalogue,
} from "@/lib/puzzles/trolley/search";
import { cn } from "@/lib/utils";
import { useTheme } from "@/theme";

import { DraggableObject, type DragPoint } from "./draggable-object";
import { PALETTE, paletteHeight, type TrackId } from "./geometry";

export type ObjectPaletteProps = {
  /** The merged catalogue: custom objects first, then the built-ins. */
  items: readonly TrolleyObject[];
  /** Whether a track will take another object, for the tap-to-place menu. */
  canPlace: (track: TrackId) => boolean;
  /** The tap fallback: the user named the track. */
  onPlace: (item: TrolleyObject, track: TrackId) => void;
  /** A tile was released; the screen hit-tests the point against the board. */
  onDropItem: (item: TrolleyObject, point: DragPoint) => void;
  onDragStart?: () => void;
  onDragMove?: (point: DragPoint) => void;
  onRandomize: () => void;
  onClear: () => void;
  /** Opens the object creator. */
  onCreate: () => void;
  /** True while the custom objects are still being read. */
  loading?: boolean;
  className?: string;
};

/**
 * One filter, as a word rather than a pill.
 *
 * Twenty-one outlined chips read as twenty-one buttons competing with the one
 * button that matters; the same twenty-one words with the chosen ones underlined
 * read as what they are — a line of filters. Selected filters are ANDed, so they
 * narrow rather than widen.
 */
function TagToggle({
  tag,
  selected,
  onPress,
}: {
  tag: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      role="checkbox"
      accessibilityState={{ checked: selected, selected }}
      accessibilityLabel={`Filter by ${tag}`}
      onPress={onPress}
      className="py-xxs"
    >
      <Text
        className={cn(
          "font-body text-sm transition-colors duration-fast",
          selected
            ? "text-primary underline"
            : "text-muted-foreground web:hover:text-foreground",
        )}
      >
        {tag}
      </Text>
    </Pressable>
  );
}

/**
 * Everything that can go on a track, searchable.
 *
 * The built-in catalogue runs to several hundred entries, so the grid is a
 * virtualized list of rows rather than a wrapping flexbox: the search box and the
 * filters are what make it usable, and the list only draws what is on screen.
 * The grid is clipped to whole rows and says how many of the matches it is
 * showing, so the rest are known to be a scroll away rather than missing.
 */
export function ObjectPalette({
  items,
  canPlace,
  onPlace,
  onDropItem,
  onDragStart,
  onDragMove,
  onRandomize,
  onClear,
  onCreate,
  loading = false,
  className,
}: ObjectPaletteProps) {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [width, setWidth] = useState(0);

  const tileWidth = theme.avatarSizes["avatar-xl"];
  const gap = theme.spacing.xs;
  const perRow = Math.max(1, Math.floor((width + gap) / (tileWidth + gap)));

  const hasCustom = useMemo(() => items.some((item) => item.tags.includes(CUSTOM_TAG)), [items]);

  const filtered = useMemo(() => filterCatalogue(items, { query, tags }), [items, query, tags]);
  const rows = useMemo(() => chunk(filtered, perRow), [filtered, perRow]);

  const filtering = tags.length > 0 || query.trim() !== "";
  const shown = Math.min(filtered.length, perRow * PALETTE.visibleRows);

  const toggleTag = useCallback((tag: string) => {
    setTags((current) =>
      current.includes(tag) ? current.filter((entry) => entry !== tag) : [...current, tag],
    );
  }, []);

  const measure = useCallback((event: LayoutChangeEvent) => {
    setWidth(Math.round(event.nativeEvent.layout.width));
  }, []);

  const place = useCallback(
    (item: TrolleyObject, track: TrackId) => {
      setMenuFor(null);
      onPlace(item, track);
    },
    [onPlace],
  );

  return (
    <View className={cn("gap-md", className)}>
      <View className="flex-row flex-wrap items-center gap-sm">
        <Input
          className="min-w-menu flex-1"
          value={query}
          onChangeText={setQuery}
          placeholder="Search the catalogue"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search objects"
        />
        <Button variant="outline" onPress={onRandomize}>
          <Text>Randomize</Text>
        </Button>
        <Button variant="outline" onPress={onClear}>
          <Text>Clear tracks</Text>
        </Button>
        <Button variant="outline" onPress={onCreate}>
          <Text>New object</Text>
        </Button>
      </View>

      {/*
        Each family's own tag is the row's first word, so the family name is the
        toggle rather than a caption repeating the toggle beside it.
      */}
      <View className="gap-xxs">
        {TAG_GROUP_ORDER.map((family) => {
          const group = TAG_GROUPS[family] ?? [];
          return (
            <View key={family} className="flex-row flex-wrap items-center gap-lg">
              {group.map((tag) => (
                <TagToggle
                  key={tag}
                  tag={tag}
                  selected={tags.includes(tag)}
                  onPress={() => toggleTag(tag)}
                />
              ))}
            </View>
          );
        })}
        {hasCustom ? (
          <View className="flex-row flex-wrap items-center gap-lg">
            <TagToggle
              tag={CUSTOM_TAG}
              selected={tags.includes(CUSTOM_TAG)}
              onPress={() => toggleTag(CUSTOM_TAG)}
            />
          </View>
        ) : null}
      </View>

      <View onLayout={measure} style={{ height: paletteHeight() }}>
        {filtered.length === 0 ? (
          <Text variant="muted">Nothing matches. Try fewer words, or fewer filters.</Text>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(row, index) => row[0]?.id ?? String(index)}
            nestedScrollEnabled
            initialNumToRender={PALETTE.visibleRows + 1}
            windowSize={3}
            removeClippedSubviews={false}
            contentContainerClassName="gap-xs"
            renderItem={({ item: row }) => (
              <View className="flex-row gap-xs">
                {row.map((entry) => (
                  <DraggableObject
                    key={entry.id}
                    item={entry}
                    onDragStart={onDragStart}
                    onDragMove={onDragMove}
                    onDrop={(point) => onDropItem(entry, point)}
                    onTap={() => setMenuFor((current) => (current === entry.id ? null : entry.id))}
                    menu={
                      menuFor === entry.id ? (
                        <View
                          style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            zIndex: theme.zIndex.menu,
                          }}
                          className="mt-xxs w-avatar-xl gap-xxs rounded-sm border-hairline border-border bg-popover p-xxs shadow-ink-lifted"
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={!canPlace(1)}
                            onPress={() => place(entry, 1)}
                          >
                            <Text>Track 1</Text>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={!canPlace(2)}
                            onPress={() => place(entry, 2)}
                          >
                            <Text>Track 2</Text>
                          </Button>
                        </View>
                      ) : undefined
                    }
                  />
                ))}
                {row.length < perRow ? <View className="flex-1" /> : null}
              </View>
            )}
          />
        )}
      </View>

      {/* The rule is the grid's bottom edge: what is under it is a scroll away. */}
      <Separator />

      <View className="flex-row flex-wrap items-center gap-md">
        <Text variant="muted">
          {loading
            ? "Reading your objects…"
            : `Showing ${shown} of ${filtered.length}${filtering ? ` matching objects, from ${items.length}` : " objects"}`}
        </Text>
        {filtering ? (
          <Button
            variant="ghost"
            size="sm"
            onPress={() => {
              setQuery("");
              setTags([]);
            }}
          >
            <Text>Reset filters</Text>
          </Button>
        ) : null}
        <View className="flex-1" />
        <Text variant="muted">Drag a tile onto a track, or tap one and choose.</Text>
      </View>
    </View>
  );
}
