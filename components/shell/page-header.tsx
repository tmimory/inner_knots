import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

/**
 * How wide a screen's column is.
 *
 * `full` lets the content use the whole content measure — the right mode for a
 * canvas, a wide table, a grid of cards. `reading` caps it at `layout.reading`
 * and centres it in the pane, which is what a form or a list of rows wants: the
 * header shares the column, so its action lands on the content's right edge, and
 * the margins either side are equal. Pinned to the left axis the same column left
 * a third of a 1440px window visibly unused, which reads as an unfinished page
 * rather than a measured one.
 */
export type ScreenWidth = "reading" | "full";

/**
 * The column class for a width mode; `full` adds nothing.
 *
 * `self-center` rather than `mx-auto`: it is the one centring React Native and the
 * web agree on, so the native build centres the column too.
 */
export function widthClasses(width: ScreenWidth): string | undefined {
  return width === "reading" ? "w-full max-w-reading self-center" : undefined;
}

/** Where a page sits: the one link back up, above the title. */
export type Breadcrumb = { label: string; href: Href };

export type PageHeaderProps = {
  title: string;
  /**
   * The page above this one. Rendered as "← label" over the title block, because
   * where a page sits is not a thing you do with it and does not belong in the row
   * of actions on the right.
   */
  breadcrumb?: Breadcrumb;
  subtitle?: string;
  /** Actions rendered at the end of the title row: one action, or a muted count. */
  right?: ReactNode;
  /** The column this header is measured against. Defaults to `full`. */
  width?: ScreenWidth;
  className?: string;
};

/**
 * Title block at the top of every screen.
 *
 * The `right` slot sits beside the whole title block rather than on the title's
 * line alone, and is centred against both lines of it. Aligned to the title only,
 * a 40px button sat a clear step above the optical centre of a two-line block and
 * read as having drifted up off the subtitle; centred on the block it reads as
 * belonging to the heading as a whole. There is no rule under the header any
 * more: the first section draws its own, and two hairlines a few pixels apart
 * read as a mistake.
 */
export function PageHeader({
  title,
  subtitle,
  breadcrumb,
  right,
  width = "full",
  className,
}: PageHeaderProps) {
  const router = useRouter();

  const header = (
    <View
      className={cn(
        "gap-md wide:flex-row wide:items-center wide:justify-between",
        breadcrumb ? undefined : widthClasses(width),
        breadcrumb ? undefined : className,
      )}
    >
      <View className="gap-xs wide:flex-1">
        <Text variant="h1">{title}</Text>
        {subtitle ? <Text variant="greek">{subtitle}</Text> : null}
      </View>
      {right ? (
        <View className="flex-row flex-wrap items-center gap-sm">{right}</View>
      ) : null}
    </View>
  );

  if (!breadcrumb) return header;

  return (
    <View className={cn("gap-xs", widthClasses(width), className)}>
      <Pressable
        role="link"
        className="self-start"
        onPress={() => router.push(breadcrumb.href)}
      >
        <Text variant="meta" className="transition-colors duration-fast web:hover:text-primary">
          {`← ${breadcrumb.label}`}
        </Text>
      </Pressable>
      {header}
    </View>
  );
}
