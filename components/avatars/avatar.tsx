import { cva, type VariantProps } from "class-variance-authority";
import { View } from "react-native";

import { cn } from "@/lib/utils";
import { useTheme, type Theme } from "@/theme";

import { avatarShape } from "./shapes";

const medallionVariants = cva("items-center justify-center overflow-hidden rounded-full bg-card", {
  variants: {
    size: {
      sm: "h-avatar-sm w-avatar-sm",
      md: "h-avatar-md w-avatar-md",
      lg: "h-avatar-lg w-avatar-lg",
      xl: "h-avatar-xl w-avatar-xl",
    },
    ring: {
      true: "border-thick border-ring",
      false: "border-hairline border-border",
    },
  },
  defaultVariants: { size: "md", ring: false },
});

export type AvatarSize = NonNullable<VariantProps<typeof medallionVariants>["size"]>;

export type AvatarProps = {
  /** Shape id from `AVATAR_SHAPES`; an unknown id falls back to the first shape. */
  shape: string;
  /** Pigment id from `theme.avatarPalette`; an unknown id falls back to the first pigment. */
  color: string;
  size?: AvatarSize;
  /** Draws the medallion with the focus ring, for a selected or active avatar. */
  ring?: boolean;
  className?: string;
};

/** Resolve a pigment id to its hex, tolerating ids the palette no longer has. */
export function resolveAvatarColor(theme: Theme, id: string): string {
  const [first] = theme.avatarPalette;
  const match = theme.avatarPalette.find((pigment) => pigment.id === id) ?? first;
  return match?.hex ?? theme.colors.foreground;
}

/**
 * A character's face: one of fifteen ink drawings, tinted with one of twenty-five
 * pigments, inside a round parchment medallion.
 */
export function Avatar({ shape, color, size = "md", ring = false, className }: AvatarProps) {
  const theme = useTheme();
  const { Component, label } = avatarShape(shape);
  const px = theme.avatarSizes[`avatar-${size}`];

  return (
    <View
      className={cn(medallionVariants({ size, ring }), className)}
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      <Component color={resolveAvatarColor(theme, color)} size={px} />
    </View>
  );
}

export { medallionVariants };
