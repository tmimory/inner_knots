import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

import { Avatar } from "@/components/avatars";
import { Text } from "@/components/ui";
import type { Character } from "@/lib/domain/character";
import type { TrolleyDecisionSummary } from "@/lib/domain/summary";
import { cn } from "@/lib/utils";
import { useTheme, type Theme } from "@/theme";

import { TROLLEY, travel, type TrackId } from "./geometry";

/** How long one run down a track takes, and how long the caption then holds. */
const RUN_BEATS = 5;
const HOLD_BEATS = 1;

/** The wagon itself: ink line-work, the same pen as the object glyphs. */
export function TrolleyGlyph({ theme }: { theme: Theme }) {
  return (
    <Svg
      width={TROLLEY.width}
      height={TROLLEY.height}
      viewBox={TROLLEY.viewBox}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityRole="image"
      aria-label="Trolley"
    >
      <Path
        d={TROLLEY.body}
        fill={theme.colors.card}
        stroke={theme.colors.foreground}
        strokeWidth={theme.borderWidths.thick}
      />
      <Path d={TROLLEY.window} fill={theme.colors.muted} stroke={theme.colors.foreground} />
      <Path d={TROLLEY.roof} stroke={theme.colors.foreground} strokeWidth={theme.borderWidths.thick} />
      {TROLLEY.wheelXs.map((x) => (
        <Circle
          key={x}
          cx={x}
          cy={TROLLEY.wheelY}
          r={TROLLEY.wheelRadius}
          fill={theme.colors.background}
          stroke={theme.colors.foreground}
          strokeWidth={theme.borderWidths.thick}
        />
      ))}
    </Svg>
  );
}

/** One decision, as the animation needs it. */
type Play = {
  key: string;
  characterId: string;
  track: TrackId | null;
  error?: string;
};

function toPlay(decision: TrolleyDecisionSummary, index: number): Play {
  return {
    key: `${decision.characterId}-${decision.iteration}-${index}`,
    characterId: decision.characterId,
    track: decision.choice === "track1" ? 1 : decision.choice === "track2" ? 2 : null,
    error: decision.error,
  };
}

export type TrolleyAnimationProps = {
  /** The summary's decisions, in the order they completed. */
  decisions: readonly TrolleyDecisionSummary[];
  /** Faces for the captions; a character deleted mid-run simply has none. */
  characters: ReadonlyMap<string, Character>;
  /** The board's measured width, so the wagon leaves by the right edge. */
  width: number;
};

/**
 * The trolley, waiting at the junction and rolling once per decision.
 *
 * Decisions are played one at a time from a queue rather than driven directly by
 * the poll, because a fast run can land three answers between two polls and each
 * one is worth a second of attention. A decision that failed does not move the
 * wagon — there is no lever pull to show — but it still gets its caption, because
 * a model that would not answer is part of the result.
 *
 * It has no notion of which run it is watching: give it a `key` of the run id and
 * a new run remounts it, which rewinds the queue without a reset effect.
 */
export function TrolleyAnimation({ decisions, characters, width }: TrolleyAnimationProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const stops = useMemo(() => travel(width), [width]);

  const runMs = theme.durations.slow * RUN_BEATS;
  const holdMs = theme.durations.slow * HOLD_BEATS;

  const progress = useSharedValue(0);
  const lane = useSharedValue<number>(1);

  /** How many decisions have already had their moment. */
  const [shown, setShown] = useState(0);

  // The caption is derived, not stored: what is on stage is simply the decision
  // at `shown`, and the only state the queue needs is how far it has got.
  const pending = shown < decisions.length ? decisions[shown] : undefined;
  const current = pending === undefined ? null : toPlay(pending, shown);
  const playing = current?.key ?? null;
  const moving = current !== null && current.track !== null;
  const nextLane = current?.track === 2 ? 2 : 1;

  // Roll the wagon, then hand the stage to the next decision. The advance happens
  // in the timer rather than in an effect body, so no render cascades.
  useEffect(() => {
    if (playing === null) return;

    if (moving) {
      lane.value = nextLane;
      progress.value = 0;
      progress.value = reduceMotion
        ? 1
        : withTiming(1, { duration: runMs, easing: Easing.bezier(...theme.easings.standard) });
    }

    const timer = setTimeout(
      () => {
        progress.value = 0;
        setShown((value) => value + 1);
      },
      (moving && !reduceMotion ? runMs : 0) + holdMs,
    );
    return () => clearTimeout(timer);
    // `progress` and `lane` are reanimated shared values: stable boxes, not inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, moving, nextLane, holdMs, reduceMotion, runMs]);

  const style = useAnimatedStyle(() => {
    const { startX, endX, dropStart, dropEnd, topY, bottomY, liftY } = stops;
    const x = startX + progress.value * (endX - startX);
    const y =
      lane.value === 2
        ? interpolate(
            progress.value,
            [dropStart, dropEnd],
            [topY, bottomY],
            Extrapolation.CLAMP,
          )
        : topY;
    return {
      transform: [{ translateX: x - TROLLEY.width / 2 }, { translateY: y - liftY }],
    };
  });

  const character = current ? characters.get(current.characterId) : undefined;
  const caption = current
    ? current.track === null
      ? `${current.characterId} would not answer`
      : `${current.characterId} sent it down Track ${current.track}`
    : null;

  return (
    <>
      <Animated.View
        style={[{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }, style]}
        accessibilityElementsHidden
      >
        <TrolleyGlyph theme={theme} />
      </Animated.View>

      {caption ? (
        <View
          style={{ position: "absolute", left: 0, right: 0, top: 0, pointerEvents: "none" }}
          className="flex-row items-center justify-center gap-sm p-xs"
        >
          {character ? (
            <Avatar shape={character.avatar.shape} color={character.avatar.color} size="sm" />
          ) : null}
          <View
            className={cn(
              "rounded-full border-hairline bg-card px-sm py-xxs shadow-ink-soft",
              current?.error ? "border-destructive" : "border-border",
            )}
          >
            <Text variant="small" numberOfLines={1}>
              {caption}
            </Text>
          </View>
        </View>
      ) : null}
    </>
  );
}
