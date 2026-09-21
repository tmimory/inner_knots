import { Circle, Path } from "react-native-svg";

import { GLYPH_PEN, GlyphFrame, useGlyphPen, type ObjectIconProps } from "./glyph";

export function BirdIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Bird">
      <Path d="M11 27.6 V30.4 M8.6 30.4 H13.6 M16.6 26.6 V30.4 M14.2 30.4 H19.2" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Path
        d="M4.6 22 C1.6 24 0.8 27 1.8 29 L7.4 25.4 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Path
        d="M12 11 C7 11 4 15.6 4 20.4 C4 25.4 7.6 28 12 28 C17.6 28 22 24 22 18.8 C22 14.4 18 11 12 11 Z"
        fill={pen.spot}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.line}
      />
      <Path d="M21.4 15.4 L29 17.4 L21.4 19.4 Z" fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path
        d="M9 18 C12.6 16 17 17 19 20 C16 23.4 10.6 23 9 18 Z"
        fill={pen.paper}
        stroke={pen.ink}
        strokeWidth={GLYPH_PEN.hair}
      />
      <Circle cx={18.4} cy={15.4} r={1} fill={pen.ink} />
    </GlyphFrame>
  );
}
