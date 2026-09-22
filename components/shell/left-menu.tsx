import { Link, usePathname } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";

import { isActive, navItems, type NavLeaf } from "@/components/shell/nav-items";
import { Wordmark } from "@/components/shell/wordmark";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

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
function rowClasses(selected: boolean, depth: 0 | 1, hoverable = true): string {
  return cn(
    "flex-row items-center gap-sm rounded-sm border-l-thick py-xs pr-md transition-colors duration-fast",
    // A child sits one step in from its parent: the indent is what says "under",
    // and it is the only thing the group's chevron was pretending to say.
    depth === 0 ? "pl-md" : "pl-xl",
    selected ? "border-l-primary" : "border-l-transparent",
    !selected && hoverable && "web:hover:bg-muted/subtle",
  );
}

/**
 * The nav label. Top-level rows sit at body size; a child drops one step, so the
 * group reads as a list under a heading rather than four peers in a row.
 *
 * A child is also set in the quiet ink until it is the page you are on. The rail
 * holds three puzzles and two pages: with every label at full strength the group
 * read as five equal shouts and the one that was lit had to fight them. Muted
 * children make the lit one the only dark word in its block.
 */
function labelClasses(depth: 0 | 1, active: boolean): string {
  return cn(
    "font-display",
    depth === 0 ? "text-base" : "text-sm",
    active ? "text-primary" : depth === 0 ? "text-foreground" : "text-muted-foreground",
  );
}

/**
 * One nav row.
 *
 * Only the leaf you are actually on is marked. A parent used to take the same
 * treatment when one of its children was open, so two rows claimed to be the
 * current page at once; a parent is a heading over its list, never a destination.
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
        <Text className={labelClasses(depth, active)}>{item.label}</Text>
      </Pressable>
    </Link>
  );
}

/**
 * The navigation column: wordmark, links, expandable puzzle group. Rendered as a
 * fixed column on wide viewports and inside the drawer on narrow ones.
 */
export function LeftMenu({ onNavigate }: { onNavigate?: () => void }) {
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

          // A group is a heading with its list under it, always open and never
          // pressable. The chevron it used to carry offered to hide the three
          // puzzles the app is about, and pointed down at a list that could not be
          // shut — a control that lied about what it did, over content nobody
          // would ever want less of.
          return (
            <View key={item.label} className="gap-xxs">
              <View className={rowClasses(false, 0, false)} accessibilityRole="header">
                <Text className={cn(labelClasses(0, false), "flex-1")}>{item.label}</Text>
              </View>
              {item.children.map((child) => (
                <MenuLink key={child.label} item={child} depth={1} onNavigate={onNavigate} />
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
