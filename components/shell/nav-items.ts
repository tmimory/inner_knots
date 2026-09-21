import type { Href } from "expo-router";

export type NavLeaf = {
  kind: "leaf";
  label: string;
  href: Href;
  /** A route is active when the pathname starts with this prefix. */
  match: string;
};

export type NavGroup = {
  kind: "group";
  label: string;
  match: string;
  children: NavLeaf[];
};

export type NavItem = NavLeaf | NavGroup;

/** The left menu, top to bottom. Add a screen here and it appears in the menu. */
export const navItems: NavItem[] = [
  { kind: "leaf", label: "Characters", href: "/characters", match: "/characters" },
  {
    kind: "group",
    label: "Puzzles",
    match: "/puzzles",
    children: [
      { kind: "leaf", label: "Trolley Problems", href: "/puzzles/trolley", match: "/puzzles/trolley" },
      {
        kind: "leaf",
        label: "Prisoner's Dilemma",
        href: "/puzzles/prisoners-dilemma",
        match: "/puzzles/prisoners-dilemma",
      },
      {
        kind: "leaf",
        label: "Adventure",
        href: "/puzzles/adventure",
        match: "/puzzles/adventure",
      },
    ],
  },
  { kind: "leaf", label: "Logs", href: "/logs", match: "/logs" },
];

/** True when `pathname` is inside the given menu entry. */
export function isActive(pathname: string, match: string): boolean {
  return pathname === match || pathname.startsWith(`${match}/`);
}
