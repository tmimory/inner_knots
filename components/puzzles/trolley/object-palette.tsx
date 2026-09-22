import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutChangeEvent, Pressable, View } from "react-native";

import { Badge, Button, Input, Text } from "@/components/ui";
import { familyOf, type TrolleyObject } from "@/lib/puzzles/trolley/catalogue";
import { CUSTOM_TAG, TAG_GROUPS, TAG_GROUP_ORDER, filterCatalogue } from "@/lib/puzzles/trolley/search";
import { cn } from "@/lib/utils";
import { useTheme } from "@/theme";

import { DraggableObject, type DragPoint } from "./draggable-object";
import { PALETTE, paletteBudget, type TrackId } from "./geometry";

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
  /**
   * A tile is aimed at the board — a drag is under way, or one has been tapped
   * and is waiting for a track. The board draws its empty places while this is
   * true and keeps them out of the drawing the rest of the time.
   */
  onArmedChange?: (armed: boolean) => void;
  onRandomize: () => void;
  onClear: () => void;
  /** Opens the object creator. */
  onCreate: () => void;
  /** True while the custom objects are still being read. */
  loading?: boolean;
  className?: string;
};

/**
 * The six tags the catalogue is most often narrowed by, after the four families.
 *
 * Nineteen chips at equal weight are not a filter, they are a second catalogue:
 * the families say what kind of thing, these six say which kind of one, and the
 * remaining eight wait behind "More" for the search that actually wants them.
 */
const FEATURED_TAGS: readonly string[] = [
  "stranger",
  "relation",
  "child",
  "elderly",
  "pet",
  "money",
];

/** Every tag the catalogue carries, in the order the families are declared. */
const ALL_TAGS: readonly string[] = TAG_GROUP_ORDER.flatMap((family) => TAG_GROUPS[family] ?? []);

/** The chips that are always on offer: the families, then the common six. */
const PRIMARY_TAGS: readonly string[] = [
  ...TAG_GROUP_ORDER.filter((family) => ALL_TAGS.includes(family)),
  ...FEATURED_TAGS,
];

/** Everything else, revealed by "More". */
const REST_TAGS: readonly string[] = ALL_TAGS.filter((tag) => !PRIMARY_TAGS.includes(tag));

/**
 * One filter, as a chip.
 *
 * At rest a chip is a word: no border, no fill, nothing for the eye to count.
 * Switched on it takes the selection language the whole app uses — a tan fill, a
 * hairline, the rubric red — so "which of these is on" is one glance, not twenty.
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
      className="rounded-sm transition-colors duration-fast web:hover:bg-muted/subtle"
    >
      <Badge variant={selected ? "selected" : "outline"} className={cn(!selected && "border-transparent")}>
        <Text>{tag}</Text>
      </Badge>
    </Pressable>
  );
}

/**
 * The catalogue dealt round-robin across its four families.
 *
 * Built in grammar order the list opens with a hundred variations on one noun, so
 * the first rows of the flow are a hundred identical figures and the glyphs look
 * like decoration. Dealing person, animal, thing, group in turn puts four
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
 * The built-in catalogue runs to several hundred entries, so the search box and
 * the filters are what make it usable; the flow itself opens at two rows and
 * grows two at a time. Two rows is deliberate — the board above is the thing the
 * screen is about, and a wall of four hundred tiles was answering a question
 * nobody had asked yet. The tiles wrap like words and size to their labels rather
 * than filling equal columns, so "Stranger" costs a word and "Suitcase with
 * $10,000 in It" costs a phrase.
 */
export function ObjectPalette({
  items,
  canPlace,
  onPlace,
  onDropItem,
  onDragStart,
  onDragMove,
  onArmedChange,
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
  const [moreTags, setMoreTags] = useState(false);
  /** How many rows of tiles the flow is clipped to; "Show more" lets out two more. */
  const [rows, setRows] = useState<number>(PALETTE.visibleRows);

  const hasCustom = useMemo(() => items.some((item) => item.tags.includes(CUSTOM_TAG)), [items]);

  const filtered = useMemo(() => filterCatalogue(items, { query, tags }), [items, query, tags]);

  // The user's own objects keep the front of the queue; the built-ins behind them
  // are dealt family by family so a row is never four copies of one drawing.
  const ordered = useMemo(() => {
    const custom = filtered.filter((item) => item.tags.includes(CUSTOM_TAG));
    const rest = filtered.filter((item) => !item.tags.includes(CUSTOM_TAG));
    return [...custom, ...interleaveFamilies(rest)];
  }, [filtered]);

  const filtering = tags.length > 0 || query.trim() !== "";
  const budget = paletteBudget(width || PALETTE.averageTileWidth, rows);
  const visible = useMemo(() => ordered.slice(0, budget), [budget, ordered]);
  const more = filtered.length - visible.length;

  // A tag hidden behind "More" cannot be the one that is on: the moment one is
  // chosen the rest of the row comes out and stays out.
  const showRest = moreTags || REST_TAGS.some((tag) => tags.includes(tag));

  useEffect(() => {
    onArmedChange?.(menuFor !== null);
  }, [menuFor, onArmedChange]);

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
        {/* Three ways to rearrange the board, none of them the screen's action. */}
        <Button variant="ghost" onPress={onRandomize}>
          <Text>Randomize</Text>
        </Button>
        <Button variant="ghost" onPress={onCreate}>
          <Text>New object</Text>
        </Button>
        <Button variant="destructive" onPress={onClear}>
          <Text>Clear tracks</Text>
        </Button>
      </View>

      {/* Four families, six common tags, and the rest a word away. */}
      <View className="flex-row flex-wrap items-center gap-xs">
        {PRIMARY_TAGS.map((tag) => (
          <TagToggle
            key={tag}
            tag={tag}
            selected={tags.includes(tag)}
            onPress={() => toggleTag(tag)}
          />
        ))}
        {showRest
          ? REST_TAGS.map((tag) => (
              <TagToggle
                key={tag}
                tag={tag}
                selected={tags.includes(tag)}
                onPress={() => toggleTag(tag)}
              />
            ))
          : null}
        {hasCustom ? (
          <TagToggle
            tag={CUSTOM_TAG}
            selected={tags.includes(CUSTOM_TAG)}
            onPress={() => toggleTag(CUSTOM_TAG)}
          />
        ) : null}
        {showRest ? null : (
          <Button variant="link" size="sm" onPress={() => setMoreTags(true)}>
            <Text>More</Text>
          </Button>
        )}
      </View>

      <View onLayout={measure} className="flex-row flex-wrap items-start gap-xs">
        {visible.length === 0 ? (
          <Text variant="muted">Nothing matches. Try fewer words, or fewer filters.</Text>
        ) : (
          visible.map((entry) => (
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
          ))
        )}
      </View>

      <View className="flex-row flex-wrap items-center gap-md">
        <Text variant="muted">
          {loading
            ? "Reading your objects…"
            : `Showing ${visible.length} of ${filtered.length}${filtering ? ` matching objects, from ${items.length}` : " objects"}`}
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
