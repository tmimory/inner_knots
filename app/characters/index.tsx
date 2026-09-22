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
import { pluralize } from "@/lib/format";

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
        // Two clusters, one line: what you type on the left at a fixed measure, and
        // the one facet you cannot type pushed to the column's right edge. Stretched
        // to fill the row, the search field grew to 420px and left the segments
        // crammed against it with nothing in between; parked at the card measure,
        // the gap between the two is the toolbar's own structure.
        <View className="flex-row flex-wrap items-center gap-lg">
          <View className="w-card">
            <Input
              className="pl-2xl"
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
          </View>
          {narrowed ? (
            <Button variant="quiet-link" onPress={clearFilters}>
              <Text>Clear</Text>
            </Button>
          ) : null}
          <FilterSegments
            className="ml-auto"
            label="Steering"
            value={steering}
            onChange={setSteering}
            options={steeringOptions}
          />
        </View>
      ) : null}

      {visible.length > 0 ? (
        // A ruled page, not a stack of panels: the list opens on a hairline and
        // every row closes with one — and the last of those rules is what the
        // count is written under.
        <View>
          <View className="border-t-hairline border-border">
            {visible.map((character) => (
              <CharacterCard key={character.id} character={character} />
            ))}
          </View>
          {/*
            How long the roster is, under the list it measures rather than in the
            row that narrows it: a count is the sum of what you have just read, not
            a control. In the lining figures the app counts in, and at the list's
            right edge where a total belongs.
          */}
          <View className="items-end pt-sm">
            <Text variant="meta" className="tabular">
              {narrowed
                ? `${visible.length} of ${pluralize(characters.length, "character")}`
                : pluralize(characters.length, "character")}
            </Text>
          </View>
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
