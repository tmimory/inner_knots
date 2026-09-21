import { Figure, GlyphFrame, useGlyphPen, type ObjectIconProps } from "./glyph";

export function ChildIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Child">
      <Figure name="child" pen={pen} />
    </GlyphFrame>
  );
}
