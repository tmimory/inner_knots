import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { OBJECT_ICON_IDS } from "@/components/icons/objects";
import {
  Button,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  Separator,
  Text,
  Textarea,
} from "@/components/ui";
import { describeApiError } from "@/lib/client/errors";
import { usePendingDelete } from "@/lib/client/use-pending-delete";
import {
  TROLLEY_OBJECT_LIMITS,
  type TrolleyObjectInput,
} from "@/lib/domain/trolley-object";
import type { TrolleyObject } from "@/lib/puzzles/trolley/catalogue";
import { isSlug, slugify } from "@/lib/puzzles/trolley/search";
import { cn } from "@/lib/utils";

import { ObjectGlyph } from "./object-glyph";

/** The glyph the form starts on. */
const DEFAULT_ICON = "person";

/** How many tags an object may carry, from the domain schema. */
const MAX_TAGS = TROLLEY_OBJECT_LIMITS.maxTags;

/** How tall the noun-phrase box starts: enough for a clause, not for a paragraph. */
const PROMPT_ROWS = 3;

type Draft = {
  id: string;
  label: string;
  prompt: string;
  icon: string;
  tags: string;
  /** True once the id has been typed into, so it stops following the label. */
  idTouched: boolean;
};

const EMPTY: Draft = { id: "", label: "", prompt: "", icon: DEFAULT_ICON, tags: "", idTouched: false };

/** Comma-separated tags, slugged, de-duplicated and capped. */
function parseTags(text: string): string[] {
  const tags = text
    .split(",")
    .map((tag) => slugify(tag))
    .filter((tag) => tag !== "");
  return [...new Set(tags)].slice(0, MAX_TAGS);
}

/** The first thing wrong with the draft, or `null` when it is ready to save. */
function problemWith(draft: Draft, taken: (id: string) => boolean): string | null {
  if (draft.label.trim() === "") return "Give it a label.";
  if (draft.prompt.trim() === "") return "Write the noun phrase the model will read.";
  if (!isSlug(draft.id)) {
    return "The identifier must be lowercase letters, digits and dashes, with no spaces.";
  }
  if (draft.id.length > TROLLEY_OBJECT_LIMITS.id) return "The identifier is too long.";
  if (draft.label.length > TROLLEY_OBJECT_LIMITS.label) return "The label is too long.";
  if (taken(draft.id)) return `"${draft.id}" is already in the catalogue.`;
  return null;
}

