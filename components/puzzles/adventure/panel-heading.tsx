import type { ReactNode } from "react";

import { Text } from "@/components/ui";

/**
 * The name of a block inside the builder's inspector column.
 *
 * Body size in the display face: a step under the page title, level with the
 * fields it introduces. The inspector used to head itself at the section size,
 * which put a second 20px display line four pixels under the 31px page title and
 * made the column read as a page of its own; and the blocks inside it then had
 * nowhere to go but the same size again. One size for every heading in the
 * column, and the page keeps its title.
 */
export function PanelHeading({ children }: { children: ReactNode }) {
  return (
    <Text className="font-display text-base text-foreground" numberOfLines={2}>
      {children}
    </Text>
  );
}
