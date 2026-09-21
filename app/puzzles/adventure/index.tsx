import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { issueBadge } from "@/components/puzzles/adventure";
import { Screen } from "@/components/shell";
import { Button, ConfirmDialog, Text } from "@/components/ui";
import { describeApiError } from "@/lib/client/errors";
import { useAdventures } from "@/lib/client/use-adventures";
import { usePendingDelete } from "@/lib/client/use-pending-delete";
import { validateAdventure, type Adventure } from "@/lib/domain/adventure";
import { formatStamp, pluralize } from "@/lib/format";
import { starterAdventure } from "@/lib/puzzles/adventure/edits";

/**
 * One saved tree as a row: the title is the way in, Run sits beside it, and the
 * rarer actions wait behind the overflow so the shelf reads as a list rather
 * than a wall of buttons.
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

  return (
    // The row is the hover surface, but only the words are the way in: a Run
    // button inside a pressable row is a click that means two things at once.
    <View className="flex-row items-center gap-sm border-b-hairline border-border transition-colors duration-fast web:hover:bg-muted/subtle">
      <Pressable
        role="link"
        accessibilityLabel={`Open ${adventure.name}`}
        className="flex-1 gap-xxs py-md"
        onPress={onOpen}
      >
        <Text className="font-bodyMedium text-base text-primary" numberOfLines={1}>
          {adventure.name}
        </Text>
        <Text variant="meta" numberOfLines={1}>
          {`${badge.label} · ${pluralize(adventure.nodes.length, "node")} · edited ${formatStamp(adventure.updatedAt)}`}
        </Text>
      </Pressable>

      {showActions ? (
        <>
          <Button variant="ghost" size="sm" disabled={busy} onPress={onDuplicate}>
            <Text>Duplicate</Text>
          </Button>
          <Button variant="destructive" size="sm" disabled={busy} onPress={onDelete}>
            <Text>Delete</Text>
          </Button>
          <Button
            variant="outline"
            size="sm"
            accessibilityLabel="Hide actions"
            onPress={() => setShowActions(false)}
          >
            <Text>×</Text>
          </Button>
        </>
      ) : (
        <>
          <Button variant="outline" size="sm" onPress={onRun}>
            <Text>Run</Text>
          </Button>
          <Button
            variant="outline"
            size="sm"
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

  return (
    <Screen
      title="Choose Your Own Adventure"
      subtitle="ὁδός · branching paths, recorded"
      width="reading"
      right={
        <Button
          disabled={busy}
          onPress={() =>
            void act(async () => {
              const created = await create(starterAdventure());
              openBuilder(created.id);
            })
          }
        >
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

      {!loading && adventures.length === 0 && error === null ? (
        <Text variant="lead">
          Nothing branches here yet. Start a tree, write the first question, and see which way the
          roster turns.
        </Text>
      ) : null}

      {adventures.length > 0 || loading ? (
        <View className="gap-sm">
          {/* The list's caption, not the button's: a count belongs to the thing
              it counts, under the heading and over the rules. */}
          <Text variant="meta">
            {loading ? "Reading the shelf…" : `${adventures.length} on the shelf`}
          </Text>
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
          </View>
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
