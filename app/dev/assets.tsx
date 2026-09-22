/**
 * Asset preview bench. Not in the menu — open `/dev/assets` directly.
 *
 * Every avatar in three pigments at three sizes, the two pickers wired up, every
 * object glyph with its id, and the catalogue counted by tag. It exists so the art
 * can be eyeballed at the sizes it actually ships at.
 */
import { useMemo, useState } from "react";
import { View } from "react-native";

import { Avatar, AVATAR_SHAPES, ColorPicker, DEFAULT_AVATAR_SHAPE, ShapePicker, resolveAvatarColor } from "@/components/avatars";
import { OBJECT_ICON_IDS, ObjectGlyph } from "@/components/icons/objects";
import { Screen, Scroll } from "@/components/shell";
import { Badge, Button, Separator, Switch, Text } from "@/components/ui";
import {
  CATALOGUE_TAGS,
  buildCatalogue,
  familyOf,
  randomSelection,
  type TrolleyObject,
} from "@/lib/puzzles/trolley/catalogue";
import { useTheme } from "@/theme";

const PREVIEW_SIZES = ["sm", "lg", "xl"] as const;
const PREVIEW_PIGMENT_INDEXES = [0, 2, 3];

export default function AssetsScreen() {
  const theme = useTheme();
  const [shape, setShape] = useState<string>(DEFAULT_AVATAR_SHAPE);
  const [color, setColor] = useState<string>(theme.avatarPalette[0]?.id ?? "");
  const [tintIcons, setTintIcons] = useState(false);
  const [selection, setSelection] = useState<TrolleyObject[]>([]);

  const catalogue = useMemo(() => buildCatalogue(), []);
  const counts = useMemo(() => {
    const tally = new Map<string, number>();
    for (const item of catalogue) {
      for (const tag of item.tags) tally.set(tag, (tally.get(tag) ?? 0) + 1);
    }
    return tally;
  }, [catalogue]);

  const previewPigments = PREVIEW_PIGMENT_INDEXES.flatMap((index) => {
    const pigment = theme.avatarPalette[index];
    return pigment ? [pigment] : [];
  });
  const iconTint = tintIcons ? resolveAvatarColor(theme, color) : undefined;
  const previewPx = PREVIEW_SIZES.map((size) => theme.avatarSizes[`avatar-${size}`]).join(", ") + " px";

  return (
    <Screen
      title="Assets"
      subtitle="ὕλη · the drawings, laid out flat"
      right={<Badge variant="muted"><Text>dev only</Text></Badge>}
    >
      <Scroll>
        <Text variant="h3">Avatars</Text>
        <Text variant="muted">
          {`Fifteen shapes in three pigments, at ${previewPx}. Ink, parchment and shading follow the theme; only the tinted region takes the pigment.`}
        </Text>
        {previewPigments.map((pigment) => (
          <View key={pigment.id} className="gap-sm">
            <Text variant="small" className="font-display">
              {pigment.label}
            </Text>
            {PREVIEW_SIZES.map((previewSize) => (
              <View key={previewSize} className="flex-row flex-wrap items-center gap-sm">
                {AVATAR_SHAPES.map((entry) => (
                  <Avatar
                    key={entry.id}
                    shape={entry.id}
                    color={pigment.id}
                    size={previewSize}
                  />
                ))}
              </View>
            ))}
            <Separator />
          </View>
        ))}
      </Scroll>

      <Scroll>
        <Text variant="h3">Pickers</Text>
        <Text variant="muted">
          Selected: {shape} · {color}
        </Text>
        <View className="flex-row items-center gap-md">
          <Avatar shape={shape} color={color} size="xl" ring />
          <Avatar shape={shape} color={color} size="md" />
          <Avatar shape={shape} color={color} size="sm" />
        </View>
        <Separator />
        <ShapePicker value={shape} onChange={setShape} color={color} />
        <Separator />
        <ColorPicker value={color} onChange={setColor} />
      </Scroll>

      <Scroll>
        <View className="flex-row items-center justify-between gap-md">
          <Text variant="h3">Object glyphs</Text>
          <View className="flex-row items-center gap-sm">
            <Text variant="muted">tint</Text>
            <Switch checked={tintIcons} onCheckedChange={setTintIcons} />
          </View>
        </View>
        <Text variant="muted">
          {`${OBJECT_ICON_IDS.length} glyphs, drawn at ${theme.iconSizes["icon-md"]} px.`}
        </Text>
        <View className="flex-row flex-wrap gap-md">
          {OBJECT_ICON_IDS.map((id) => (
            <View
              key={id}
              className="w-4xl items-center gap-xxs rounded-md border-hairline border-border bg-background p-xs"
            >
              <ObjectGlyph icon={id} tint={iconTint} />
              <Text variant="muted" className="text-xs">
                {id}
              </Text>
            </View>
          ))}
        </View>
      </Scroll>

      <Scroll>
        <Text variant="h3">Catalogue</Text>
        <Text variant="muted">{catalogue.length} built-in objects.</Text>
        <View className="flex-row flex-wrap gap-sm">
          {CATALOGUE_TAGS.map((tag) => (
            <Badge key={tag} variant="outline">
              <Text>
                {tag} · {counts.get(tag) ?? 0}
              </Text>
            </Badge>
          ))}
        </View>
        <Separator />
        <View className="flex-row items-center gap-md">
          <Button onPress={() => setSelection(randomSelection(catalogue, 10))}>
            <Text>Draw ten</Text>
          </Button>
          <Text variant="muted">
            {selection.length > 0 ? "balanced across families" : "nothing drawn yet"}
          </Text>
        </View>
        <View className="gap-xs">
          {selection.map((item) => (
            <View key={item.id} className="flex-row items-center gap-sm">
              <ObjectGlyph icon={item.icon} />
              <Text variant="small" className="flex-1">
                {item.label}
              </Text>
              <Text variant="muted" className="text-xs">
                {item.prompt}
              </Text>
              <Badge variant="muted">
                <Text>{familyOf(item)}</Text>
              </Badge>
            </View>
          ))}
        </View>
      </Scroll>
    </Screen>
  );
}
