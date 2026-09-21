import { useState } from "react";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui";
import { pluralize, truncate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Beyond this a string is shown shortened until the reader asks for the rest. */
const STRING_PREVIEW = 280;

/** How deep the tree opens itself before the reader has to click. */
const DEFAULT_OPEN_DEPTH = 1;

type Branch = { entries: [string, unknown][]; open: string; close: string };

/** An object or an array as the rows it should render, or `undefined` for a leaf. */
function branchOf(value: unknown): Branch | undefined {
  if (Array.isArray(value)) {
    return { entries: value.map((item, index) => [String(index), item]), open: "[", close: "]" };
  }
  if (value !== null && typeof value === "object") {
    return { entries: Object.entries(value as Record<string, unknown>), open: "{", close: "}" };
  }
  return undefined;
}

/** `{ 4 keys }` / `[ 12 ]` — what a collapsed branch says about itself. */
function summaryOf(branch: Branch): string {
  const count = branch.entries.length;
  if (branch.open === "[") return `[ ${count} ]`;
  return `{ ${pluralize(count, "key")} }`;
}

/** A primitive as source text: strings quoted, everything else as JSON writes it. */
function primitiveText(value: unknown): string {
  if (typeof value === "string") return `"${value}"`;
  return String(value);
}

/** A string leaf, shortened until pressed. */
function JsonString({ name, value }: { name: string; value: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = value.length > STRING_PREVIEW;
  const shown = expanded || !long ? value : truncate(value, STRING_PREVIEW);

  return (
    <Pressable
      role={long ? "button" : undefined}
      disabled={!long}
      onPress={() => setExpanded((current) => !current)}
    >
      <Text variant="code" className="text-xs" selectable>
        <Text variant="code" className="text-xs text-muted-foreground">{`${name}: `}</Text>
        {`"${shown}"`}
        {long ? (
          <Text variant="code" className="text-xs text-primary">
            {expanded ? "  ▴ less" : "  ▾ more"}
          </Text>
        ) : null}
      </Text>
    </Pressable>
  );
}

type JsonNodeProps = {
  name: string;
  value: unknown;
  depth: number;
  openDepth: number;
};

function JsonNode({ name, value, depth, openDepth }: JsonNodeProps) {
  const branch = branchOf(value);
  const [open, setOpen] = useState(depth < openDepth);

  if (!branch) {
    if (typeof value === "string") return <JsonString name={name} value={value} />;
    return (
      <Text variant="code" className="text-xs" selectable>
        <Text variant="code" className="text-xs text-muted-foreground">{`${name}: `}</Text>
        {primitiveText(value)}
      </Text>
    );
  }

  return (
    <View className="gap-xxs">
      <Pressable
        role="button"
        aria-expanded={open}
        onPress={() => setOpen((current) => !current)}
        className="flex-row items-center gap-xs"
      >
        <Text variant="code" className="text-xs text-muted-foreground">
          {open ? "▾" : "▸"}
        </Text>
        <Text variant="code" className="text-xs">
          {name}
        </Text>
        <Text variant="code" className="text-xs text-muted-foreground">
          {summaryOf(branch)}
        </Text>
      </Pressable>

      {open && branch.entries.length > 0 ? (
        <View className="ml-xs gap-xxs border-l-hairline border-border pl-sm">
          {branch.entries.map(([key, child]) => (
            <JsonNode key={key} name={key} value={child} depth={depth + 1} openDepth={openDepth} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export type JsonTreeProps = {
  value: unknown;
  /** The name of the root row. */
  label?: string;
  /** Rows nested deeper than this start collapsed. */
  openDepth?: number;
  className?: string;
};

/**
 * A collapsible view of any JSON value. Everything the app cannot read in a
 * purpose-built way — an unrecognized summary, a provider's raw response —
 * still reaches the reader through this, in full and unmodified.
 */
export function JsonTree({
  value,
  label = "value",
  openDepth = DEFAULT_OPEN_DEPTH,
  className,
}: JsonTreeProps) {
  return (
    <View className={cn("rounded-md border-hairline border-border bg-muted p-md", className)}>
      <JsonNode name={label} value={value} depth={0} openDepth={openDepth} />
    </View>
  );
}
