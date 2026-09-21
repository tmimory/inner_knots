import { Circle, Path, Rect } from "react-native-svg";

import { GLYPH_PEN, GlyphFrame, useGlyphPen, type ObjectIconProps } from "./glyph";

export function RobotIcon({ size, tint }: ObjectIconProps) {
  const pen = useGlyphPen(tint);
  return (
    <GlyphFrame size={size} label="Robot">
      <Path d="M16 4.6 V2" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Circle cx={16} cy={1.6} r={1.4} fill={pen.ink} />
      <Path d="M8.6 5 H23.4 V15 H8.6 Z" fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Rect x={11.4} y={8} width={3.4} height={3.4} rx={1.2} fill={pen.ink} />
      <Rect x={17.2} y={8} width={3.4} height={3.4} rx={1.2} fill={pen.ink} />
      <Path d="M12.6 13 H19.4" stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Path d="M10 16.6 H22 V26 H10 Z" fill={pen.spot} stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
      <Path d="M5 17.6 H10 V22.6 H5 Z" fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Path d="M22 17.6 H27 V22.6 H22 Z" fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Circle cx={16} cy={20.6} r={2.4} fill={pen.paper} stroke={pen.ink} strokeWidth={GLYPH_PEN.hair} />
      <Path d="M12.6 26 V29.4 M19.4 26 V29.4" stroke={pen.ink} strokeWidth={GLYPH_PEN.line} />
    </GlyphFrame>
  );
}
