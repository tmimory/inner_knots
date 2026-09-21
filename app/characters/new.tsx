import { router } from "expo-router";
import { View } from "react-native";

import { CharacterForm } from "@/components/characters";
import { PageHeader } from "@/components/shell";
import { useToast } from "@/components/ui";
import { useCharacters } from "@/lib/client/use-characters";
import type { CharacterInput } from "@/lib/domain";

export default function NewCharacterScreen() {
  const { characters, create } = useCharacters();
  const { toast } = useToast();

  async function handleSave(input: CharacterInput) {
    const created = await create(input);
    toast({ title: "Character created", description: created.id, tone: "success" });
    router.replace("/characters");
  }

  return (
    <View className="gap-lg">
      <PageHeader title="New character" subtitle="πλάσις · the shaping of a mask" />
      <CharacterForm
        characters={characters}
        onSave={handleSave}
        onCancel={() => router.replace("/characters")}
      />
    </View>
  );
}
