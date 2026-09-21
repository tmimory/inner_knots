import { useCallback, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";

import { Avatar, ColorPicker, DEFAULT_AVATAR_SHAPE, ShapePicker } from "@/components/avatars";
import { Scroll } from "@/components/shell";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Text,
  Textarea,
  useToast,
} from "@/components/ui";
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
import {
  OUTPUT_MODE_LABELS,
  PROVIDER_DEFAULT_EFFORT,
  STEERING_MODE_HINTS,
  STEERING_MODE_LABELS,
} from "./labels";
import { Segmented, type SegmentedOption } from "./segmented";

/** How many rows of the model list are visible before it scrolls. */
const VISIBLE_MODEL_ROWS = 8;

/** Select values are strings, so "no effort of its own" needs a sentinel. */
const NO_EFFORT = "default";

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
  const providerError = provider === undefined ? "A configured provider is required." : null;
  const valid =
    idError === null &&
    draft.id.trim() !== "" &&
    modelError === null &&
    providerError === null &&
    idConflict === null;

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
    <View className="gap-lg">
      <Scroll>
        <FormSection
          title="Identity"
          description="The identifier is the key everywhere: in the store, in run configurations and in every span this character leaves behind."
        >
          <Field
            label="Identifier"
            error={idError}
            hint={
              editing
                ? "Fixed once created. Make another character to use a different name."
                : "Letters, digits, dot, dash or underscore. No spaces."
            }
          >
            <View className="flex-row items-center gap-sm">
              <Input
                className="flex-1"
                value={draft.id}
                editable={!editing}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="diogenes"
                onChangeText={(text) => {
                  setIdTouched(true);
                  setIdConflict(null);
                  patch({ id: text });
                }}
              />
              {editing ? null : (
                <Button
                  variant="outline"
                  onPress={() => {
                    setIdTouched(true);
                    setIdConflict(null);
                    patch({ id: newId() });
                  }}
                >
                  <Text>Generate</Text>
                </Button>
              )}
            </View>
          </Field>

          <Field label="Face" hint="A shape and a pigment. Neither says anything to the model.">
            <View className="flex-row items-start gap-xl">
              <Avatar shape={draft.avatar.shape} color={draft.avatar.color} size="xl" ring />
              <View className="min-w-menu flex-1 gap-lg">
                <ShapePicker
                  value={draft.avatar.shape}
                  color={draft.avatar.color}
                  onChange={(shape) => patch({ avatar: { ...draft.avatar, shape } })}
                />
                <ColorPicker
                  value={draft.avatar.color}
                  onChange={(color) => patch({ avatar: { ...draft.avatar, color } })}
                />
              </View>
            </View>
          </Field>
        </FormSection>
      </Scroll>

      <Scroll>
        <FormSection
          title="Model"
          description="Who answers, and in what shape the answer has to arrive."
        >
          <Field label="Provider" error={providerError}>
            <Select
              value={
                provider === undefined
                  ? undefined
                  : {
                      value: provider,
                      label:
                        providers.providers.find((item) => item.id === provider)?.label ?? provider,
                    }
              }
              onValueChange={(option) => {
                if (!option) return;
                setManualModel(false);
                patch({ provider: option.value as ProviderId, model: "", effort: undefined });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={providers.loading ? "Reading providers…" : "Choose a provider"} />
              </SelectTrigger>
              <SelectContent>
                {providers.providers.map((provider) => (
                  <SelectItem
                    key={provider.id}
                    value={provider.id}
                    disabled={!provider.enabled}
                    label={provider.enabled ? provider.label : `${provider.label} — not configured`}
                  />
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Model"
            error={modelError ?? models.error}
            hint={modelInfo?.capabilities.contextWindow ? `context window ${modelInfo.capabilities.contextWindow}` : undefined}
            action={
              <>
                <Text variant="muted">enter model id manually</Text>
                <Switch
                  checked={manual}
                  disabled={models.error !== null}
                  onCheckedChange={setManualModel}
                  accessibilityLabel="Enter model id manually"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  accessibilityLabel="Refresh the model list"
                  disabled={models.loading || provider === undefined}
                  onPress={() => void models.refresh()}
                >
                  <Text className="font-mono">↻</Text>
                </Button>
              </>
            }
          >
            {manual ? (
              <Input
                value={model}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="model id"
                onChangeText={(model) => patch({ model })}
              />
            ) : (
              <Select
                value={
                  model === ""
                    ? undefined
                    : { value: model, label: modelInfo?.label ?? model }
                }
                onValueChange={(option) => {
                  if (option) patch({ model: option.value });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={models.loading ? "Reading the catalogue…" : "Choose a model"} />
                </SelectTrigger>
                <SelectContent>
                  <ScrollView
                    style={{ maxHeight: VISIBLE_MODEL_ROWS * theme.controlSizes["control-sm"] }}
                  >
                    {models.models.map((model) => (
                      <SelectItem key={model.id} value={model.id} label={model.label} />
                    ))}
                  </ScrollView>
                </SelectContent>
              </Select>
            )}
          </Field>

          <Field
            label="Output mode"
            hint="Structured output asks for JSON; a tool call forces one function with the options as an enum."
          >
            <Segmented
              label="Output mode"
              value={outputMode}
              options={outputModeOptions}
              onChange={(outputMode) => patch({ outputMode })}
            />
          </Field>

          {effortLevels.length > 0 ? (
            <Field label="Reasoning effort" hint="How hard the model is asked to think before it answers.">
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

          <View className="flex-row items-center gap-md">
            <Button
              variant="secondary"
              size="sm"
              disabled={testing || provider === undefined || model.trim() === ""}
              onPress={() => void handleTest()}
            >
              <Text>{testing ? "Asking…" : "Test connection"}</Text>
            </Button>
            <Text variant="muted">One trivial question, through the path a real run takes.</Text>
          </View>
        </FormSection>
      </Scroll>

      <Scroll>
        <FormSection
          title="Steering"
          description="How much of a self the model is handed before it hears the puzzle."
        >
          <Field label="Mode" hint={STEERING_MODE_HINTS[steering.mode]}>
            <Segmented
              label="Steering mode"
              value={steering.mode}
              options={steeringOptions}
              onChange={(mode) => patchSteering({ mode })}
            />
          </Field>

          {steering.mode === "raw" ? null : (
            <Field label="You are…" hint="Finish the sentence. The fragment supplies the opening.">
              <Textarea
                value={steering.bio ?? ""}
                onChangeText={(bio) => patchSteering({ bio })}
                maxLength={CHARACTER_LIMITS.bio}
                placeholder="a Cynic philosopher who lives in a barrel and distrusts every institution."
              />
            </Field>
          )}

          {steering.mode === "full" ? (
            <>
              <Field label="Principles" hint="Rules the character holds itself to.">
                <ConvictionList
                  value={steering.principles}
                  onChange={(principles) => patchSteering({ principles })}
                  maxLength={CHARACTER_LIMITS.principle}
                  maxItems={CHARACTER_LIMITS.maxPrinciples}
                  addLabel="Add principle"
                  itemLabel="principle"
                />
              </Field>
              <Field label="Values" hint="What the character cares about.">
                <ConvictionList
                  value={steering.values}
                  onChange={(values) => patchSteering({ values })}
                  maxLength={CHARACTER_LIMITS.value}
                  maxItems={CHARACTER_LIMITS.maxValues}
                  addLabel="Add value"
                  itemLabel="value"
                />
              </Field>
            </>
          ) : null}
        </FormSection>
      </Scroll>

      <Scroll>
        <FinalPrompt steering={previewSteeringValue} />
      </Scroll>

      {formError ? (
        <Text variant="small" className="text-destructive">
          {formError}
        </Text>
      ) : null}

      <View className="flex-row flex-wrap items-center justify-end gap-sm">
        {onDelete ? (
          <Button
            variant="destructive"
            className="mr-auto"
            disabled={deleting}
            onPress={() => setConfirmingDelete(true)}
          >
            <Text>Delete</Text>
          </Button>
        ) : null}
        <Button variant="outline" onPress={onCancel}>
          <Text>Cancel</Text>
        </Button>
        <Button disabled={saving || !valid} onPress={() => void handleSave()}>
          <Text>{saving ? "Saving…" : editing ? "Save" : "Create character"}</Text>
        </Button>
      </View>

      <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this character?</DialogTitle>
            <DialogDescription>
              {`"${draft.id}" leaves the roster. Runs it has already answered keep their record.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onPress={() => setConfirmingDelete(false)}>
              <Text>Keep</Text>
            </Button>
            <Button variant="destructive" disabled={deleting} onPress={() => void handleDelete()}>
              <Text>{deleting ? "Deleting…" : "Delete"}</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
}
