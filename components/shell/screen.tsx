import type { ReactNode } from "react";
import { View } from "react-native";

import { cn } from "@/lib/utils";

import { PageHeader, widthClasses, type PageHeaderProps } from "./page-header";

/**
 * A routed screen: its header, then its sections. Every screen opened with the
 * same header-plus-gap wrapper, so the rhythm between page sections lives here
 * instead of in fifteen copies — the way `Scroll` owns panel chrome.
 *
 * The gap is the wide half of the section rhythm: a band of air above a section's
 * hairline, half as much below it, so the rule reads as the underscore of the
 * heading it introduces rather than as a page break between two strangers. The
 * header gets the same pair, so the first section is spaced like every other one.
 *
 * `width="reading"` puts the header and the content in one `layout.reading`
 * column, centred in the pane. A screen that caps its own body at a reading
 * measure while its header runs to the window edge is two pages, not one: the
 * primary action floats off in the margin, far from the thing it acts on.
 */
export function Screen({
  children,
  width = "full",
  ...header
}: PageHeaderProps & { children?: ReactNode }) {
  return (
    <View className={cn("gap-2xl", widthClasses(width))}>
      <PageHeader {...header} />
      {children}
    </View>
  );
}
