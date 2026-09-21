import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui";
import type { Character } from "@/lib/domain/character";
import type { PuzzleId } from "@/lib/domain/run";
import type { Span } from "@/lib/domain/span";
import { formatElapsed, truncate } from "@/lib/format";
import { cn } from "@/lib/utils";

import { CharacterFace, nameOf } from "./roster-avatars";
import { readModel } from "./span-input";
import { StatusDot } from "./status-mark";

/** How much of a model id a row shows before it starts to crowd the timings. */
const MODEL_CHARS = 28;

/** Rows deeper than this start collapsed; a long run would otherwise open flat. */
const DEFAULT_OPEN_DEPTH = 2;

export type SpanNode = { span: Span; children: SpanNode[] };

/**
 * The stored spans as the tree their `parentSpanId`s describe. A span whose
 * parent is missing (a truncated file, a run still being written) becomes a root
 * rather than disappearing.
 */
export function buildSpanTree(spans: readonly Span[]): SpanNode[] {
  const nodes = new Map<string, SpanNode>();
  for (const span of spans) nodes.set(span.spanId, { span, children: [] });

  const roots: SpanNode[] = [];
  for (const node of nodes.values()) {
    const parentId = node.span.parentSpanId;
    const parent = parentId === undefined ? undefined : nodes.get(parentId);
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const byStart = (a: SpanNode, b: SpanNode): number =>
    a.span.startedAt.localeCompare(b.span.startedAt);
  for (const node of nodes.values()) node.children.sort(byStart);
  roots.sort(byStart);
  return roots;
}

/** Every span id in the tree, for expand-all. */
function allIds(nodes: readonly SpanNode[]): string[] {
  return nodes.flatMap((node) => [node.span.spanId, ...allIds(node.children)]);
}

/**
 * How deep each span sits, which is what tells a dilemma's game from its round.
 * The detail pane needs it for a span it was handed on its own.
 */
export function spanDepths(spans: readonly Span[]): ReadonlyMap<string, number> {
  const depths = new Map<string, number>();
  const walk = (nodes: readonly SpanNode[], depth: number): void => {
    for (const node of nodes) {
      depths.set(node.span.spanId, depth);
      walk(node.children, depth + 1);
    }
  };
  walk(buildSpanTree(spans), 0);
  return depths;
}

/**
 * What a row is called. The engine names both levels of a dilemma "iteration",
 * because a game and a round are the same kind of nesting to it; the reader is
 * better served by the puzzle's own words.
 */
export function spanLabel(span: Span, puzzle: PuzzleId | undefined, depth: number): string {
  switch (span.name) {
    case "run":
      return "run";
    case "character":
      return "character";
    case "node":
      return span.nodeId ?? "node";
    case "provider-call":
      return "provider call";
    case "iteration":
      if (puzzle === "prisoners-dilemma") return depth <= 1 ? "game" : "round";
      return "iteration";
  }
}

/** The number or id that tells one sibling row from the next. */
function spanDetail(span: Span): string | undefined {
  if (span.name === "provider-call") {
    const model = readModel(span.input);
    return model === undefined ? undefined : truncate(model, MODEL_CHARS);
  }
  if (span.name === "node") return span.iteration === undefined ? undefined : `#${span.iteration}`;
  if (span.iteration !== undefined) return `#${span.iteration}`;
  return undefined;
}

type RowProps = {
  node: SpanNode;
  depth: number;
  puzzle?: PuzzleId;
  characters: ReadonlyMap<string, Character>;
  selectedId?: string;
  onSelect: (spanId: string) => void;
  expanded: ReadonlySet<string>;
  onToggle: (spanId: string) => void;
};

function SpanRow({
  node,
  depth,
  puzzle,
  characters,
  selectedId,
  onSelect,
  expanded,
  onToggle,
}: RowProps) {
  const { span, children } = node;
  const open = expanded.has(span.spanId);
  const selected = selectedId === span.spanId;
  const detail = spanDetail(span);

  return (
    <View className="gap-xxs">
      <View className="flex-row items-center gap-xs">
        {children.length > 0 ? (
          <Pressable
            role="button"
            aria-expanded={open}
            accessibilityLabel={open ? "Collapse" : "Expand"}
            onPress={() => onToggle(span.spanId)}
            className="h-control-sm w-lg items-center justify-center"
          >
            <Text variant="muted" className="font-mono text-xs">
              {open ? "▾" : "▸"}
            </Text>
          </Pressable>
        ) : (
          <View className="h-control-sm w-lg" />
        )}

        <Pressable
          role="button"
          aria-selected={selected}
          onPress={() => onSelect(span.spanId)}
          className={cn(
            "h-control-sm flex-1 flex-row items-center gap-sm rounded-md px-sm transition-colors duration-fast",
            selected ? "bg-muted" : "bg-transparent web:hover:bg-muted/subtle",
          )}
        >
          <StatusDot status={span.status} />
          {span.characterId ? (
            <CharacterFace character={characters.get(span.characterId)} size="sm" />
          ) : null}
          <Text variant="small" className="font-display">
            {spanLabel(span, puzzle, depth)}
          </Text>
          {span.characterId && span.name === "character" ? (
            <Text variant="small">{nameOf(span.characterId, characters)}</Text>
          ) : null}
          {detail ? (
            <Text variant="muted" className="font-mono text-xs">
              {detail}
            </Text>
          ) : null}
          {span.decision ? (
            <Text variant="muted" className="text-xs">
              → {span.decision.choice}
            </Text>
          ) : null}
          <View className="flex-1" />
          <Text variant="muted" className="font-mono text-xs">
            {formatElapsed(span.startedAt, span.endedAt)}
          </Text>
        </Pressable>
      </View>

      {open && children.length > 0 ? (
        <View className="ml-lg gap-xxs border-l-hairline border-border pl-xs">
          {children.map((child) => (
            <SpanRow
              key={child.span.spanId}
              node={child}
              depth={depth + 1}
              puzzle={puzzle}
              characters={characters}
              selectedId={selectedId}
              onSelect={onSelect}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export type SpanTreeProps = {
  spans: readonly Span[];
  puzzle?: PuzzleId;
  characters: ReadonlyMap<string, Character>;
  selectedId?: string;
  onSelect: (spanId: string) => void;
};

/** The run's work as a tree: run → character → iteration or node → provider call. */
export function SpanTree({ spans, puzzle, characters, selectedId, onSelect }: SpanTreeProps) {
  const roots = useMemo(() => buildSpanTree(spans), [spans]);
  const defaults = useMemo(() => {
    const open = new Set<string>();
    const walk = (nodes: readonly SpanNode[], depth: number): void => {
      for (const node of nodes) {
        if (depth < DEFAULT_OPEN_DEPTH) open.add(node.span.spanId);
        walk(node.children, depth + 1);
      }
    };
    walk(roots, 0);
    return open;
  }, [roots]);

  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());
  const expanded = useMemo(() => {
    const open = new Set(defaults);
    for (const [spanId, value] of overrides) {
      if (value) open.add(spanId);
      else open.delete(spanId);
    }
    return open;
  }, [defaults, overrides]);

  function toggle(spanId: string): void {
    setOverrides((current) => {
      const next = new Map(current);
      next.set(spanId, !expanded.has(spanId));
      return next;
    });
  }

  function setAll(open: boolean): void {
    setOverrides(new Map(allIds(roots).map((spanId) => [spanId, open])));
  }

  if (roots.length === 0) {
    return <Text variant="muted">No spans were written for this run.</Text>;
  }

  return (
    <View className="gap-sm">
      <View className="flex-row items-center gap-md">
        <Pressable role="button" onPress={() => setAll(true)}>
          <Text variant="muted" className="text-xs">
            expand all
          </Text>
        </Pressable>
        <Pressable role="button" onPress={() => setAll(false)}>
          <Text variant="muted" className="text-xs">
            collapse all
          </Text>
        </Pressable>
      </View>
      <View className="gap-xxs">
        {roots.map((node) => (
          <SpanRow
            key={node.span.spanId}
            node={node}
            depth={0}
            puzzle={puzzle}
            characters={characters}
            selectedId={selectedId}
            onSelect={onSelect}
            expanded={expanded}
            onToggle={toggle}
          />
        ))}
      </View>
    </View>
  );
}
