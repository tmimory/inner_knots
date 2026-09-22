import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";

import {
  CHARACTER_SEARCH_PLACEHOLDER,
  CharacterCard,
  FilterSegments,
  matchesCharacterQuery,
  SearchGlyph,
  STEERING_MODE_LABELS,
} from "@/components/characters";
import { Screen } from "@/components/shell";
import { Button, EmptyState, Input, Text } from "@/components/ui";
import { useCharacters } from "@/lib/client/use-characters";
import { useProviders } from "@/lib/client/use-providers";
import { STEERING_MODES, type SteeringMode } from "@/lib/domain";

export default function CharactersScreen() {
  const { characters, loading, error } = useCharacters();
  const providers = useProviders();

  const [search, setSearch] = useState("");
  const [steering, setSteering] = useState<SteeringMode | null>(null);

  /**
   * Only the facet you cannot type. The search box already matches a character's
   * identifier, name, provider and model, so a row of provider chips above it was
   * a second way to do the same thing — and with five providers it wrapped the
   * toolbar onto a second line of chrome above a five-row list. Steering is the
   * one thing about a character that no query can find.
   */
  const steeringOptions = useMemo(() => {
    const used = new Set(characters.map((character) => character.steering.mode));
    return STEERING_MODES.filter((mode) => used.has(mode)).map((mode) => ({
      value: mode,
      label: STEERING_MODE_LABELS[mode],
    }));
  }, [characters]);

  const visible = useMemo(() => {
    return characters.filter(
      (character) =>
        matchesCharacterQuery(character, search) &&
        (steering === null || character.steering.mode === steering),
    );
  }, [characters, search, steering]);

  const narrowed = search !== "" || steering !== null;
  const noProviders =
    !providers.loading && providers.error === null && providers.enabled.length === 0;

  function clearFilters() {
    setSearch("");
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
        <View className="flex-row flex-wrap items-center gap-md">
          <View className="min-w-popover flex-1">
            <Input
              className="pl-2xl pr-3xl"
              value={search}
              onChangeText={setSearch}
              placeholder={CHARACTER_SEARCH_PLACEHOLDER}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View
              pointerEvents="none"
              className="absolute bottom-none left-sm top-none justify-center"
            >
              <SearchGlyph />
            </View>
            {/*
              How much of the roster is left, inside the field that narrowed it —
              and only while something is narrowing it. Parked after the filters it
              was an orphan number with nothing to belong to, and it said "3
              characters" beside a list of exactly three visible rows.
            */}
            {narrowed ? (
              <View
                pointerEvents="none"
                className="absolute bottom-none right-md top-none justify-center"
              >
                <Text variant="subtle" className="font-mono text-xs">
                  {`${visible.length} of ${characters.length}`}
                </Text>
              </View>
            ) : null}
          </View>
          <FilterSegments
            label="Steering"
            value={steering}
            onChange={setSteering}
            options={steeringOptions}
          />
          {narrowed ? (
            <Button variant="quiet-link" onPress={clearFilters}>
              <Text>Clear</Text>
            </Button>
          ) : null}
        </View>
      ) : null}

      {visible.length > 0 ? (
        // A ruled page, not a stack of panels: the list opens on a hairline and
        // every row closes with one.
        <View className="border-t-hairline border-border">
          {visible.map((character) => (
            <CharacterCard key={character.id} character={character} />
          ))}
        </View>
      ) : loading ? null : narrowed ? (
        <EmptyState
          title="No character answers to that"
          body="Nothing in the roster matches what is in the search box above."
          action={{ label: "Clear the search", onPress: clearFilters }}
        />
      ) : (
        <EmptyState
          title="No characters yet"
          body="A character is a mask: a model, and how much of a self it is given before it hears a puzzle. Every dialogue needs a first interlocutor."
          action={{ label: "New character", href: "/characters/new" }}
        />
      )}
    </Screen>
  );
}
