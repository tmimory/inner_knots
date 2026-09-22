/**
 * The shared pen for the trolley object glyphs.
 *
 * Every glyph is a monochrome ink drawing in a 32×32 box, drawn at the theme's
 * `icon-md` step and still legible at `icon-sm`. An
 * optional `tint` fills the one meaningful mass (an animal's body, a banknote, a
 * figure's clothes); without it the glyph fills with parchment and reads as line art.
 *
 * Path coordinates and the viewBox are the only literal numbers allowed in a glyph
 * file — pen weights and the shared figure proportions live here.
 */
import type { ComponentType, ReactNode } from "react";
import Svg, { Circle, Path } from "react-native-svg";

import { useTheme } from "@/theme";

export type ObjectIconProps = {
  /** Rendered edge length in px. Defaults to the theme's `icon-md` step. */
  size?: number;
  /** Spot color for the glyph's one fillable mass. Omitted means monochrome. */
  tint?: string;
};

export type ObjectIconComponent = ComponentType<ObjectIconProps>;

/** The square every glyph is drawn in. All path coordinates are in these units. */
export const GLYPH_VIEWBOX = 32;

/** Pen weights, in viewBox units. Decided once for the whole icon set. */
export const GLYPH_PEN = {
  /** The silhouette. */
  bold: 2,
  /** Interior contours: a limb, a wing, a frame. */
  line: 1.4,
  /** Texture: fluting, hatching, whiskers. */
  hair: 1,
} as const;

export type GlyphPen = {
  /** Iron-gall ink. Every line. */
  ink: string;
  /** Parchment. The default fill. */
  paper: string;
  /** A mid tone for marks that read as texture rather than outline. */
  wash: string;
  /** The fillable mass: the `tint` when one was given, otherwise parchment. */
  spot: string;
};

/** The tones a glyph draws with, given the caller's optional tint. */
export function useGlyphPen(tint?: string): GlyphPen {
  const theme = useTheme();
  return {
    ink: theme.colors.foreground,
    paper: theme.colors.card,
    wash: theme.colors.mutedForeground,
    spot: tint ?? theme.colors.card,
  };
}

export type GlyphFrameProps = {
  size?: number;
  /** Accessible name, e.g. "Pregnant woman". */
  label: string;
  children: ReactNode;
};

/** The 32×32 stage every glyph draws on. */
export function GlyphFrame({ size, label, children }: GlyphFrameProps) {
  const theme = useTheme();
  const px = size ?? theme.iconSizes["icon-md"];
  return (
    <Svg
      width={px}
      height={px}
      viewBox={`0 0 ${GLYPH_VIEWBOX} ${GLYPH_VIEWBOX}`}
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

export type FigureSpec = {
  /** Head circle. */
  cx: number;
  cy: number;
  r: number;
  /** Body silhouette path. */
  body: string;
};

/**
 * The standing figures the person glyphs are built from. Keeping the proportions
 * here is what makes "a child" and "a teenager" read as the same family of drawing.
 */
export const FIGURES = {
  /** Neutral adult. */
  person: {
    cx: 16,
    cy: 8,
    r: 4.4,
    body: "M16 13 C12 13 9 16.4 9 21 V29 H23 V21 C23 16.4 20 13 16 13 Z",
  },
  /** Adult with squarer shoulders. */
  man: {
    cx: 16,
    cy: 8,
    r: 4.4,
    body: "M16 13 C11 13 8 16 8 20 V29 H24 V20 C24 16 21 13 16 13 Z",
  },
  /** Adult with an A-line silhouette. */
  woman: {
    cx: 16,
    cy: 8,
    r: 4.4,
    body: "M16 13 C12 13 9.6 16 9 20 L7 29 H25 L23 20 C22.4 16 20 13 16 13 Z",
  },
  /** Half-grown: narrower and a touch shorter. */
  teen: {
    cx: 16,
    cy: 9,
    r: 4,
    body: "M16 13.6 C12.8 13.6 10.4 16.4 10.4 20 V29 H21.6 V20 C21.6 16.4 19.2 13.6 16 13.6 Z",
  },
  /** Small, with the big head a child reads by. */
  child: {
    cx: 16,
    cy: 10.4,
    r: 4.2,
    body: "M16 15 C13 15 11 17.4 11 20.8 V29 H21 V20.8 C21 17.4 19 15 16 15 Z",
  },
  /** A child in a skirt. */
  childSkirt: {
    cx: 16,
    cy: 10.4,
    r: 4.2,
    body: "M16 15 C13 15 11.4 17.4 11 20.8 L9.4 29 H22.6 L21 20.8 C20.6 17.4 19 15 16 15 Z",
  },
} as const satisfies Record<string, FigureSpec>;

export type FigureName = keyof typeof FIGURES;

/** Head plus body for one of the shared figures. */
export function Figure({ name, pen }: { name: FigureName; pen: GlyphPen }) {
  const spec = FIGURES[name];
  return (
    <>
      <Path d={spec.body} fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Circle
        cx={spec.cx}
        cy={spec.cy}
        r={spec.r}
        fill={pen.paper}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
    </>
  );
}

/** Straight legs dropped from a body line — every four-footed glyph uses it. */
export function Legs({
  xs,
  top,
  bottom,
  pen,
}: {
  xs: readonly number[];
  top: number;
  bottom: number;
  pen: GlyphPen;
}) {
  return (
    <>
      {xs.map((x) => (
        <Path key={x} d={`M${x} ${top} V${bottom}`} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      ))}
    </>
  );
}
