import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { issueBadge } from "@/components/puzzles/adventure";
import { Screen } from "@/components/shell";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Text,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";
import { describeApiError } from "@/lib/client/errors";
import { useAdventures } from "@/lib/client/use-adventures";
import { usePendingDelete } from "@/lib/client/use-pending-delete";
import { validateAdventure, type Adventure } from "@/lib/domain/adventure";
import { formatRelative, formatStamp, pluralize } from "@/lib/format";
import { starterAdventure } from "@/lib/puzzles/adventure/edits";

/**
 * One saved tree as a row: the title is the way in, Run sits beside it, and the
 * rarer actions wait behind the overflow so the shelf reads as a list rather
 * than a wall of buttons.
 *
 * The title is set in the reading ink, not the rubric red. Three things on this
 * page were claiming the accent — the page title, every row title and the one
 * primary button — and an accent three things share is not an accent. What the
 * row title keeps is the underline it grows under the cursor.
 */
function AdventureRow({
  adventure,
  busy,
  onOpen,
  onRun,
  onDuplicate,
  onDelete,
}: {
  adventure: Adventure;
  busy: boolean;
  onOpen: () => void;
  onRun: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const badge = issueBadge(validateAdventure(adventure));
  const meta = `${badge.label} · ${pluralize(adventure.nodes.length, "node")} · edited ${formatRelative(adventure.updatedAt)}`;

  return (
    // The row is the hover surface, but only the words are the way in: a Run
    // button inside a pressable row is a click that means two things at once.
    <View className="flex-row items-center gap-sm border-b-hairline border-border transition-colors duration-fast web:hover:bg-muted/subtle">
      <View className="flex-1 gap-xxs py-md">
        <Pressable
          role="link"
          accessibilityLabel={`Open ${adventure.name}`}
          className="self-start"
          onPress={onOpen}
        >
          <Text
            className="font-bodyMedium text-base text-foreground web:hover:underline"
            numberOfLines={1}
          >
            {adventure.name}
          </Text>
        </Pressable>

        {/* "edited 2h ago" answers the question a list is actually asked. The
            instant itself is still worth having, so it waits under the cursor. */}
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Pressable className="self-start" accessibilityLabel={meta}>
              <Text variant="meta" numberOfLines={1}>
                {meta}
              </Text>
            </Pressable>
          </TooltipTrigger>
          <TooltipContent>
            <Text>{`Edited ${formatStamp(adventure.updatedAt)}`}</Text>
          </TooltipContent>
        </Tooltip>
      </View>

      {showActions ? (
        <>
          <Button variant="ghost" size="sm" disabled={busy} onPress={onDuplicate}>
            <Text>Duplicate</Text>
          </Button>
          <Button variant="destructive" size="sm" disabled={busy} onPress={onDelete}>
            <Text>Delete</Text>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            accessibilityLabel="Hide actions"
            onPress={() => setShowActions(false)}
          >
            <Text>×</Text>
          </Button>
        </>
      ) : (
        <>
          <Button size="sm" onPress={onRun}>
            <Text>Run</Text>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            accessibilityLabel={`More for ${adventure.name}`}
            onPress={() => setShowActions(true)}
          >
            <Text>…</Text>
          </Button>
        </>
      )}
    </View>
  );
}

/**
 * The floor of the list: a dashed rule and the next thing to do.
 *
 * A list that simply stops has no bottom edge, and a page whose content trails
 * off into parchment reads as half-loaded. The row is deliberately quiet — the
 * filled button in the header is still the one primary action — but it closes
 * the ledger and repeats the offer where the reader's eye has ended up.
 */
function NewAdventureRow({ busy, onPress }: { busy: boolean; onPress: () => void }) {
  return (
    <Pressable
      role="button"
      disabled={busy}
      accessibilityLabel="New adventure"
      className="flex-row items-center gap-sm border-b-hairline border-dashed border-border py-md transition-colors duration-fast web:hover:bg-muted/subtle"
      onPress={onPress}
    >
      <Text variant="meta">+ New adventure</Text>
    </Pressable>
  );
}

export default function AdventureListScreen() {
  const router = useRouter();
  const { adventures, loading, error, create, duplicate, remove } = useAdventures();

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const deleting = usePendingDelete<Adventure>();

  function openBuilder(id: string) {
    router.push({ pathname: "/puzzles/adventure/[id]", params: { id } });
  }

  async function act(work: () => Promise<void>) {
    setBusy(true);
    setActionError(null);
    try {
      await work();
    } catch (caught) {
      setActionError(describeApiError(caught));
    } finally {
      setBusy(false);
    }
  }

  function startNew() {
    void act(async () => {
      const created = await create(starterAdventure());
      openBuilder(created.id);
    });
  }

  const empty = !loading && adventures.length === 0 && error === null;

  return (
    <Screen
      title="Adventures"
      subtitle="ὁδός — branching paths, recorded"
      right={
        <Button disabled={busy} onPress={startNew}>
          <Text>New adventure</Text>
        </Button>
      }
    >
      {error ? (
        <Text variant="small" className="text-destructive">
          The shelf would not open: {error}
        </Text>
      ) : null}

      {actionError ? (
        <Text variant="small" className="text-destructive">
          {actionError}
        </Text>
      ) : null}

      {empty ? (
        <EmptyState
          title="No adventures yet"
          body="An adventure is a tree of decisions: write the first question, give it two ways on, and watch which way the roster turns."
          action={{ label: "New adventure", onPress: startNew }}
        />
      ) : null}

      {loading && adventures.length === 0 ? <Text variant="meta">Reading the shelf…</Text> : null}

      {adventures.length > 0 ? (
        <View className="border-t-hairline border-border">
          {adventures.map((adventure) => (
            <AdventureRow
              key={adventure.id}
              adventure={adventure}
              busy={busy}
              onOpen={() => openBuilder(adventure.id)}
              onRun={() =>
                router.push({
                  pathname: "/puzzles/adventure/[id]/run",
                  params: { id: adventure.id },
                })
              }
              onDuplicate={() =>
                void act(async () => {
                  await duplicate(adventure);
                })
              }
              onDelete={() => deleting.request(adventure)}
            />
          ))}
          <NewAdventureRow busy={busy} onPress={startNew} />
        </View>
      ) : null}

      <ConfirmDialog
        open={deleting.open}
        onOpenChange={deleting.onOpenChange}
        title="Delete this adventure?"
        description={
          deleting.target
            ? `“${deleting.target.name}” and its ${deleting.target.nodes.length} nodes go for good. Runs already recorded keep their own copy of the configuration.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Keep it"
        destructive
        loading={busy}
        onConfirm={() => deleting.confirm((target) => void act(() => remove(target.id)))}
      />
    </Screen>
  );
}
