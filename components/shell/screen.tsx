import type { ReactNode } from "react";
import { View } from "react-native";

import { cn } from "@/lib/utils";

import { PageHeader, widthClasses, type PageHeaderProps } from "./page-header";

/**
 * A routed screen: its header, then its sections. Every screen opened with the
 * same header-plus-`gap-xl` wrapper, so the rhythm between page sections lives
 * here instead of in fifteen copies — the way `Scroll` owns panel chrome.
 *
 * `width="reading"` puts the header and the content in one `layout.reading`
 * column on the left axis. A screen that caps its own body at a reading measure
 * while its header runs to the window edge is two pages, not one: the primary
 * action floats off in the margin, far from the thing it acts on.
 */
export function Screen({
  children,
  width = "full",
  ...header
}: PageHeaderProps & { children?: ReactNode }) {
  return (
    <View className={cn("gap-xl", widthClasses(width))}>
      <PageHeader {...header} />
      {children}
    </View>
  );
}
