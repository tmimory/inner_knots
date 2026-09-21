import * as SelectPrimitive from "@rn-primitives/select";
import type { ComponentProps } from "react";

import { overlayStyle, type PortalledProps } from "@/components/ui/overlay";
import { TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;
export type SelectOption = SelectPrimitive.Option;

export function SelectTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <TextClassContext value="font-body text-base text-foreground">
      <SelectPrimitive.Trigger
        className={cn(
          "h-control-md flex-row items-center justify-between gap-sm rounded-md border-hairline border-border bg-input px-md",
          "web:focus-visible:outline-none web:focus-visible:ring-thick web:focus-visible:ring-ring",
          className,
        )}
        {...props}
      >
        {children}
      </SelectPrimitive.Trigger>
    </TextClassContext>
  );
}

export function SelectContent({
  className,
  children,
  portalHost,
  ...props
}: ComponentProps<typeof SelectPrimitive.Content> & PortalledProps) {
  return (
    <SelectPrimitive.Portal hostName={portalHost}>
      <SelectPrimitive.Overlay style={overlayStyle}>
        <SelectPrimitive.Content
          className={cn(
            "z-overlay min-w-menu rounded-md border-hairline border-border bg-popover p-xxs shadow-ink-lifted",
            className,
          )}
          {...props}
        >
          {children}
        </SelectPrimitive.Content>
      </SelectPrimitive.Overlay>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({
  className,
  label,
  value,
  ...props
}: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <TextClassContext value="font-body text-base text-popover-foreground">
      <SelectPrimitive.Item
        label={label}
        value={value}
        className={cn(
          "h-control-sm flex-row items-center justify-between rounded-sm px-md",
          "active:bg-muted web:hover:bg-muted",
          className,
        )}
        {...props}
      >
        <SelectPrimitive.ItemText className="font-body text-base text-popover-foreground" />
        <SelectPrimitive.ItemIndicator className="ml-sm h-sm w-sm rounded-full bg-primary" />
      </SelectPrimitive.Item>
    </TextClassContext>
  );
}

export function SelectLabel({ className, ...props }: ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      className={cn("px-md py-xs font-display text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

export function SelectSeparator({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.Separator>) {
  return <SelectPrimitive.Separator className={cn("my-xxs h-hairline bg-border", className)} {...props} />;
}
