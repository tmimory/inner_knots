import { Link, usePathname } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { isActive, navItems, type NavLeaf } from "@/components/shell/nav-items";
import { Wordmark } from "@/components/shell/wordmark";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

/** Shared row chrome, so a leaf link and the group toggle cannot drift apart. */
function rowClasses(active: boolean): string {
  return cn(
    "rounded-md px-md py-sm transition-colors duration-fast",
    active ? "bg-muted" : "bg-transparent web:hover:bg-muted/subtle",
  );
}

/** Shared row label color. */
function rowTextClasses(active: boolean): string {
  return cn("font-display", active ? "text-primary" : "text-foreground");
}

function MenuLink({
  item,
  nested = false,
  onNavigate,
}: {
  item: NavLeaf;
  nested?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, item.match);

  return (
    <Link href={item.href} asChild onPress={onNavigate}>
      <Pressable
        role="link"
        aria-current={active ? "page" : undefined}
        className={cn(rowClasses(active), nested && "ml-md")}
      >
        <Text
          variant={nested ? "small" : "p"}
          className={cn(rowTextClasses(active), nested && "text-sm")}
        >
          {item.label}
        </Text>
      </Pressable>
    </Link>
  );
}

/**
 * The navigation column: wordmark, links, expandable puzzle group. Rendered as a
 * fixed column on wide viewports and inside the drawer on narrow ones.
 */
export function LeftMenu({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  function toggle(label: string, defaultOpen: boolean) {
    setOpenGroups((current) => ({ ...current, [label]: !(current[label] ?? defaultOpen) }));
  }

  return (
    <View className="h-full w-full gap-lg border-border bg-card p-lg">
      <Wordmark />
      <Separator />
      <ScrollView contentContainerClassName="gap-xxs" showsVerticalScrollIndicator={false}>
        {navItems.map((item) => {
          if (item.kind === "leaf") {
            return <MenuLink key={item.label} item={item} onNavigate={onNavigate} />;
          }

          const groupActive = isActive(pathname, item.match);
          const open = openGroups[item.label] ?? groupActive;

          return (
            <View key={item.label} className="gap-xxs">
              <Pressable
                role="button"
                aria-expanded={open}
                onPress={() => toggle(item.label, groupActive)}
                className={cn(
                  "flex-row items-center justify-between",
                  rowClasses(groupActive),
                )}
              >
                <Text className={rowTextClasses(groupActive)}>
                  {item.label}
                </Text>
                <Text variant="muted" className="font-mono">
                  {open ? "▾" : "▸"}
                </Text>
              </Pressable>
              {open
                ? item.children.map((child) => (
                    <MenuLink key={child.label} item={child} nested onNavigate={onNavigate} />
                  ))
                : null}
            </View>
          );
        })}
      </ScrollView>
      <Text variant="muted" className="text-xs">
        a bench for philosophical puzzles
      </Text>
    </View>
  );
}
