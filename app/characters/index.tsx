import { useEffect, useState } from "react";
import { View } from "react-native";

import { PageHeader, Scroll } from "@/components/shell";
import { Badge, Text } from "@/components/ui";
import { charactersApi } from "@/lib/client/characters";

type RosterState =
  | { status: "loading" }
  | { status: "ready"; count: number }
  | { status: "error"; message: string };

export default function CharactersScreen() {
  const [roster, setRoster] = useState<RosterState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    charactersApi
      .list()
      .then((characters) => {
        if (!cancelled) setRoster({ status: "ready", count: characters.length });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setRoster({ status: "error", message: error instanceof Error ? error.message : "unknown" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View className="gap-lg">
      <PageHeader
        title="Characters"
        subtitle="πρόσωπα · the masks that will answer"
        right={
          <Badge variant={roster.status === "ready" ? "secondary" : "muted"}>
            <Text>
              {roster.status === "ready"
                ? `${roster.count} on the roster`
                : roster.status === "loading"
                  ? "reading the roster…"
                  : `roster: ${roster.message}`}
            </Text>
          </Badge>
        }
      />
      <Scroll>
        <Text variant="lead">
          A character is a model plus a configuration plus whatever convictions we talk it into.
          The roster and the character editor arrive in phase 4.
        </Text>
        <Text variant="muted">
          Characters are stored as JSONL in the local data directory and served from
          /api/characters.
        </Text>
      </Scroll>
    </View>
  );
}
