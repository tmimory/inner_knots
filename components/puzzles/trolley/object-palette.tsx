import { useCallback, useMemo, useState } from "react";
import { FlatList, LayoutChangeEvent, Pressable, View } from "react-native";

import { Badge, Button, Input, Separator, Text } from "@/components/ui";
import { familyOf, type TrolleyObject } from "@/lib/puzzles/trolley/catalogue";
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
 * One filter, as a chip.
 *
 * A filter that is on has to be legible across the row at a glance, and a word
 * that changes colour is not: the on state is a filled chip and the off state an
 * outlined one, which is the same pair of states chips wear everywhere else.
 * Selected filters are ANDed, so they narrow rather than widen.
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
      className="transition-opacity duration-fast web:hover:opacity-hover"
    >
      <Badge variant={selected ? "selected" : "outline"}>
        <Text>{tag}</Text>
      </Badge>
    </Pressable>
  );
}

/**
 * The catalogue dealt round-robin across its four families.
 *
 * Built in grammar order the list opens with a hundred variations on one noun, so
 * the first four rows of the grid are a hundred identical figures and the glyphs
 * look like decoration. Dealing person, animal, thing, group in turn puts four
 * different drawings in every row while keeping each family's own order intact.
 */
function interleaveFamilies(items: readonly TrolleyObject[]): TrolleyObject[] {
  const buckets = new Map<string, TrolleyObject[]>();
  for (const item of items) {
    const family = familyOf(item);
    const bucket = buckets.get(family);
    if (bucket) bucket.push(item);
    else buckets.set(family, [item]);
  }

  const lists = [...buckets.values()];
  if (lists.length < 2) return [...items];

  const out: TrolleyObject[] = [];
  for (let index = 0; out.length < items.length; index += 1) {
    for (const list of lists) {
      const item = list[index];
      if (item) out.push(item);
    }
  }
  return out;
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
  /** How many whole rows the grid is clipped to; "Show more" lets out four more. */
  const [rows, setRows] = useState<number>(PALETTE.visibleRows);

  const tileWidth = theme.avatarSizes["avatar-xl"];
  const gap = theme.spacing.xs;
  const perRow = Math.max(1, Math.floor((width + gap) / (tileWidth + gap)));

  const hasCustom = useMemo(() => items.some((item) => item.tags.includes(CUSTOM_TAG)), [items]);

  const filtered = useMemo(() => filterCatalogue(items, { query, tags }), [items, query, tags]);

  // The user's own objects keep the front of the queue; the built-ins behind them
  // are dealt family by family so a row is never four copies of one drawing.
  const ordered = useMemo(() => {
    const custom = filtered.filter((item) => item.tags.includes(CUSTOM_TAG));
    const rest = filtered.filter((item) => !item.tags.includes(CUSTOM_TAG));
    return [...custom, ...interleaveFamilies(rest)];
  }, [filtered]);

  const grid = useMemo(() => chunk(ordered, perRow), [ordered, perRow]);

  const filtering = tags.length > 0 || query.trim() !== "";
  const shown = Math.min(filtered.length, perRow * rows);
  const more = filtered.length - shown;

  const toggleTag = useCallback((tag: string) => {
    setRows(PALETTE.visibleRows);
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
          onChangeText={(text) => {
            setRows(PALETTE.visibleRows);
            setQuery(text);
          }}
          placeholder="Search the catalogue"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search objects"
        />
        {/* Only "New object" adds anything; the other two rearrange what is there. */}
        <Button variant="ghost" onPress={onRandomize}>
          <Text>Randomize</Text>
        </Button>
        <Button variant="ghost" onPress={onClear}>
          <Text>Clear tracks</Text>
        </Button>
        <Button variant="outline" onPress={onCreate}>
          <Text>New object</Text>
        </Button>
      </View>

      {/*
        One wrapping row: each family's own tag leads its run of chips, so the
        family name is the filter rather than a caption sitting beside one.
      */}
      <View className="flex-row flex-wrap items-center gap-xs">
        {TAG_GROUP_ORDER.flatMap((family) => TAG_GROUPS[family] ?? []).map((tag) => (
          <TagToggle
            key={tag}
            tag={tag}
            selected={tags.includes(tag)}
            onPress={() => toggleTag(tag)}
          />
        ))}
        {hasCustom ? (
          <TagToggle
            tag={CUSTOM_TAG}
            selected={tags.includes(CUSTOM_TAG)}
            onPress={() => toggleTag(CUSTOM_TAG)}
          />
        ) : null}
      </View>

      <View onLayout={measure} style={{ height: paletteHeight(rows) }}>
        {filtered.length === 0 ? (
          <Text variant="muted">Nothing matches. Try fewer words, or fewer filters.</Text>
        ) : (
          <FlatList
            data={grid}
            keyExtractor={(row, index) => row[0]?.id ?? String(index)}
            nestedScrollEnabled
            initialNumToRender={rows + 1}
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
        {more > 0 ? (
          <Button variant="link" size="sm" onPress={() => setRows(rows + PALETTE.visibleRows)}>
            <Text>Show more</Text>
          </Button>
        ) : null}
        <View className="flex-1" />
        {filtering ? (
          <Button
            variant="ghost"
            size="sm"
            onPress={() => {
              setRows(PALETTE.visibleRows);
              setQuery("");
              setTags([]);
            }}
          >
            <Text>Reset filters</Text>
          </Button>
        ) : null}
      </View>
    </View>
  );
}
