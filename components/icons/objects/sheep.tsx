import { Circle, Ellipse, Path } from "react-native-svg";

import { GLYPH_PEN, GlyphFrame, Legs, useGlyphPen, type ObjectIconProps } from "./glyph";

export function SheepIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Sheep">
      <Legs xs={[9, 13, 19, 22.6]} top={26} bottom={29.6} pen={pen} />
      <Path
        d="M11 13 C7.6 13 5 15.4 5 18.6 C3.4 19.4 3.4 22.4 5.4 23.4 C5.4 26 8 27.6 11 27 C13 28.6 17.6 28.6 19.6 27 C22.6 27.6 25 26 25 23.4 C27 22.4 27 19.4 25.4 18.6 C25.4 15.4 22.6 13 19.4 13 C17.4 11.4 13 11.4 11 13 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Path d="M23.8 14.4 C21.6 13.4 21.4 16 23.2 16.6 Z" fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Path d="M29.4 14.4 C31.4 13.4 31.6 16 29.8 16.6 Z" fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Ellipse cx={26.6} cy={17.4} rx={3.4} ry={4} fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Circle cx={27.4} cy={16.4} r={0.9} fill={pen.ink} />
      <Path d="M25.4 20.6 C26.6 21.4 27.6 21.4 28.4 20.6" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
    </GlyphFrame>
  );
}
