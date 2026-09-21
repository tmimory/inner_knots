import type { ReactNode } from "react";

import { PageHeader } from "@/components/shell";

export type CharactersHeaderProps = {
  title: string;
  subtitle?: string;
  /** Actions rendered at the end of the header row. */
  right?: ReactNode;
};

/**
 * The title block the three Characters screens share.
 *
 * The meander rule under the title is `PageHeader`'s own `ornament`; this is the
 * name the Characters screens call it by, kept so they read as one family.
 */
export function CharactersHeader({ title, subtitle, right }: CharactersHeaderProps) {
  return <PageHeader title={title} subtitle={subtitle} right={right} ornament />;
}
