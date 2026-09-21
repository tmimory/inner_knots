import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { LeftMenu } from "@/components/shell/left-menu";
import { Wordmark } from "@/components/shell/wordmark";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useWideViewport } from "@/lib/client/use-viewport";

/**
 * The application frame: a fixed menu column on wide viewports, a slide-over drawer
 * on narrow ones, with the routed screen scrolling beside it.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const wide = useWideViewport();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <View className="flex-1 flex-row bg-background">
      {wide ? (
        <View className="h-full w-menu border-r-hairline border-border">
          <LeftMenu />
        </View>
      ) : null}

      <View className="flex-1">
        {wide ? null : (
          <View className="flex-row items-center gap-md border-b-hairline border-border bg-card px-lg py-sm">
            <Button variant="outline" size="icon" onPress={() => setDrawerOpen(true)}>
              <Text className="font-mono">≡</Text>
            </Button>
            <Wordmark className="flex-1" />
          </View>
        )}

        <ScrollView contentContainerClassName="p-xl gap-lg" className="flex-1">
          <View className="w-full max-w-content self-center">{children}</View>
        </ScrollView>
      </View>

      {!wide && drawerOpen ? (
        <View className="absolute inset-none z-overlay flex-row">
          <View className="h-full w-menu shadow-ink-lifted">
            <LeftMenu onNavigate={() => setDrawerOpen(false)} />
          </View>
          <Pressable
            accessibilityLabel="Close menu"
            className="h-full flex-1 bg-foreground/scrim"
            onPress={() => setDrawerOpen(false)}
          />
        </View>
      ) : null}
    </View>
  );
}
