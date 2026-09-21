import { Circle, Ellipse, Path } from "react-native-svg";

import { GLYPH_PEN, GlyphFrame, Legs, useGlyphPen, type ObjectIconProps } from "./glyph";

export function PigIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Pig">
      <Path d="M3.6 18.6 C1 18 0.6 15 2.6 14.6 C4 14.4 4 16.4 2.6 16.8" stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Legs xs={[7, 11, 17, 21]} top={26.4} bottom={29.6} pen={pen} />
      <Path
        d="M10 14 C6 14 3.4 17 3.4 20.6 C3.4 24 6 26.4 10 26.4 H19 C23 26.4 25.6 24 25.6 20.6 C25.6 17 23 14 19 14 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Path d="M21.6 12.6 L20.6 8.6 L24.6 11 Z" fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path d="M27.6 12 L29.4 8.6 L30.4 12.6 Z" fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Circle cx={24.6} cy={17.4} r={5.4} fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Ellipse cx={29} cy={18.6} rx={2.4} ry={2} fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Circle cx={28.2} cy={18.6} r={0.6} fill={pen.ink} />
      <Circle cx={29.8} cy={18.6} r={0.6} fill={pen.ink} />
      <Circle cx={24.6} cy={15.4} r={0.9} fill={pen.ink} />
    </GlyphFrame>
  );
}
