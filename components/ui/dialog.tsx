import * as DialogPrimitive from "@rn-primitives/dialog";
import type { ComponentProps } from "react";
import { View } from "react-native";

import { overlayStyle, type PortalledProps } from "@/components/ui/overlay";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  portalHost,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & PortalledProps) {
  return (
    <DialogPrimitive.Portal hostName={portalHost}>
      <DialogPrimitive.Overlay
        style={overlayStyle}
        className="z-modal items-center justify-center bg-foreground/scrim p-lg web:fixed web:inset-none"
      >
        <DialogPrimitive.Content
          className={cn(
            "w-full max-w-menu gap-md rounded-lg border-hairline border-border bg-popover p-xl shadow-ink-lifted",
            className,
          )}
          {...props}
        >
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Overlay>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, ...props }: ComponentProps<typeof View>) {
  return <View className={cn("gap-xs", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: ComponentProps<typeof View>) {
  return <View className={cn("flex-row justify-end gap-sm pt-sm", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("font-display text-xl text-popover-foreground", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("font-body text-base text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Text as DialogText };
