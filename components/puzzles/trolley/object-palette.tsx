import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import { Badge, Button, Input, Text } from "@/components/ui";
import { familyOf, type TrolleyObject } from "@/lib/puzzles/trolley/catalogue";
import { CUSTOM_TAG, TAG_GROUPS, TAG_GROUP_ORDER, filterCatalogue } from "@/lib/puzzles/trolley/search";
import { cn } from "@/lib/utils";
import { useTheme } from "@/theme";

import { DraggableObject, type DragPoint } from "./draggable-object";
import { PALETTE, type TrackId } from "./geometry";

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
 * Switched on it takes the selection language the whole app uses — a tan fill and
 * the rubric red — so "which of these is on" is one glance, not twenty. Selected
 * filters are ANDed, so they narrow rather than widen. The word takes the badge's
 * own caption step, which is the size the tile labels under it are set at: a
 * filter row smaller than everything around it reads as fine print, not as a
 * control.
 */
function TagChip({
  label,
  selected,
  role,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  selected: boolean;
  role: "checkbox" | "button";
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      role={role}
      accessibilityState={role === "checkbox" ? { checked: selected, selected } : undefined}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className="rounded-sm transition-colors duration-fast web:hover:bg-muted/subtle"
    >
      <Badge
        variant={selected ? "selected" : "outline"}
        className={cn(!selected && "border-transparent")}
      >
        <Text>{label}</Text>
      </Badge>
    </Pressable>
  );
}

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
    <TagChip
      label={tag}
      selected={selected}
      role="checkbox"
      accessibilityLabel={`Filter by ${tag}`}
      onPress={onPress}
    />
  );
}

/**
 * The catalogue dealt round-robin across its four families.
 *
 * Built in grammar order the list opens with a hundred variations on one noun, so
 * the first two rows are a hundred near-identical names. Dealing person, animal,
 * thing, group in turn puts four different kinds in every row while keeping each
 * family's own order intact.
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
 * the filters are what make it usable; the flow opens at eighteen chips and grows
 * eighteen at a time. It is deliberately short — the board above is the thing the
 * screen is about, and a wall of four hundred chips was answering a question
 * nobody had asked yet.
 *
 * The chips are the ones that stand on the rails, wrapping left-aligned from the
 * same spine as everything else on the page. The old equal-column grid was a
 * centred table of bare words under a left-aligned board: one gesture, two
 * vocabularies, and a catalogue that looked nothing like the thing it filled.
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
  const [moreTags, setMoreTags] = useState(false);
  /** How many chips the flow is clipped to; "Show more" lets out another page. */
  const [shown, setShown] = useState<number>(PALETTE.pageSize);

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
  const visible = useMemo(() => ordered.slice(0, shown), [ordered, shown]);
  const more = filtered.length - visible.length;

  // A tag hidden behind "More" cannot be the one that is on: the moment one is
  // chosen the rest of the row comes out and stays out.
  const showRest = moreTags || REST_TAGS.some((tag) => tags.includes(tag));

  useEffect(() => {
    onArmedChange?.(menuFor !== null);
  }, [menuFor, onArmedChange]);

  const toggleTag = useCallback((tag: string) => {
    setShown(PALETTE.pageSize);
    setTags((current) =>
      current.includes(tag) ? current.filter((entry) => entry !== tag) : [...current, tag],
    );
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
      <View className="flex-row flex-wrap items-center gap-lg">
        <Input
          className="min-w-menu flex-1"
          value={query}
          onChangeText={(text) => {
            setShown(PALETTE.pageSize);
            setQuery(text);
          }}
          placeholder="Search the catalogue"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search objects"
        />
        {/*
          Every text action on this screen is one link in one colour — "View
          prompt" and "Show more" were red while these two were near-black, which
          made four identical-looking words into two unrelated kinds of thing.
        */}
        <View className="flex-row flex-wrap items-center gap-lg">
          <Button variant="link" size="sm" onPress={onRandomize}>
            <Text>Randomize</Text>
          </Button>
          <Button variant="link" size="sm" onPress={onCreate}>
            <Text>New object</Text>
          </Button>
        </View>
        {/*
          Emptying the board is not a third way of filling it, so it stands a full
          step of air away from the two that do — air rather than a rule, which was
          one more edge on a row that already had a field on it.
        */}
        <Button variant="destructive" size="sm" className="ml-sm" onPress={onClear}>
          <Text>Clear tracks</Text>
        </Button>
      </View>

      {/*
        Four families, six common tags, and the rest a word away. Pulled left by a
        chip's own padding so the first token's word starts on the page's spine
        rather than eight pixels inside it.
      */}
      <View className="-ml-sm flex-row flex-wrap items-center gap-xs">
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
        {/* The last chip in the row, in the row's own voice rather than a red link. */}
        {showRest ? null : (
          <TagChip
            label="more"
            selected={false}
            role="button"
            accessibilityLabel="Show the rest of the filters"
            onPress={() => setMoreTags(true)}
          />
        )}
      </View>

      {/*
        A left-aligned flow of the very chips that stand on the rails, wrapping
        from the spine like words. Nothing is centred and no cell is equalised:
        the catalogue is the board's own vocabulary waiting to be picked up.
      */}
      <View className="flex-row flex-wrap items-start gap-sm">
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
        <Text variant="meta">
          {loading
            ? "Reading your objects…"
            : `Showing ${visible.length} of ${filtered.length}${filtering ? ` matching objects, from ${items.length}` : " objects"}`}
        </Text>
        {more > 0 ? (
          <Button variant="link" size="sm" onPress={() => setShown(shown + PALETTE.pageSize)}>
            <Text>Show more</Text>
          </Button>
        ) : null}
        <View className="flex-1" />
        {filtering ? (
          <Button
            variant="link"
            size="sm"
            onPress={() => {
              setShown(PALETTE.pageSize);
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
