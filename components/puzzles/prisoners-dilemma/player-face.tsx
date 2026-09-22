import { View } from "react-native";

import { Avatar, medallionVariants, type AvatarSize } from "@/components/avatars";
import type { Character } from "@/lib/domain/character";
import { cn } from "@/lib/utils";

export type PlayerFaceProps = {
  /** The seated character, or nothing while the seat is empty. */
  character?: Character;
  size?: AvatarSize;
  /** Passed through to the medallion; off where the disc outweighs the drawing. */
  frame?: boolean;
  className?: string;
};

/**
 * One of the two seats, as a face: the character's medallion, or the dashed ring
 * an empty seat leaves.
 *
 * The empty ring is drawn from the medallion's own size variants, so a seat that
 * is waiting is exactly the size of the seat that is filled, and the screen has
 * one empty-seat treatment rather than one per table that draws a face.
 */
export function PlayerFace({ character, size = "sm", frame = true, className }: PlayerFaceProps) {
  if (character) {
    return (
      <Avatar
        shape={character.avatar.shape}
        color={character.avatar.color}
        size={size}
        frame={frame}
        className={className}
      />
    );
  }

  return (
    <View
      className={cn(
        medallionVariants({ size, frame: false }),
        "border-hairline border-dashed border-border",
        className,
      )}
    />
  );
}
