import { cva, type VariantProps } from "class-variance-authority";
import { createContext, use, type ComponentProps } from "react";
import { Text as RNText } from "react-native";

import { cn } from "@/lib/utils";

/**
 * Lets a container (Button, Badge, Card) set the text classes its children inherit,
 * so callers write `<Button><Text>Save</Text></Button>` without repeating colors.
 */
export const TextClassContext = createContext<string | undefined>(undefined);

export const textVariants = cva("text-foreground", {
  variants: {
    variant: {
      h1: "font-display text-3xl text-primary",
      h2: "font-display text-2xl text-foreground",
      h3: "font-display text-xl text-foreground",
      h4: "font-display text-lg text-foreground",
      p: "font-body text-base text-foreground",
      lead: "font-body text-lg text-muted-foreground",
      muted: "font-body text-sm text-muted-foreground",
      small: "font-body text-sm text-foreground",
      greek: "font-greek text-lg text-muted-foreground",
      code: "font-mono text-sm text-foreground",
    },
  },
  defaultVariants: { variant: "p" },
});

export type TextProps = ComponentProps<typeof RNText> & VariantProps<typeof textVariants>;

export function Text({ className, variant, ...props }: TextProps) {
  const inherited = use(TextClassContext);
  return <RNText className={cn(textVariants({ variant }), inherited, className)} {...props} />;
}
