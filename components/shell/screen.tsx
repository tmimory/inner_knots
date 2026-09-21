import type { ReactNode } from "react";
import { View } from "react-native";

import { PageHeader, type PageHeaderProps } from "./page-header";

/**
 * A routed screen: its header, then its sections. Every screen opened with the
 * same header-plus-`gap-xl` wrapper, so the rhythm between page sections lives
 * here instead of in fifteen copies — the way `Scroll` owns panel chrome.
 */
export function Screen({ children, ...header }: PageHeaderProps & { children?: ReactNode }) {
  return (
    <View className="gap-xl">
      <PageHeader {...header} />
      {children}
    </View>
  );
}
