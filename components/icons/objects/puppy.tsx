import { Circle, Path } from "react-native-svg";

import { GLYPH_PEN, GlyphFrame, Legs, useGlyphPen, type ObjectIconProps } from "./glyph";

export function PuppyIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Puppy">
      <Path d="M6.4 21 C3.6 20 3.4 16.6 6 16" stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Legs xs={[9, 12.6, 17, 20.6]} top={26.6} bottom={29.6} pen={pen} />
      <Path
        d="M11 18 C8 18 6 20 6 23 C6 25.6 8 27 11 27 H18 C21 27 23 25.6 23 23 C23 20 21 18 18 18 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Path d="M19.4 9 C16.6 8.4 16.4 13 18.6 15.6 Z" fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path d="M27.4 9 C30.2 8.4 30.4 13 28.2 15.6 Z" fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Circle cx={23.4} cy={13.4} r={5.4} fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Circle cx={24.6} cy={16} r={2.4} fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Circle cx={21.4} cy={12.4} r={0.9} fill={pen.ink} />
      <Circle cx={26} cy={12.4} r={0.9} fill={pen.ink} />
      <Circle cx={24.6} cy={15} r={0.9} fill={pen.ink} />
    </GlyphFrame>
  );
}
