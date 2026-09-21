import { useEffect, useState } from "react";
import { View } from "react-native";

import { PageHeader, Scroll } from "@/components/shell";
import { Badge, Text } from "@/components/ui";
import type { HealthResponse } from "@/app/api/health+api";
import { apiFetch } from "@/lib/client/api";

type HealthState =
  | { status: "checking" }
  | { status: "ok"; time: string }
  | { status: "error"; message: string };

export default function CharactersScreen() {
  const [health, setHealth] = useState<HealthState>({ status: "checking" });

  useEffect(() => {
    let cancelled = false;
    apiFetch<HealthResponse>("/api/health")
      .then((result) => {
        if (!cancelled) setHealth({ status: "ok", time: result.time });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setHealth({ status: "error", message: error instanceof Error ? error.message : "unknown" });
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
          <Badge variant={health.status === "ok" ? "secondary" : "muted"}>
            <Text>
              {health.status === "ok"
                ? "backend: ok"
                : health.status === "checking"
                  ? "backend: checking…"
                  : `backend: ${health.message}`}
            </Text>
          </Badge>
        }
      />
      <Scroll>
        <Text variant="lead">
          A character is a model plus a configuration plus whatever convictions we talk it into.
          The roster and the character editor arrive in phase 3.
        </Text>
        {health.status === "ok" ? (
          <Text variant="muted">Server time: {health.time}</Text>
        ) : null}
      </Scroll>
    </View>
  );
}
