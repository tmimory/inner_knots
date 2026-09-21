import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { Pressable } from "react-native";

import { TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "flex-row items-center justify-center gap-sm rounded-md transition-colors duration-fast web:focus-visible:outline-none web:focus-visible:ring-thick web:focus-visible:ring-ring",
  {
    variants: {
      variant: {
        default: "bg-primary active:opacity-hover web:hover:opacity-hover",
        secondary: "bg-secondary active:opacity-hover web:hover:opacity-hover",
        outline: "border-hairline border-border bg-transparent active:bg-muted web:hover:bg-muted",
        ghost: "bg-transparent active:bg-muted web:hover:bg-muted",
        destructive: "bg-destructive active:opacity-hover web:hover:opacity-hover",
        link: "bg-transparent",
      },
      size: {
        sm: "h-control-sm px-md",
        default: "h-control-md px-lg",
        lg: "h-control-lg px-xl",
        icon: "h-control-icon w-control-icon px-none",
      },
      disabled: {
        true: "opacity-disabled",
        false: "",
      },
    },
    defaultVariants: { variant: "default", size: "default", disabled: false },
  },
);

const buttonTextVariants = cva("font-display text-sm", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      secondary: "text-secondary-foreground",
      outline: "text-foreground",
      ghost: "text-foreground",
      destructive: "text-destructive-foreground",
      link: "text-primary underline",
    },
    size: {
      sm: "text-xs",
      default: "text-sm",
      lg: "text-base",
      icon: "text-sm",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
});

export type ButtonProps = ComponentProps<typeof Pressable> &
  Omit<VariantProps<typeof buttonVariants>, "disabled">;

export function Button({ className, variant, size, disabled, ...props }: ButtonProps) {
  return (
    <TextClassContext value={buttonTextVariants({ variant, size })}>
      <Pressable
        role="button"
        disabled={disabled ?? false}
        className={cn(buttonVariants({ variant, size, disabled: disabled ?? false }), className)}
        {...props}
      />
    </TextClassContext>
  );
}

export { buttonTextVariants, buttonVariants };
