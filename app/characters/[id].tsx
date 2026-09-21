import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { CharacterForm } from "@/components/characters";
import { PageHeader, Scroll } from "@/components/shell";
import { Badge, Button, Text, useToast } from "@/components/ui";
import { useCharacters } from "@/lib/client/use-characters";
import { characterDisplayName, type CharacterInput } from "@/lib/domain";

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

  return (
    <View className="gap-xl">
      <PageHeader
        title={character ? characterDisplayName(character) : "Character"}
        subtitle="διόρθωσις · a mask, revised"
        right={
          character ? (
            <Badge variant="muted">
              <Text>{`${character.provider} · ${character.model}`}</Text>
            </Badge>
          ) : null
        }
      />

      {character ? (
        <CharacterForm
          character={character}
          characters={characters}
          onSave={handleSave}
          onDelete={handleDelete}
          onCancel={() => router.replace("/characters")}
        />
      ) : loading ? (
        <Scroll>
          <Text variant="lead">Reading characters…</Text>
        </Scroll>
      ) : (
        <Scroll>
          <Text variant="h3">No such character</Text>
          <Text variant="lead">
            {error ?? `Nobody answers to "${id ?? ""}".`}
          </Text>
          <View className="flex-row">
            <Button variant="outline" onPress={() => router.replace("/characters")}>
              <Text>Back to characters</Text>
            </Button>
          </View>
        </Scroll>
      )}
    </View>
  );
}
