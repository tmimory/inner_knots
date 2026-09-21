import { Figure, GlyphFrame, useGlyphPen, type ObjectIconProps } from "./glyph";

export function PersonIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Person">
      <Figure name="person" pen={pen} />
    </GlyphFrame>
  );
}
