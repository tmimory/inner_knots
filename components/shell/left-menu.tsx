import { Link, usePathname } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { isActive, navItems, type NavLeaf } from "@/components/shell/nav-items";
import { Wordmark } from "@/components/shell/wordmark";
import { Chevron } from "@/components/ui/chevron";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { useTheme } from "@/theme";

/**
 * Shared row chrome, so a leaf link and the group toggle cannot drift apart.
 *
 * Every row carries a 2px left border, transparent until the row is the page you
 * are on. That keeps one text axis in every state — a bar that appears only when
 * selected would shove the label two pixels sideways — and gives the current page
 * a mark strong enough to find at a glance, which the tan fill alone was not.
 *
 * The bar sits on the rail's own left edge for parents and children alike, so the
 * marks stack on one line however deep the row is.
 */
function rowClasses(selected: boolean, depth: 0 | 1): string {
  return cn(
    "flex-row items-center gap-sm rounded-sm border-l-thick py-xs pr-md transition-colors duration-fast",
    // A child sits one step in from its parent: the indent is what says "under",
    // and it is the only thing the group's chevron was pretending to say.
    depth === 0 ? "pl-md" : "pl-xl",
    selected ? "border-l-primary" : "border-l-transparent web:hover:bg-muted/subtle",
  );
}

/**
 * The nav label. Top-level rows sit at body size; a child drops one step, so the
 * group reads as a list under a heading rather than four peers in a row.
 */
function labelClasses(depth: 0 | 1): string {
  return cn("font-display", depth === 0 ? "text-base" : "text-sm");
}

/**
 * One nav row.
 *
 * Only the leaf you are actually on is marked. A parent whose child is open used
 * to take the same treatment, so two rows claimed to be the current page at once;
 * the parent says where you are by being open, not by being lit.
 */
function MenuLink({
  item,
  depth,
  onNavigate,
}: {
  item: NavLeaf;
  depth: 0 | 1;
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
        className={rowClasses(active, depth)}
      >
        <Text className={cn(labelClasses(depth), active ? "text-primary" : "text-foreground")}>
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
  const theme = useTheme();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  function toggle(label: string) {
    setOpenGroups((current) => ({ ...current, [label]: !(current[label] ?? true) }));
  }

  return (
    <View className="h-full w-full gap-xl border-border bg-sidebar p-lg pt-xl">
      {/*
        The masthead takes a nav row's own box — the same transparent 2px bar and
        the same left padding — so the wordmark, the rule under it and every nav
        label below stand on one axis instead of three.

        The extra `pt-xs` is optical, not structural: the rail and the content pane
        share a 24px top padding, but the wordmark is set at `2xl` and the page
        title at `3xl`, so their baselines land 5.5px apart. Four pixels of drop
        puts the two baselines within a pixel and a half of each other, and the
        masthead reads as being on the same line as the page title across the
        divider rather than floating above it.
      */}
      <Wordmark className="border-l-thick border-l-transparent pl-md pt-xs" />
      <ScrollView contentContainerClassName="gap-xxs" showsVerticalScrollIndicator={false}>
        {navItems.map((item) => {
          if (item.kind === "leaf") {
            return <MenuLink key={item.label} item={item} depth={0} onNavigate={onNavigate} />;
          }

          // Groups open by default: a disclosure that hides the app's three puzzles
          // behind a chevron makes the reader click to find out what the product is.
          const open = openGroups[item.label] ?? true;

          return (
            <View key={item.label} className="gap-xxs">
              <Pressable
                role="button"
                aria-expanded={open}
                onPress={() => toggle(item.label)}
                className={rowClasses(false, 0)}
              >
                {/* The label takes the row; the chevron rides its trailing edge, drawn
                    at the label's own size and ink so it reads as punctuation on the
                    word rather than a stray mark floating beside it. It points down
                    while the group is open and right when it is shut. */}
                <Text className={cn(labelClasses(0), "flex-1 text-foreground")}>{item.label}</Text>
                <Chevron
                  direction={open ? "down" : "right"}
                  size={theme.fontSizes.base}
                  tone="foreground"
                />
              </Pressable>
              {open
                ? item.children.map((child) => (
                    <MenuLink key={child.label} item={child} depth={1} onNavigate={onNavigate} />
                  ))
                : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
