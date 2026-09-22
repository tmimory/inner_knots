import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";

import { CharacterForm, characterTitle, LockGlyph } from "@/components/characters";
import { PageHeader, Screen } from "@/components/shell";
import { Button, Text, Tooltip, TooltipContent, TooltipTrigger, useToast } from "@/components/ui";
import { useCharacters } from "@/lib/client/use-characters";
import type { CharacterInput } from "@/lib/domain";

/**
 * The identifier, under the name it belongs to.
 *
 * It is the key in the store, in every run config and in every span record, so it
 * can be chosen once and never again — which makes it a fact about the page
 * rather than the first field of the form. In the form it was the one inline
 * label-and-value pair among a column of labelled controls, and it pushed a
 * read-only string to the top of a page of editable ones. The reason it cannot
 * change waits on the lock.
 */
function IdentifierSlug({ id }: { id: string }) {
  return (
    <View className="flex-row items-center gap-sm">
      <Text className="font-mono text-sm text-muted-foreground">{id}</Text>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          {/*
            Held back to the weight of a mark rather than a control: at full ink a
            padlock beside a line of text reads as a button that will unlock it.
          */}
          <Pressable
            accessibilityLabel="Why the identifier cannot be changed"
            className="p-xxs opacity-subtle"
          >
            <LockGlyph />
          </Pressable>
        </TooltipTrigger>
        <TooltipContent>
          <Text>Fixed after creation. Make another character to use a different name.</Text>
        </TooltipContent>
      </Tooltip>
    </View>
  );
}

export default function EditCharacterScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { characters, loading, error, update, remove } = useCharacters();
  const { toast } = useToast();

  const character = characters.find((item) => item.id === id);

  async function handleSave(input: CharacterInput) {
    if (!character) return;
    const saved = await update(character.id, input);
    toast({ title: "Character saved", description: saved.id, tone: "success" });
    router.replace("/characters");
  }

  async function handleDelete() {
    if (!character) return;
    await remove(character.id);
    toast({ title: "Character deleted", description: character.id });
    router.replace("/characters");
  }

  // The header is composed here rather than passed to `Screen` as a subtitle: on
  // this one screen the line under the title is not the Greek aside but the
  // character's own identifier, and a decorative tagline where the page could be
  // stating which record is open is a line spent on nothing.
  if (!character) {
    return (
      <Screen title="Character" subtitle="διόρθωσις · a mask, revised">
        {loading ? (
          <Text variant="lead">Reading characters…</Text>
        ) : (
          <View className="gap-lg">
            <Text variant="lead">{error ?? `Nobody answers to "${id ?? ""}".`}</Text>
            <View className="flex-row">
              <Button variant="outline" onPress={() => router.replace("/characters")}>
                <Text>Back to characters</Text>
              </Button>
            </View>
          </View>
        )}
      </Screen>
    );
  }

  return (
    <View className="gap-2xl">
      <View className="gap-xs">
        <PageHeader title={characterTitle(character)} />
        <IdentifierSlug id={character.id} />
      </View>
      <CharacterForm
        character={character}
        characters={characters}
        onSave={handleSave}
        onDelete={handleDelete}
        onCancel={() => router.replace("/characters")}
      />
    </View>
  );
}
