import * as TooltipPrimitive from "@rn-primitives/tooltip";
import type { ComponentProps } from "react";

import { overlayStyle, type PortalledProps } from "@/components/ui/overlay";
import { TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { spacing } from "@/theme";

export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  className,
  children,
  portalHost,
  sideOffset = spacing.xs,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Content> & PortalledProps) {
  return (
    <TooltipPrimitive.Portal hostName={portalHost}>
      <TooltipPrimitive.Overlay style={overlayStyle}>
        <TextClassContext value="font-body text-sm text-popover-foreground">
          <TooltipPrimitive.Content
            sideOffset={sideOffset}
            className={cn(
              "z-tooltip max-w-menu rounded-md border-hairline border-border bg-popover px-md py-sm shadow-ink-raised",
              className,
            )}
            {...props}
          >
            {children}
          </TooltipPrimitive.Content>
        </TextClassContext>
      </TooltipPrimitive.Overlay>
    </TooltipPrimitive.Portal>
  );
}
