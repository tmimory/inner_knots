import type { ReactNode } from "react";
import { View } from "react-native";

import { Badge, Separator, Text } from "@/components/ui";
import type { Character } from "@/lib/domain/character";
import type { PuzzleId } from "@/lib/domain/run";
import type { Span } from "@/lib/domain/span";
import { formatElapsed, formatTime } from "@/lib/format";

import { DecisionView } from "./decision-view";
import { JsonTree } from "./json-tree";
import { nameOf } from "./roster-avatars";
import { readModel, SpanInputView } from "./span-input";
import { spanLabel } from "./span-tree";
import { StatusDot } from "./status-badge";

/** A titled section, so every part of the pane is introduced the same way. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-sm">
      <Text variant="h4" className="text-base">
        {title}
      </Text>
      {children}
    </View>
  );
}

export type SpanDetailProps = {
  span?: Span;
  puzzle?: PuzzleId;
  depth?: number;
  characters: ReadonlyMap<string, Character>;
};

/**
 * Everything one unit of work did, in full: the request as the model received
 * it, the raw response as it came back, the normalized decision, and the error
 * when there was one. Nothing here is summarized — this is the page a
 * researcher opens to check what was actually asked.
 */
export function SpanDetail({ span, puzzle, depth = 0, characters }: SpanDetailProps) {
  if (!span) {
    return (
      <Text variant="muted">
        Select a span on the left to read the exact request it sent and the answer it received.
      </Text>
    );
  }

  const model = readModel(span.input);

  return (
    <View className="gap-lg">
      <View className="gap-sm">
        <View className="flex-row flex-wrap items-center gap-sm">
          <StatusDot status={span.status} />
          <Text variant="h4" className="text-base">
            {spanLabel(span, puzzle, depth)}
          </Text>
          {span.characterId ? (
            <Badge variant="outline">
              <Text>{nameOf(span.characterId, characters)}</Text>
            </Badge>
          ) : null}
          {span.iteration === undefined ? null : (
            <Badge variant="outline">
              <Text>#{span.iteration}</Text>
            </Badge>
          )}
          {span.nodeId ? (
            <Badge variant="outline">
              <Text>{span.nodeId}</Text>
            </Badge>
          ) : null}
          {model ? (
            <Badge variant="muted">
              <Text>{model}</Text>
            </Badge>
          ) : null}
        </View>
        <Text variant="muted" className="font-mono text-xs">
          {formatTime(span.startedAt)}
          {span.endedAt ? ` → ${formatTime(span.endedAt)}` : " → still running"} ·{" "}
          {formatElapsed(span.startedAt, span.endedAt)} · {span.spanId}
        </Text>
      </View>

      {span.error ? (
        <View className="rounded-md border-hairline border-destructive bg-muted p-md">
          <Text variant="code" className="text-destructive" selectable>
            {span.error}
          </Text>
        </View>
      ) : null}

      {span.decision ? (
        <>
          <Separator />
          <Section title="Decision">
            <DecisionView decision={span.decision} />
          </Section>
        </>
      ) : null}

      {span.input === undefined ? null : (
        <>
          <Separator />
          <Section title="Request">
            <SpanInputView input={span.input} />
          </Section>
        </>
      )}

      {span.output === undefined ? null : (
        <>
          <Separator />
          <Section title="Raw response">
            <JsonTree value={span.output} label="output" openDepth={2} />
          </Section>
        </>
      )}

      {span.input === undefined && span.output === undefined && !span.decision ? (
        <Text variant="muted">
          This span groups the work below it; the requests are on its provider-call children.
        </Text>
      ) : null}
    </View>
  );
}