/** The whole glyph set, as a picker. */
function GlyphPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  return (
    <View className="flex-row flex-wrap gap-xs">
      {OBJECT_ICON_IDS.map((id) => {
        const selected = id === value;
        return (
          <Pressable
            key={id}
            role="radio"
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={id}
            onPress={() => onChange(id)}
            className={cn(
              "h-control-lg w-control-lg items-center justify-center rounded-md border-hairline transition-colors duration-fast",
              selected ? "border-thick border-ring bg-muted" : "border-border web:hover:bg-muted",
            )}
          >
            <ObjectGlyph icon={id} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** The user's own objects, with the way to take one back out of the catalogue. */
function ManageList({
  custom,
  onRemove,
  busyId,
}: {
  custom: readonly TrolleyObject[];
  onRemove: (item: TrolleyObject) => void;
  busyId: string | null;
}) {
  if (custom.length === 0) {
    return <Text variant="muted">You have not made any objects yet.</Text>;
  }
  return (
    <View className="gap-xs">
      {custom.map((item) => {
        return (
          <View key={item.id} className="flex-row items-center gap-sm rounded-md p-xs">
            <ObjectGlyph icon={item.icon} />
            <View className="flex-1">
              <Text variant="small" numberOfLines={1}>
                {item.label}
              </Text>
              <Text variant="muted" numberOfLines={1} className="text-xs">
                {item.prompt}
              </Text>
            </View>
            <Button
              variant="ghost"
              size="sm"
              disabled={busyId === item.id}
              accessibilityLabel={`Delete ${item.label}`}
              onPress={() => onRemove(item)}
            >
              <Text className="text-destructive">Delete</Text>
            </Button>
          </View>
        );
      })}
    </View>
  );
}

export type ObjectCreatorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The user's own objects, for the manage list. */
  custom: readonly TrolleyObject[];
  /** True when an id is already used, by a custom object or a built-in. */
  taken: (id: string) => boolean;
  create: (input: TrolleyObjectInput) => Promise<unknown>;
  remove: (id: string) => Promise<void>;
};

/**
 * Making something the catalogue does not already have.
 *
 * `prompt` is the only field the model ever sees — it is spliced into the track
 * description as a noun phrase — so the form says so plainly rather than leaving
 * the user to discover it from a preview.
 */
export function ObjectCreator({
  open,
  onOpenChange,
  custom,
  taken,
  create,
  remove,
}: ObjectCreatorProps) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const dropping = usePendingDelete<TrolleyObject>();
  const [error, setError] = useState<string | null>(null);

  /** Closing puts the form back to blank; the dialog is not a draft store. */
  const setOpen = useCallback(
    (next: boolean) => {
      if (!next) {
        setDraft(EMPTY);
        setError(null);
      }
      onOpenChange(next);
    },
    [onOpenChange],
  );

  const patch = useCallback((changes: Partial<Draft>) => {
    setDraft((current) => {
      const next = { ...current, ...changes };
      // The id follows the label until someone types their own.
      if (changes.label !== undefined && !next.idTouched) next.id = slugify(changes.label);
      return next;
    });
  }, []);

  const problem = useMemo(() => problemWith(draft, taken), [draft, taken]);
  const tags = useMemo(() => parseTags(draft.tags), [draft.tags]);

  async function save() {
    if (problem !== null) return;
    setSaving(true);
    setError(null);
    try {
      await create({
        id: draft.id,
        label: draft.label.trim(),
        prompt: draft.prompt.trim(),
        icon: draft.icon,
        builtIn: false,
        tags,
      });
      setDraft(EMPTY);
    } catch (caught) {
      setError(describeApiError(caught));
    } finally {
      setSaving(false);
    }
  }

  async function drop(id: string) {
    setRemoving(id);
    setError(null);
    try {
      await remove(id);
    } catch (caught) {
      setError(describeApiError(caught));
    } finally {
      setRemoving(null);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-full w-full max-w-content">
          <DialogHeader>
            <DialogTitle>Make an object</DialogTitle>
            <DialogDescription>
              Anything you make joins the palette and can be put on a track like any other.
            </DialogDescription>
          </DialogHeader>
          <Separator />

          <ScrollView className="flex-1" contentContainerClassName="gap-lg pb-md">
            <Field label="Glyph">
              <GlyphPicker value={draft.icon} onChange={(icon) => patch({ icon })} />
            </Field>

            <Field label="Label">
              <Input
                value={draft.label}
                maxLength={TROLLEY_OBJECT_LIMITS.label}
                onChangeText={(label) => patch({ label })}
                placeholder="What the palette calls it"
              />
            </Field>

            <Field
              label="Identifier"
              hint="Derived from the label until you change it. It is how a saved run refers back to this object."
            >
              <Input
                value={draft.id}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={TROLLEY_OBJECT_LIMITS.id}
                onChangeText={(id) => patch({ id: slugify(id), idTouched: true })}
                placeholder="lowercase-with-dashes"
                className="font-mono"
              />
            </Field>

            <Field
              label="Prompt"
              hint="The noun phrase as it will appear in the prompt, e.g. “your neighbor’s eldest daughter”. It is spliced into the sentence describing the track."
            >
              <Textarea
                value={draft.prompt}
                rows={PROMPT_ROWS}
                maxLength={TROLLEY_OBJECT_LIMITS.prompt}
                onChangeText={(prompt) => patch({ prompt })}
                placeholder="your neighbor's eldest daughter"
              />
            </Field>

            <Field label="Tags">
              <Input
                value={draft.tags}
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={(text) => patch({ tags: text })}
                placeholder="comma, separated, optional"
              />
              <View className="flex-row flex-wrap items-center gap-xs">
                {tags.map((tag) => (
                  <View
                    key={tag}
                    className="rounded-full border-hairline border-border px-sm py-xxs"
                  >
                    <Text variant="muted" className="text-xs">
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            </Field>

            {error ? <Text className="text-destructive">{error}</Text> : null}
            {problem && draft.label !== "" ? <Text variant="muted">{problem}</Text> : null}

            <Separator />

            <View className="gap-xs">
              <Text variant="h4">Your objects</Text>
              <ManageList custom={custom} onRemove={dropping.request} busyId={removing} />
            </View>
          </ScrollView>

          <DialogFooter>
            <Button variant="outline" onPress={() => setOpen(false)}>
              <Text>Done</Text>
            </Button>
            <Button disabled={problem !== null || saving} onPress={() => void save()}>
              <Text>{saving ? "Saving…" : "Save object"}</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={dropping.open}
        onOpenChange={dropping.onOpenChange}
        title="Delete this object?"
        description={
          dropping.target
            ? `“${dropping.target.label}” leaves the palette. Runs that already put it on a track keep their own copy of it.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Keep it"
        destructive
        loading={removing !== null}
        onConfirm={() => dropping.confirm((target) => void drop(target.id))}
      />
    </>
  );
}
