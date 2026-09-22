/**
 * One option, as the builder draws it: the same smooth step line the outcome
 * view uses, with a way to cut it.
 *
 * The line itself is `BaseEdge` over `getSmoothStepPath`, handed the very bend
 * the bundle gave it — React Flow's own `smoothstep` component does exactly this
 * with the same `pathOptions`, so the two canvases draw the identical picture and
 * only this one carries a control.
 *
 * That control is a round × at the midpoint of the path, drawn only while the
 * edge is the one the reader is on (hovered or pinned through `FlowFocus`) or
 * selected. A button on every line would be twenty buttons on a small tree; a
 * button on the line you are already pointing at is the answer to "how do I get
 * rid of this one". Double-clicking the edge still cuts it too, for the reader
 * who found that first.
 */
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "@xyflow/react";
import type { SmoothStepPathOptions } from "@xyflow/system";
import { useState } from "react";
import { Pressable } from "react-native";

import { Text } from "@/components/ui";
import { useTheme } from "@/theme";

import { useBuilderActions } from "./builder-actions";
import { isFocused, optionHoverHandlers, useFlowFocus } from "./flow-focus";
import { edgeDeleteButtonStyle } from "./flow-style";
import type { AdventureFlowEdge } from "./use-adventure-graph";

/** The mark on the button. A cut line, not a warning: one glyph, no words. */
const CUT = "×";

export function OptionEdge({
  id,
  data,
  selected,
  style,
  markerStart,
  markerEnd,
  interactionWidth,
  pathOptions,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
}: EdgeProps<AdventureFlowEdge>) {
  const theme = useTheme();
  const { focus, hover } = useFlowFocus();
  const actions = useBuilderActions();
  const [hovered, setHovered] = useState(false);

  const bend = pathOptions as SmoothStepPathOptions | undefined;
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    offset: bend?.offset,
    borderRadius: bend?.borderRadius,
    stepPosition: bend?.stepPosition,
  });

  // The edge's own z-index is React Flow's business — it draws the focused line
  // in a layer of its own — so `style` (the stroke the graph toned) is all this
  // component has to pass on.
  const line = (
    <BaseEdge
      id={id}
      path={path}
      style={style}
      markerStart={markerStart}
      markerEnd={markerEnd}
      interactionWidth={interactionWidth}
    />
  );

  const lit = data !== undefined && isFocused(focus, data.nodeId, data.optionId);
  if (actions === null || data === undefined || !(lit || selected === true)) return line;
  const option = optionHoverHandlers(hover, data.nodeId, data.optionId);

  return (
    <>
      {line}
      {/*
        The label layer is a plain div over the canvas rather than part of the
        SVG, which is what lets the × be a real control. Its container has pointer
        events off, so the button asks for its own back in `flow-style`.
      */}
      <EdgeLabelRenderer>
        <Pressable
          // `nodrag nopan`: the canvas is otherwise dragged out from under a
          // press that starts on the button.
          className="nodrag nopan"
          accessibilityLabel="Disconnect this option"
          // Moving off the line and onto the button is still being on the line:
          // without this the focus lets go the moment the pointer arrives and the
          // button vanishes from under it.
          onPointerEnter={() => {
            setHovered(true);
            option.onPointerEnter();
          }}
          // And letting go of it here: the edge's own mouse-leave already fired
          // on the way in, so without this the line would stay lit for good.
          onPointerLeave={() => {
            setHovered(false);
            option.onPointerLeave();
          }}
          onPress={() => actions.disconnectOption(data.nodeId, data.optionId)}
          style={edgeDeleteButtonStyle(theme, { x: labelX, y: labelY, hovered })}
        >
          {/*
            Quiet ink at rest, red under the cursor: cutting a line is not worth
            a warning until you are about to do it. The same reading the kit's
            destructive Button takes.
          */}
          <Text className={hovered ? "text-destructive" : "text-muted-foreground"}>{CUT}</Text>
        </Pressable>
      </EdgeLabelRenderer>
    </>
  );
}

/** React Flow's edge-type registry. Module scope, so its identity never changes. */
export const adventureEdgeTypes = { option: OptionEdge } as const;
