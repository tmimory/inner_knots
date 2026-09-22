import { useCallback, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";

import { ColorPicker, DEFAULT_AVATAR_SHAPE, ShapePicker } from "@/components/avatars";
import {
  Button,
  ConfirmDialog,
  Input,
  Segmented,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Text,
  Textarea,
  useToast,
  type SegmentedOption,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { testProvider } from "@/lib/client/providers";
import { describeApiError, isConflict } from "@/lib/client/errors";
import { useModels, useProviders } from "@/lib/client/use-providers";
import {
  CHARACTER_LIMITS,
  characterIdSchema,
  newId,
  OUTPUT_MODES,
  STEERING_MODES,
  type Character,
  type CharacterInput,
  type EffortLevel,
  type OutputMode,
  type ProviderId,
  type Steering,
  type SteeringMode,
} from "@/lib/domain";
import type { ModelInfo } from "@/lib/providers/types";
import { useTheme } from "@/theme";

import { ConvictionList } from "./conviction-list";
import { Field, FormSection } from "./field";
import { FinalPrompt } from "./final-prompt";
import { WarningGlyph } from "./glyphs";
import {
  OUTPUT_MODE_LABELS,
  PROVIDER_DEFAULT_EFFORT,
  STEERING_MODE_LABELS,
} from "./labels";

/** How many rows of the model list are visible before it scrolls. */
const VISIBLE_MODEL_ROWS = 8;

/** Select values are strings, so "no effort of its own" needs a sentinel. */
const NO_EFFORT = "default";

/** Server messages start lowercase; a message shown beside a label should not. */
function sentenceCase(text: string | null): string | null {
  if (text === null || text === "") return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * How full a capped field is, for the end of its label row.
 *
 * On the label row rather than under the control: a counter hung below a field is
 * the smallest type on the page, alone on a line of its own, and it pushes the
 * next label down by a row it did not need. Beside the label it is a fact about
 * the thing the label names, set in lining, fixed-width figures so the number
 * neither drops below the line nor shifts as it counts.
 */
function Counter({ value, max }: { value: number; max: number }) {
  return <Text variant="subtle" className="tabular">{`${value} / ${max}`}</Text>;
}

type Draft = {
  id: string;
  avatar: { shape: string; color: string };
  provider?: ProviderId;
  model: string;
  outputMode: OutputMode;
  effort?: EffortLevel;
  steering: Steering;
};

export type CharacterFormProps = {
  /** The character being edited. Absent when creating one. */
  character?: Character;
  /** Every character, for the identifier uniqueness check. */
  characters: readonly Character[];
  /** Persists the draft. Throws to report a rejection; the form shows it. */
  onSave: (input: CharacterInput) => Promise<void>;
  /** Absent for a new character. */
  onDelete?: () => Promise<void>;
  onCancel: () => void;
};

function emptySteering(): Steering {
  return { mode: "raw", bio: "", principles: [], values: [] };
}

function draftFrom(character: Character | undefined, defaultColor: string): Draft {
  if (!character) {
    return {
      id: "",
      avatar: { shape: DEFAULT_AVATAR_SHAPE, color: defaultColor },
      model: "",
      outputMode: "structured",
      steering: emptySteering(),
    };
  }
  return {
    id: character.id,
    avatar: { ...character.avatar },
    provider: character.provider,
    model: character.model,
    outputMode: character.outputMode,
    effort: character.effort,
    steering: {
      mode: character.steering.mode,
      bio: character.steering.bio ?? "",
      principles: [...character.steering.principles],
      values: [...character.steering.values],
    },
  };
}

/**
 * The character editor, shared by `/characters/new` and `/characters/[id]`.
 *
 * It owns the draft and its validation; the screens own navigation, toasts and
 * the store calls. The identifier is the key everywhere — in the JSONL store, in
 * run configs, in span records — so it can be chosen once and never again.
 *
 * One column capped at the readable measure, with the two avatar plates on one
 * pitch under one pair of edges, and the composed prompt in a sticky column
 * beside it once the viewport is wide enough to hold both; the save row rides the
 * bottom of the viewport so it is never a scroll away from the field just edited.
 */
export function CharacterForm({
  character,
  characters,
  onSave,
  onDelete,
  onCancel,
}: CharacterFormProps) {
  const theme = useTheme();
  const { toast } = useToast();
  const editing = character !== undefined;
  const defaultColor = theme.avatarPalette[0]?.id ?? "";

  const [draft, setDraft] = useState<Draft>(() => draftFrom(character, defaultColor));
  const [idTouched, setIdTouched] = useState(editing);
  const [manualModel, setManualModel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [idConflict, setIdConflict] = useState<string | null>(null);

  const providers = useProviders();

  // Everything the chosen model decides is derived here rather than written back
  // into the draft: a catalogue that arrives late, or a model swapped for one
  // with different capabilities, changes what is offered without a second render
  // pass and without silently rewriting fields the user has not touched.
  const provider = draft.provider ?? providers.enabled[0]?.id;
  const models = useModels(provider);
  /** No catalogue means the id has to be typed, whatever the toggle says. */
  const manual = manualModel || models.error !== null;
  /** An unset model resolves to the head of the catalogue, not an empty select. */
  const model = draft.model !== "" ? draft.model : manual ? "" : (models.models[0]?.id ?? "");
  const modelInfo: ModelInfo | undefined = models.models.find((item) => item.id === model);
  const effortLevels = modelInfo?.capabilities.effort ?? [];
  const toolSupported = modelInfo === undefined || modelInfo.capabilities.toolCalls;
  /** A model that cannot take a tool call is never configured for one. */
  const outputMode: OutputMode = toolSupported ? draft.outputMode : "structured";
  /** Nor is an effort level the model does not offer ever sent. */
  const effort =
    draft.effort !== undefined && effortLevels.includes(draft.effort) ? draft.effort : undefined;

  const patch = useCallback((change: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...change }));
  }, []);

  const patchSteering = useCallback((change: Partial<Steering>) => {
    setDraft((current) => ({ ...current, steering: { ...current.steering, ...change } }));
  }, []);

  const takenIds = useMemo(
    () => new Set(characters.filter((item) => item.id !== character?.id).map((item) => item.id)),
    [character?.id, characters],
  );

  const idError = useMemo(() => {
    if (editing) return null;
    const trimmed = draft.id.trim();
    if (trimmed === "") return idTouched ? "An identifier is required." : null;
    const parsed = characterIdSchema.safeParse(trimmed);
    if (!parsed.success) return parsed.error.issues[0]?.message ?? "That identifier is not usable.";
    if (takenIds.has(trimmed)) return "Another character already answers to that name.";
    return idConflict;
  }, [draft.id, editing, idConflict, idTouched, takenIds]);

  const modelError = model.trim() === "" ? "A model is required." : null;
  const providerSummary = providers.providers.find((item) => item.id === provider);
  /**
   * Everything the provider row has to say, said once. An unconfigured provider is
   * the reason the catalogue could not be read, so the catalogue's own complaint is
   * only worth repeating when the key is there and the request still failed.
   */
  const providerMessage =
    provider === undefined
      ? "A configured provider is required."
      : providerSummary !== undefined && !providerSummary.enabled
        ? `${providerSummary.label} is not configured; add its key to .env and restart.`
        : sentenceCase(models.error);
  /**
   * Why the save button is off, in the order a form is filled in. A primary that
   * cannot be pressed and will not say why is the one thing the editor was most
   * often accused of, so the answer is computed once and shown beside it.
   */
  const blockedReason =
    provider === undefined
      ? "Choose a provider."
      : draft.id.trim() === ""
        ? "Name it first."
        : idError !== null || idConflict !== null
          ? "Fix the identifier."
          : modelError !== null
            ? "Choose a model."
            : null;
  const valid = blockedReason === null;

  function toInput(): CharacterInput {
    const steering = draft.steering;
    return {
      id: draft.id.trim(),
      name: character?.name,
      avatar: draft.avatar,
      // Guarded by `valid` before this is ever called.
      provider: provider as ProviderId,
      model: model.trim(),
      outputMode,
      effort,
      steering: {
        mode: steering.mode,
        bio: steering.bio?.trim() === "" ? undefined : steering.bio?.trim(),
        principles: steering.principles.map((item) => item.trim()).filter((item) => item !== ""),
        values: steering.values.map((item) => item.trim()).filter((item) => item !== ""),
      },
      createdAt: character?.createdAt,
      updatedAt: character?.updatedAt,
    };
  }

  async function handleSave() {
    setIdTouched(true);
    setFormError(null);
    setIdConflict(null);
    if (!valid) return;
    setSaving(true);
    try {
      await onSave(toInput());
    } catch (cause) {
      if (isConflict(cause)) setIdConflict("Another character already answers to that name.");
      else setFormError(describeApiError(cause));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
      setConfirmingDelete(false);
    } catch (cause) {
      setFormError(describeApiError(cause));
    } finally {
      setDeleting(false);
    }
  }

  async function handleTest() {
    if (provider === undefined || model.trim() === "") return;
    setTesting(true);
    try {
      const result = await testProvider(provider, model.trim(), outputMode);
      toast({
        title: "The model answered",
        description: `chose "${result.decision.choice}" in ${result.decision.latencyMs} ms`,
        tone: "success",
      });
    } catch (cause) {
      toast({ title: "No answer", description: describeApiError(cause), tone: "destructive" });
    } finally {
      setTesting(false);
    }
  }

  const outputModeOptions: SegmentedOption<OutputMode>[] = OUTPUT_MODES.map((mode) => ({
    value: mode,
    label: OUTPUT_MODE_LABELS[mode],
    disabledReason:
      mode === "tool" && !toolSupported
        ? `${modelInfo?.label ?? model} does not take tool calls.`
        : undefined,
  }));

  const steeringOptions: SegmentedOption<SteeringMode>[] = STEERING_MODES.map((mode) => ({
    value: mode,
    label: STEERING_MODE_LABELS[mode],
  }));

  const steering = draft.steering;
  const previewSteeringValue: Steering = useMemo(
    () => ({
      mode: steering.mode,
      bio: steering.bio,
      principles: steering.principles,
      values: steering.values,
    }),
    [steering.bio, steering.mode, steering.principles, steering.values],
  );

  return (
    <View className="gap-2xl wide:flex-row wide:items-start wide:gap-2xl">
      <View className="w-full max-w-reading flex-1 gap-2xl">
        {/*
          The first group is a section like the two under it: an untitled block of
          fields above a titled one reads as a preamble that lost its heading, and
          the rule under "Model" then looked like the page starting over.
        */}
        <FormSection title="Mask" divider={false}>
          {/*
            A character that already exists has no identifier field: the id is the
            key in the store, in every run config and in every span record, so it
            can be chosen once and never again. It is stated once, in the page
            header under the name, where a fact about the whole page belongs.
          */}
          {editing ? null : (
            <Field
              label="Identifier"
              error={idError}
              // The reason the primary is off, beside the field that turns it on.
              hint={idError === null && draft.id.trim() === "" ? "Name it first." : undefined}
            >
              <View className="flex-row items-center gap-sm">
                <Input
                  className="max-w-inspector flex-1"
                  value={draft.id}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="e.g. diogenes"
                  onChangeText={(text) => {
                    setIdTouched(true);
                    setIdConflict(null);
                    patch({ id: text });
                  }}
                />
                <Button
                  variant="outline"
                  onPress={() => {
                    setIdTouched(true);
                    setIdConflict(null);
                    patch({ id: newId() });
                  }}
                >
                  <Text>Random name</Text>
                </Button>
              </View>
            </Field>
          )}

          {/*
            One module, two flush bands: fifteen faces on one row and twenty-five
            pigments on the row under it, both spanning the form's measure and
            sharing its left and right edges. Split into two fields a step apart,
            each with its own ragged last row, they read as two unrelated grids
            that happened to land near each other.
          */}
          <View className="gap-md">
            <Field label="Face">
              <ShapePicker
                value={draft.avatar.shape}
                color={draft.avatar.color}
                onChange={(shape) => patch({ avatar: { ...draft.avatar, shape } })}
              />
            </Field>

            <Field label="Color">
              <ColorPicker
                value={draft.avatar.color}
                onChange={(color) => patch({ avatar: { ...draft.avatar, color } })}
              />
            </Field>
          </View>
        </FormSection>

        <FormSection title="Model">
          <Field label="Provider">
            {/*
              A select is as wide as the longest thing it will ever hold, not as
              wide as the page: "Anthropic" in a 700px trough reads as a field
              waiting for a sentence. Capped at the inspector measure, the provider
              and the model end on one edge with the identifier above them.
            */}
            <View className="flex-row items-center gap-sm">
              <View className="max-w-inspector flex-1">
                <Select
                  value={
                    provider === undefined
                      ? undefined
                      : {
                          value: provider,
                          label: providerSummary?.label ?? provider,
                        }
                  }
                  onValueChange={(option) => {
                    if (!option) return;
                    setManualModel(false);
                    patch({
                      provider: option.value as ProviderId,
                      model: "",
                      effort: undefined,
                    });
                  }}
                >
                  {/* A field that is refusing says so on its own edge, not only
                      in the line under it. */}
                  <SelectTrigger className={cn(providerMessage !== null && "border-destructive")}>
                    <SelectValue
                      placeholder={providers.loading ? "Reading providers…" : "Choose a provider"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {/*
                A provider without a key is offered but not choosable. The reason is
                the field's own message below; saying "— not configured" in the row
                as well states it twice in one glance.
              */}
                    {providers.providers.map((provider) => (
                      <SelectItem
                        key={provider.id}
                        value={provider.id}
                        disabled={!provider.enabled}
                        label={provider.label}
                      />
                    ))}
                  </SelectContent>
                </Select>
              </View>
              <Button
                variant="outline"
                disabled={testing || provider === undefined || model.trim() === ""}
                onPress={() => void handleTest()}
              >
                <Text>{testing ? "Asking…" : "Test connection"}</Text>
              </Button>
            </View>
            {providerMessage !== null ? (
              <View className="flex-row items-center gap-xs">
                <WarningGlyph />
                <Text variant="small" className="flex-1 text-destructive">
                  {providerMessage}
                </Text>
              </View>
            ) : null}
          </Field>

          <Field label="Model" error={modelError}>
            <View className="max-w-inspector gap-xs">
              {manual ? (
                // A model id is an identifier, not prose: typed in the mono voice
                // its figures are lining and one character wide, so "claude-sonnet-5"
                // stops setting its 5 as an old-style figure that drops below the line.
                <Input
                  className="font-mono text-sm"
                  value={model}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="model id"
                  onChangeText={(model) => patch({ model })}
                />
              ) : (
                <Select
                  value={
                    model === "" ? undefined : { value: model, label: modelInfo?.label ?? model }
                  }
                  onValueChange={(option) => {
                    if (option) patch({ model: option.value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={models.loading ? "Reading the catalogue…" : "Choose a model"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollView
                      style={{
                        maxHeight: VISIBLE_MODEL_ROWS * theme.controlSizes["control-sm"],
                      }}
                    >
                      {models.models.map((model) => (
                        <SelectItem key={model.id} value={model.id} label={model.label} />
                      ))}
                    </ScrollView>
                  </SelectContent>
                </Select>
              )}
              {/*
                Everything you can do to the catalogue, on one line under the
                control it acts on: re-read it, or stop using it and type the id.
                In the rubric red the app gives every link — set in body ink they
                read as two more labels nobody suspects of being pressable. A
                provider whose catalogue will not load has neither.
              */}
              {models.error === null ? (
                <View className="flex-row flex-wrap items-center gap-lg">
                  <Button
                    variant="link"
                    size="sm"
                    disabled={models.loading || provider === undefined}
                    onPress={() => void models.refresh()}
                  >
                    <Text>{models.loading ? "Reading…" : "Refresh models"}</Text>
                  </Button>
                  <Button variant="link" size="sm" onPress={() => setManualModel(!manual)}>
                    <Text>{manual ? "Choose from the catalogue" : "Enter model id manually"}</Text>
                  </Button>
                </View>
              ) : null}
            </View>
          </Field>

          <Field label="Output mode">
            <Segmented
              label="Output mode"
              value={outputMode}
              options={outputModeOptions}
              onChange={(outputMode) => patch({ outputMode })}
            />
          </Field>

          {effortLevels.length > 0 ? (
            <Field label="Reasoning effort" className="max-w-inspector">
              <Select
                value={{
                  value: effort ?? NO_EFFORT,
                  label: effort ?? PROVIDER_DEFAULT_EFFORT,
                }}
                onValueChange={(option) => {
                  if (!option) return;
                  patch({
                    effort: option.value === NO_EFFORT ? undefined : (option.value as EffortLevel),
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={PROVIDER_DEFAULT_EFFORT} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_EFFORT} label={PROVIDER_DEFAULT_EFFORT} />
                  {effortLevels.map((level) => (
                    <SelectItem key={level} value={level} label={level} />
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}
        </FormSection>

        <FormSection title="Steering">
          {/*
            No helper under the control: the rail beside the form shows what this
            mode actually sends, down to the mode that sends nothing at all. A
            sentence describing the thing displayed two columns over is the page
            explaining its own demonstration.
          */}
          <Field label="Mode">
            <Segmented
              label="Steering mode"
              value={steering.mode}
              options={steeringOptions}
              onChange={(mode) => patchSteering({ mode })}
            />
          </Field>

          {steering.mode === "raw" ? null : (
            <Field
              label="You are…"
              action={<Counter value={(steering.bio ?? "").length} max={CHARACTER_LIMITS.bio} />}
            >
              <Textarea
                value={steering.bio ?? ""}
                onChangeText={(bio) => patchSteering({ bio })}
                maxLength={CHARACTER_LIMITS.bio}
                showCount={false}
                rows={3}
                placeholder="a Cynic philosopher who lives in a barrel and distrusts every institution."
              />
            </Field>
          )}

          {steering.mode === "full" ? (
            <>
              <Field
                label="Principles"
                action={
                  <Counter
                    value={steering.principles.length}
                    max={CHARACTER_LIMITS.maxPrinciples}
                  />
                }
              >
                <ConvictionList
                  value={steering.principles}
                  onChange={(principles) => patchSteering({ principles })}
                  maxLength={CHARACTER_LIMITS.principle}
                  maxItems={CHARACTER_LIMITS.maxPrinciples}
                  addLabel="Add principle"
                  itemLabel="principle"
                  placeholder="Follow the argument."
                />
              </Field>
              <Field
                label="Values"
                action={
                  <Counter value={steering.values.length} max={CHARACTER_LIMITS.maxValues} />
                }
              >
                <ConvictionList
                  value={steering.values}
                  onChange={(values) => patchSteering({ values })}
                  maxLength={CHARACTER_LIMITS.value}
                  maxItems={CHARACTER_LIMITS.maxValues}
                  addLabel="Add value"
                  itemLabel="value"
                  placeholder="Courage"
                />
              </Field>
            </>
          ) : null}
        </FormSection>

        {formError ? (
          <Text variant="small" className="text-destructive">
            {formError}
          </Text>
        ) : null}

        {/*
          Three things only: the one irreversible act, kept at the far left behind
          its own rule, and the two ways out of the form. Why the primary is off is
          said beside the field that turns it on, not down here beside the button.
        */}
        <View className="web:sticky web:bottom-none flex-row flex-wrap items-center justify-end gap-lg border-t-hairline border-border bg-background py-lg">
          {onDelete ? (
            <View className="mr-auto flex-row items-center gap-lg">
              <Button
                variant="destructive"
                disabled={deleting}
                onPress={() => setConfirmingDelete(true)}
              >
                <Text>Delete</Text>
              </Button>
              <View className="h-control-sm w-hairline bg-border" />
            </View>
          ) : null}
          <Button variant="outline" onPress={onCancel}>
            <Text>Cancel</Text>
          </Button>
          <Button disabled={saving || !valid} onPress={() => void handleSave()}>
            <Text>{saving ? "Saving…" : editing ? "Save" : "Create character"}</Text>
          </Button>
        </View>
      </View>

      {/*
        The composed prompt rides beside the form where there is room for it: it is
        the consequence of the fields, not another one of them, and reading it while
        editing them is the whole reason it is on the page.
      */}
      <View className="web:wide:sticky web:wide:top-xl wide:w-inspector wide:shrink-0">
        <FinalPrompt steering={previewSteeringValue} />
      </View>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="Delete this character?"
        description={`"${draft.id}" is deleted. Runs it has already answered keep their record.`}
        confirmLabel="Delete"
        cancelLabel="Keep"
        destructive
        loading={deleting}
        onConfirm={() => void handleDelete()}
      />
    </View>
  );
}
