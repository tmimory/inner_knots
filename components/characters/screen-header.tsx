import type { ReactNode } from "react";

import { GreekKey, PageHeader } from "@/components/shell";

/** How many meander repeats the rule under the title is drawn with. */
const ORNAMENT_REPEATS = 24;

export type CharactersHeaderProps = {
  title: string;
  subtitle?: string;
  /** Actions rendered at the end of the header row. */
  right?: ReactNode;
};

/**
 * The title block the three Characters screens share: the page header with a
 * meander rule ruled under it, the way a scribe would head a new section.
 */
export function CharactersHeader({ title, subtitle, right }: CharactersHeaderProps) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} right={right} />
      <GreekKey repeats={ORNAMENT_REPEATS} tone="border" />
    </>
  );
}
