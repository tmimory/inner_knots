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
      /**
       * A metadata line: "anthropic · claude-sonnet-5 · structured". Set in the
       * secondary ink rather than the tertiary one — at caption size the quietest
       * ink on the page stops being readable and starts being decoration.
       *
       * Captions, micro-labels and metadata all share `xs`, so a screen has one
       * size below the body instead of three that are nearly the same.
       */
      meta: "font-body text-xs text-muted-foreground",
      /** The quietest line on a screen: a footer, a marginal note. */
      subtle: "font-body text-xs text-subtle-foreground",
      /**
       * Numbers that are read as values rather than as prose: counts, ids, run
       * stats, table cells, durations.
       *
       * The body serif is an old-style face, so its figures are cased — `3` and
       * `7` drop below the baseline, `1` sits at x-height — and proportional, so
       * a column of them will not line up. `tabular` (theme/global.css) switches
       * the same face to lining, fixed-width figures, which is what a stat wants
       * and what a table column needs.
       */
      data: "font-body text-base tabular text-foreground",
      /**
       * The Greek subtitle voice. Body size, normal tracking, the Garamond italic
       * that actually carries polytonic glyphs — so it reads as an aside in the
       * same family rather than as a sans fallback that wandered in.
       */
      greek: "font-greek text-base tracking-normal text-muted-foreground",
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
