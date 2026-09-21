import * as SeparatorPrimitive from "@rn-primitives/separator";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export type SeparatorProps = ComponentProps<typeof SeparatorPrimitive.Root>;

export function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: SeparatorProps) {
  return (
    <SeparatorPrimitive.Root
      orientation={orientation}
      decorative={decorative}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-hairline w-full" : "h-full w-hairline",
        className,
      )}
      {...props}
    />
  );
}
