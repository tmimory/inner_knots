/**
 * The shared pen for the avatar set.
 *
 * Every avatar is an iron-gall ink line drawing on parchment with exactly one spot
 * of pigment, the way a scribe would tint a single garment in a marginal figure.
 * The ink, paper and shading tones all come from the theme; the one `color` prop a
 * shape receives is a hex already resolved from `theme.avatarPalette`.
 *
 * Path coordinates and the viewBox are the only literal numbers allowed in a shape
 * file — pen weights live here so the whole set stays one hand.
 */
import type { ComponentType, ReactNode } from "react";
import Svg from "react-native-svg";

import { useTheme } from "@/theme";

export type AvatarShapeProps = {
  /** Hex for the single tinted region. Resolved by the caller from `avatarPalette`. */
  color: string;
  /** Rendered edge length in px. The drawing itself is always 64 viewBox units. */
  size: number;
};

export type AvatarShapeComponent = ComponentType<AvatarShapeProps>;

/** The square every avatar is drawn in. All path coordinates are in these units. */
export const AVATAR_VIEWBOX = 64;

/** Pen weights, in viewBox units. Three weights, decided once for the whole set. */
export const PEN = {
  /** The silhouette. Survives being shrunk to 32px. */
  bold: 2,
  /** Interior contours: a wing, a fold, a shell scute. */
  line: 1.4,
  /** Hatching, whiskers, fluting — the marks that only show at 96px. */
  hair: 0.9,
} as const;

export type AvatarPen = {
  /** Iron-gall ink. Every line in the set. */
  ink: string;
  /** Parchment. The fill behind an untinted mass. */
  paper: string;
  /** A recessed tone for secondary masses (hair, a beak, a shadowed face). */
  shade: string;
  /** A mid tone for marks that should read as texture rather than as outline. */
  wash: string;
};

/** The four tones a shape may draw with, besides its one tint. */
export function useAvatarPen(): AvatarPen {
  const theme = useTheme();
  return {
    ink: theme.colors.foreground,
    paper: theme.colors.card,
    shade: theme.colors.muted,
    wash: theme.colors.mutedForeground,
  };
}

export type AvatarFrameProps = {
  size: number;
  /** Accessible name, e.g. "Owl". */
  label: string;
  children: ReactNode;
};

/** The 64×64 stage every avatar shape draws on. */
export function AvatarFrame({ size, label, children }: AvatarFrameProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${AVATAR_VIEWBOX} ${AVATAR_VIEWBOX}`}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityRole="image"
      aria-label={label}
    >
      {children}
    </Svg>
  );
}
