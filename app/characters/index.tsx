import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";

import {
  CHARACTER_SEARCH_PLACEHOLDER,
  CharacterCard,
  FilterSegments,
  matchesCharacterQuery,
  OUTPUT_MODE_LABELS,
  STEERING_MODE_LABELS,
  type FacetOption,
} from "@/components/characters";
import { Screen } from "@/components/shell";
import { Button, Input, Text } from "@/components/ui";
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

/**
 * The segments for one facet, limited to the values the roster actually uses: a
 * filter that can only ever return everything is not worth a row of chrome.
 */
function facetOptions<T extends string>(
  all: readonly T[],
  used: ReadonlySet<T>,
  labels: Record<T, string>,
): FacetOption<T>[] {
  return all.filter((value) => used.has(value)).map((value) => ({ value, label: labels[value] }));
}

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

  const outputOptions = useMemo(
    () =>
      facetOptions(
        OUTPUT_MODES,
        new Set(characters.map((character) => character.outputMode)),
        OUTPUT_MODE_LABELS,
      ),
    [characters],
  );

  const steeringOptions = useMemo(
    () =>
      facetOptions(
        STEERING_MODES,
        new Set(characters.map((character) => character.steering.mode)),
        STEERING_MODE_LABELS,
      ),
    [characters],
  );

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
  const narrowed = search !== "" || provider !== null || outputMode !== null || steering !== null;
  const noProviders =
    !providers.loading && providers.error === null && providers.enabled.length === 0;

  function clearFilters() {
    setSearch("");
    setProvider(null);
    setOutputMode(null);
    setSteering(null);
  }

  return (
    <Screen
      title="Characters"
      subtitle="πρόσωπα · the masks that will answer"
      width="reading"
      right={
        <Link href="/characters/new" asChild>
          <Button>
            <Text>New character</Text>
          </Button>
        </Link>
      }
    >
      {error ? (
        <Text variant="small" className="text-destructive">
          {`The characters would not load: ${error}`}
        </Text>
      ) : null}

      {noProviders ? (
        <Text variant="lead">
          {`No provider is configured. Add a key to .env for one of ${providers.providers
            .map((summary) => summary.label)
            .join(", ")} and restart the dev server.`}
        </Text>
      ) : null}

      {characters.length > 0 ? (
        // Search, facets and count are one toolbar: the segmented controls share
        // the search box's height and field fill so the row reads as a single
        // strip of chrome rather than a field with some buttons after it.
        <View className="flex-row flex-wrap items-center gap-lg">
          <Input
            className="min-w-popover flex-1"
            value={search}
            onChangeText={setSearch}
            placeholder={CHARACTER_SEARCH_PLACEHOLDER}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <FilterSegments
            label="Provider"
            value={provider}
            onChange={setProvider}
            options={providerOptions}
          />
          <FilterSegments
            label="Output"
            value={outputMode}
            onChange={setOutputMode}
            options={outputOptions}
          />
          <FilterSegments
            label="Steering"
            value={steering}
            onChange={setSteering}
            options={steeringOptions}
          />
          {narrowed ? (
            <Button variant="link" size="sm" onPress={clearFilters}>
              <Text>Clear</Text>
            </Button>
          ) : null}
          <Text variant="meta" className="ml-auto">
            {loading ? "reading characters…" : pluralize(visible.length, "character")}
          </Text>
        </View>
      ) : null}

      {visible.length > 0 ? (
        <View className="gap-sm">
          {visible.map((character) => (
            <CharacterCard key={character.id} character={character} />
          ))}
        </View>
      ) : loading ? null : (
        <Text variant="lead">
          {filtered
            ? "No character answers to that."
            : "No characters yet — every dialogue needs a first interlocutor."}
        </Text>
      )}
    </Screen>
  );
}
