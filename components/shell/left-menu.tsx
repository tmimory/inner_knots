import { Link, usePathname } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { isActive, navItems, type NavLeaf } from "@/components/shell/nav-items";
import { Wordmark } from "@/components/shell/wordmark";
import { Chevron } from "@/components/ui/chevron";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

/** Shared row chrome, so a leaf link and the group toggle cannot drift apart. */
function rowClasses(selected: boolean): string {
  return cn(
    "rounded-sm px-md py-sm transition-colors duration-fast",
    selected ? "bg-muted" : "bg-transparent web:hover:bg-muted/subtle",
  );
}

/**
 * One nav row, at body size.
 *
 * Only the leaf you are actually on carries the fill. A parent whose child is
 * open used to take the same tan block, so two rows claimed to be the current
 * page at once; the parent says where you are by being open, not by being lit.
 */
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

  // `onPress` goes on the child, never on `Link`: expo-router spreads its own props
  // before `...rest`, so an `onPress` handed to `Link` (even `undefined`) replaces the
  // navigation handler and the anchor falls back to a full document load. On the child,
  // Radix `Slot` composes the two handlers instead.
  return (
    <Link href={item.href} asChild>
      <Pressable
        role="link"
        aria-current={active ? "page" : undefined}
        onPress={onNavigate}
        className={cn(rowClasses(active), nested && "ml-md")}
      >
        <Text className={cn("font-display", active ? "text-primary" : "text-foreground")}>
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
    <View className="h-full w-full gap-xl border-border bg-card p-lg">
      <Wordmark />
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
                className={cn("flex-row items-center gap-sm", rowClasses(false))}
              >
                <Text className="font-display text-foreground">{item.label}</Text>
                <Chevron direction={open ? "down" : "right"} tone="foreground" />
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
      <Text variant="subtle">a bench for philosophical puzzles</Text>
    </View>
  );
}
