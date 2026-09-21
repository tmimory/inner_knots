import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { issueBadge } from "@/components/puzzles/adventure";
import { GreekKey, PageHeader, Scroll } from "@/components/shell";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Text,
} from "@/components/ui";
import { describeApiError } from "@/lib/client/errors";
import { useAdventures } from "@/lib/client/use-adventures";
import { validateAdventure, type Adventure } from "@/lib/domain/adventure";
import { formatDateTime } from "@/lib/format";
import { starterAdventure } from "@/lib/puzzles/adventure/edits";

/** How wide the meander under the title is drawn. */
const ORNAMENT_REPEATS = 24;

/** One saved tree: what it is called, how big it is, and whether it would run. */
function AdventureCard({
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
  const badge = issueBadge(validateAdventure(adventure));
  const nodes = adventure.nodes.length;

  return (
    <Card className="min-w-menu flex-1">
      <CardHeader>
        <View className="flex-row items-start justify-between gap-md">
          <CardTitle numberOfLines={2} className="flex-1">
            {adventure.name}
          </CardTitle>
          <Badge variant={badge.variant}>
            <Text>{badge.label}</Text>
          </Badge>
        </View>
        <Text variant="muted">
          {`${nodes} ${nodes === 1 ? "node" : "nodes"} · edited ${formatDateTime(adventure.updatedAt)}`}
        </Text>
      </CardHeader>
      <CardContent className="flex-row flex-wrap gap-sm">
        <Button size="sm" onPress={onOpen}>
          <Text>Open</Text>
        </Button>
        <Button variant="secondary" size="sm" onPress={onRun}>
          <Text>Run</Text>
        </Button>
        <Button variant="outline" size="sm" disabled={busy} onPress={onDuplicate}>
          <Text>Duplicate</Text>
        </Button>
        <Button variant="ghost" size="sm" disabled={busy} onPress={onDelete}>
          <Text className="text-destructive">Delete</Text>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AdventureListScreen() {
  const router = useRouter();
  const { adventures, loading, error, create, duplicate, remove } = useAdventures();

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Adventure | null>(null);

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
    <View className="gap-lg">
      <PageHeader
        title="Choose Your Own Adventure"
        subtitle="ὁδός · branching paths, recorded"
        right={
          <>
            <Badge variant={loading ? "muted" : "secondary"}>
              <Text>
                {loading ? "reading the shelf…" : `${adventures.length} on the shelf`}
              </Text>
            </Badge>
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
          </>
        }
      />
      <GreekKey repeats={ORNAMENT_REPEATS} tone="border" />

      {error ? (
        <Scroll ornament={false}>
          <Text variant="h3">The shelf would not open</Text>
          <Text variant="small" className="text-destructive">
            {error}
          </Text>
        </Scroll>
      ) : null}

      {actionError ? (
        <Text variant="small" className="text-destructive">
          {actionError}
        </Text>
      ) : null}

      {!loading && adventures.length === 0 && error === null ? (
        <Scroll>
          <Text variant="lead">
            Nothing branches here yet. Start a tree, write the first question, and see which way
            the roster turns.
          </Text>
        </Scroll>
      ) : null}

      <View className="flex-row flex-wrap gap-lg">
        {adventures.map((adventure) => (
          <AdventureCard
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
            onDelete={() => setDeleting(adventure)}
          />
        ))}
      </View>

      <Dialog open={deleting !== null} onOpenChange={(open) => setDeleting(open ? deleting : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this adventure?</DialogTitle>
          </DialogHeader>
          <Text variant="muted">
            {deleting
              ? `“${deleting.name}” and its ${deleting.nodes.length} nodes go for good. Runs already recorded keep their own copy of the configuration.`
              : ""}
          </Text>
          <DialogFooter>
            <Button variant="outline" onPress={() => setDeleting(null)}>
              <Text>Keep it</Text>
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onPress={() => {
                const target = deleting;
                setDeleting(null);
                if (target) void act(() => remove(target.id));
              }}
            >
              <Text>Delete</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
}
