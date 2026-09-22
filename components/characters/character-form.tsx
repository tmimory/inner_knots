import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { ColorPicker, DEFAULT_AVATAR_SHAPE, ShapePicker } from "@/components/avatars";
import { SplitPane } from "@/components/shell";
import {
  Button,
  ConfirmDialog,
  FieldCounter,
  Input,
  Segmented,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Text,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useToast,
  type SegmentedOption,
} from "@/components/ui";
import { testProvider } from "@/lib/client/providers";
import { describeApiError, isConflict } from "@/lib/client/errors";
import { useModels, useProviders } from "@/lib/client/use-providers";
import {
  CHARACTER_LIMITS,
  characterIdSchema,
  newId,
  OUTPUT_MODES,
  sendsConvictions,
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
  ignoredConvictionsNote,
  STEERING_MODE_HINTS,
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
 * pitch under one pair of edges, and the composed prompt in a sticky rail beside
 * it once the viewport is wide enough to hold both — at the inspector width and
 * behind the same hairline every other split screen in the app uses. The save row
 * rides the bottom of the viewport so it is never a scroll away from the field
 * just edited.
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
    setDraft((current) => ({
      ...current,
      steering: { ...current.steering, ...change },
    }));
  }, []);

  const takenIds = useMemo(
    () => new Set(characters.filter((item) => item.id !== character?.id).map((item) => item.id)),
    [character?.id, characters],
  );

  const idError = useMemo(() => {
    if (editing) return null;
    const trimmed = draft.id.trim();
    // The same four words the disabled primary is off for, in the destructive
    // red beside the field that turns it on — and only once the field has been
    // left empty or the form has been sent, never on a form nobody has touched.
    if (trimmed === "") return idTouched ? "Name it first." : null;
    const parsed = characterIdSchema.safeParse(trimmed);
    if (!parsed.success) return parsed.error.issues[0]?.message ?? "That identifier is not usable.";
    if (takenIds.has(trimmed)) return "Another character already answers to that name.";
    return idConflict;
  }, [draft.id, editing, idConflict, idTouched, takenIds]);

  const modelError = model.trim() === "" ? "A model is required." : null;
  const providerSummary = providers.providers.find((item) => item.id === provider);
  /**
   * Everything the provider row has to say, said once — and said in two lengths.
   *
   * The message is what goes under the field: short enough to be read in the
   * glance that notices the warning mark, because a validation line is a label for
   * a state, not the instructions for fixing it. Those are on the mark itself,
   * where someone who does not already know what a `.env` file is can ask for
   * them. A red border said the same thing a third time in the field's own
   * vocabulary for focus, so the field keeps its tan edge.
   *
   * An unconfigured provider is the reason the catalogue could not be read, so the
   * catalogue's own complaint is only worth repeating when the key is there and the
   * request still failed.
   */
  const providerFault: { message: string; hint: string } | null =
    provider === undefined
      ? {
          message: "No provider is configured.",
          hint: "Add an API key to .env for one of the providers and restart the dev server.",
        }
      : providerSummary !== undefined && !providerSummary.enabled
        ? {
            message: `No ${providerSummary.label} key found.`,
            hint: `Add ${providerSummary.label}'s API key to .env and restart the dev server.`,
          }
        : models.error !== null
          ? {
              message: "The catalogue would not load.",
              hint: sentenceCase(models.error) ?? "",
            }
          : null;
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
      toast({
        title: "No answer",
        description: describeApiError(cause),
        tone: "destructive",
      });
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
  const ignoredNote = ignoredConvictionsNote(steering);
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
    <>
      {/*
        The form and its rail: a stretched row, the reading column on the left and
        an inspector column on the right, one gap and one gutter making the 48px
        between them. The rail sticks so the composed prompt stays beside the
        fields it is the consequence of, and its rule ends where the panel does —
        a rule with nothing beside it reads as a tear.
      */}
      <SplitPane
        railRule="content"
        railSticky
        main={<View className="w-full max-w-reading gap-2xl">
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
              <Field label="Identifier" error={idError}>
                <View className="flex-row items-start gap-sm">
                  {/*
                  An empty field is not a mistake until it has been left empty:
                  the complaint waits for the cursor to leave, or for the form to
                  be sent, rather than greeting a form nobody has typed into with
                  its own first error.
                */}
                  <Input
                    className="max-w-inspector flex-1"
                    maxLength={CHARACTER_LIMITS.id}
                    value={draft.id}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="e.g. diogenes"
                    onBlur={() => setIdTouched(true)}
                    onChangeText={(text) => {
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
            One module, two plates: fifteen faces on two rows and twenty-five
            pigments on the row under them, both spanning the form's measure and
            sharing its left and right edges. Split into two fields a step apart,
            they read as two unrelated grids that happened to land near each other.
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
                    <SelectTrigger>
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
                  {/*
                  The mark of a field that cannot answer, inside the field's own
                  right end where the state belongs — and holding the long form of
                  the message, so the line beneath can stay one short sentence.
                  It sits clear of the chevron: the two marks are the field's two
                  facts, "this opens" and "this is not configured".
                */}
                  {providerFault !== null ? (
                    <View className="absolute bottom-none right-3xl top-none justify-center">
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <Pressable
                            accessibilityLabel="Why this provider cannot answer"
                            className="p-xxs"
                          >
                            <WarningGlyph />
                          </Pressable>
                        </TooltipTrigger>
                        <TooltipContent>
                          <Text>{providerFault.hint}</Text>
                        </TooltipContent>
                      </Tooltip>
                    </View>
                  ) : null}
                </View>
                <Button
                  variant="outline"
                  disabled={testing || provider === undefined || model.trim() === ""}
                  onPress={() => void handleTest()}
                >
                  <Text>{testing ? "Asking…" : "Test connection"}</Text>
                </Button>
              </View>
              {providerFault !== null ? (
                <Text variant="small" className="text-destructive">
                  {providerFault.message}
                </Text>
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
                In body ink with the underline on hover, not the rubric red: these
                are utilities on a field, and in red they joined the page title,
                the active nav item and the one primary action in claiming to be
                what the screen is about. A provider whose catalogue will not load
                has neither.
              */}
                {models.error === null ? (
                  <View className="flex-row flex-wrap items-center gap-lg">
                    <Button
                      variant="quiet-link"
                      size="sm"
                      disabled={models.loading || provider === undefined}
                      onPress={() => void models.refresh()}
                    >
                      <Text>{models.loading ? "Reading…" : "Refresh models"}</Text>
                    </Button>
                    <Button variant="quiet-link" size="sm" onPress={() => setManualModel(!manual)}>
                      <Text>
                        {manual ? "Choose from the catalogue" : "Enter model id manually"}
                      </Text>
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
                      effort:
                        option.value === NO_EFFORT ? undefined : (option.value as EffortLevel),
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
            No "Mode" label over the control: the section is called Steering and
            holds one three-way choice, so a label under the heading names the same
            thing twice. What is worth a line is what the chosen segment does — one
            sentence that changes with the choice, under the control it describes,
            where the rail two columns over then shows it happening.
          */}
            <View className="gap-xs">
              <Segmented
                label="Steering mode"
                value={steering.mode}
                options={steeringOptions}
                onChange={(mode) => patchSteering({ mode })}
              />
              <Text variant="muted">{STEERING_MODE_HINTS[steering.mode]}</Text>
              {/*
                The lists below fold away outside Full mode, and what folds away
                is easy to take for gone — or, from the roster, for sent. One more
                sentence under the hint says which it is: still on record, not in
                the prompt, and where to go to change either.
              */}
              {ignoredNote === undefined ? null : <Text variant="muted">{ignoredNote}</Text>}
            </View>

            {steering.mode === "raw" ? null : (
              <Field label="You are…">
                <Textarea
                  value={steering.bio ?? ""}
                  onChangeText={(bio) => patchSteering({ bio })}
                  maxLength={CHARACTER_LIMITS.bio}
                  rows={3}
                  placeholder="a Cynic philosopher who lives in a barrel and distrusts every institution."
                />
              </Field>
            )}

            {sendsConvictions(steering.mode) ? (
              <>
                <Field
                  label="Principles"
                  action={
                    <FieldCounter
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
                    <FieldCounter value={steering.values.length} max={CHARACTER_LIMITS.maxValues} />
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
          Three things only, on one ladder: the one irreversible act as a text
          button at the far left, the way out as a ghost beside the primary, and
          one filled button on the row. The rule that used to stand between Delete
          and the rest was a divider with nothing on its other side — the whole
          width of the bar already separates them. Why the primary is off is said
          beside the field that turns it on, not down here beside the button.
        */}
          <View className="web:sticky web:bottom-none flex-row flex-wrap items-center justify-end gap-lg border-t-hairline border-border bg-background py-lg">
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
            <Button variant="ghost" onPress={onCancel}>
              <Text>Cancel</Text>
            </Button>
            <Button disabled={saving || !valid} onPress={() => void handleSave()}>
              <Text>{saving ? "Saving…" : editing ? "Save" : "Create character"}</Text>
            </Button>
          </View>
        </View>}
        rail={<FinalPrompt steering={previewSteeringValue} />}
      />

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
    </>
  );
}
