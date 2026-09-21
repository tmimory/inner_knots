import { Platform } from "react-native";

import { Button, Text, useToast } from "@/components/ui";
import type { Run } from "@/lib/domain/run";
import type { LogEvent, Span } from "@/lib/domain/span";

/**
 * The bundle: one JSONL file holding the run, then every span, then every log
 * line, each tagged with what it is. `jq 'select(.kind=="span")'` gets the spans
 * back out, and the whole run travels as a single attachment.
 */
export function runBundle(run: Run, spans: readonly Span[], logs: readonly LogEvent[]): string {
  const lines = [
    JSON.stringify({ kind: "run", run }),
    ...spans.map((span) => JSON.stringify({ kind: "span", span })),
    ...logs.map((log) => JSON.stringify({ kind: "log", log })),
  ];
  return `${lines.join("\n")}\n`;
}

/** Hands the browser a file. Web only: there is no download on a phone. */
function download(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "application/x-ndjson" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export type ExportButtonProps = {
  run: Run;
  spans: readonly Span[];
  logs: readonly LogEvent[];
};

/** Downloads the run, its spans and its logs as one JSONL bundle. */
export function ExportButton({ run, spans, logs }: ExportButtonProps) {
  const { toast } = useToast();

  function onPress(): void {
    if (Platform.OS !== "web") {
      toast({
        title: "Export is web only",
        description: "Open this run in the browser to download its JSONL bundle.",
      });
      return;
    }
    download(`${run.id}.jsonl`, runBundle(run, spans, logs));
    toast({
      title: "Run exported",
      description: `${spans.length} spans and ${logs.length} log lines.`,
      tone: "success",
    });
  }

  return (
    <Button variant="outline" size="sm" onPress={onPress}>
      <Text>Export</Text>
    </Button>
  );
}
