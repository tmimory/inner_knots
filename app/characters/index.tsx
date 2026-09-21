import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";

import {
  CHARACTER_SEARCH_PLACEHOLDER,
  CharacterCard,
  FilterChips,
  matchesCharacterQuery,
  OUTPUT_MODE_LABELS,
  STEERING_MODE_LABELS,
} from "@/components/characters";
import { PageHeader, Scroll } from "@/components/shell";
import { Badge, Button, Input, Separator, Text } from "@/components/ui";
import { useCharacters } from "@/lib/client/use-characters";
import { useProviders } from "@/lib/client/use-providers";
import { pluralize } from "@/lib/format";
import {
  OUTPUT_MODES,
  STEERING_MODES,
  type OutputMode,
  type ProviderId,
  type SteeringMode,
} from "@/lib/domain";

export default function CharactersScreen() {
  const { characters, loading, error } = useCharacters();
  const providers = useProviders();

  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState<ProviderId | null>(null);
  const [outputMode, setOutputMode] = useState<OutputMode | null>(null);
  const [steering, setSteering] = useState<SteeringMode | null>(null);

  const providerOptions = useMemo(() => {
    const used = new Set(characters.map((character) => character.provider));
    return providers.providers
      .filter((summary) => used.has(summary.id))
      .map((summary) => ({ value: summary.id, label: summary.label }));
  }, [characters, providers.providers]);

  const visible = useMemo(() => {
    return characters.filter(
      (character) =>
        matchesCharacterQuery(character, search) &&
        (provider === null || character.provider === provider) &&
        (outputMode === null || character.outputMode === outputMode) &&
        (steering === null || character.steering.mode === steering),
    );
  }, [characters, outputMode, provider, search, steering]);

  const filtered = visible.length !== characters.length;
  const noProviders = !providers.loading && providers.error === null && providers.enabled.length === 0;

  const newButton = (
    <Link href="/characters/new" asChild>
      <Button>
        <Text>New character</Text>
      </Button>
    </Link>
  );

  return (
    <View className="gap-xl">
      <PageHeader
        title="Characters"
        subtitle="πρόσωπα · the masks that will answer"
        right={
          <>
            <Badge variant={loading ? "muted" : "secondary"}>
              <Text>
                {loading ? "reading characters…" : pluralize(characters.length, "character")}
              </Text>
            </Badge>
            {newButton}
          </>
        }
      />
      <Text variant="lead">
        Characters are made here; each puzzle page seats its own roster from them.
      </Text>

      {error ? (
        <Scroll>
          <Text variant="h3">The characters would not load</Text>
          <Text variant="small" className="text-destructive">
            {error}
          </Text>
        </Scroll>
      ) : null}

      {noProviders ? (
        <Scroll>
          <Text variant="h3">No provider is configured</Text>
          <Text variant="muted">
            A character needs somewhere to think. Add a key to .env for one of these and restart the
            dev server:
          </Text>
          <View className="flex-row flex-wrap gap-xs">
            {providers.providers.map((summary) => (
              <Badge key={summary.id} variant="outline">
                <Text>{summary.label}</Text>
              </Badge>
            ))}
          </View>
        </Scroll>
      ) : null}

      {characters.length > 0 ? (
        <View className="gap-lg">
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder={CHARACTER_SEARCH_PLACEHOLDER}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View className="gap-xs">
            <FilterChips
              label="Provider"
              value={provider}
              onChange={setProvider}
              options={providerOptions}
            />
            <FilterChips
              label="Output"
              value={outputMode}
              onChange={setOutputMode}
              options={OUTPUT_MODES.map((mode) => ({ value: mode, label: OUTPUT_MODE_LABELS[mode] }))}
            />
            <FilterChips
              label="Steering"
              value={steering}
              onChange={setSteering}
              options={STEERING_MODES.map((mode) => ({ value: mode, label: STEERING_MODE_LABELS[mode] }))}
            />
          </View>
          <Separator />
        </View>
      ) : null}

      {visible.length > 0 ? (
        <View className="flex-row flex-wrap gap-lg">
          {visible.map((character) => (
            <CharacterCard key={character.id} character={character} />
          ))}
        </View>
      ) : loading ? null : (
        <Scroll>
          <Text variant="h3">{filtered ? "Nobody answers to that" : "No characters yet"}</Text>
          <Text variant="lead">
            {filtered
              ? "No character matches those filters."
              : "Every dialogue needs a first interlocutor."}
          </Text>
          {filtered ? null : <View className="flex-row">{newButton}</View>}
        </Scroll>
      )}
    </View>
  );
}
