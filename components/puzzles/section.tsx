import type { ReactNode } from "react";

import { Scroll } from "@/components/shell";
import { FormSection, SectionHeading } from "@/components/ui";

export type SectionProps = {
  title: string;
  /** One line under the heading, in the screen's own voice. */
  description?: string;
  /** Controls that belong to this section, aligned to the end of the heading row. */
  right?: ReactNode;
  /**
   * Put the section back inside a bordered panel. For the rare block that is an
   * object rather than a step — the trolley canvas, the adventure graph — where
   * the frame says "this is one thing" instead of "here is a box".
   */
  framed?: boolean;
  /** Draw the hairline above the heading. Ignored when `framed`. */
  divider?: boolean;
  children?: ReactNode;
  className?: string;
};

/**
 * One titled step of a puzzle screen: a heading, an optional line of explanation,
 * the controls that act on it, and its content — separated from the step above by
 * a rule and a band of air rather than wrapped in a card.
 *
 * All three puzzle screens are the same shape — roster, framing, setup, run,
 * results — so five stacked panels made five unrelated objects out of one page.
 * The heading itself is shared with the character editor through
 * {@link SectionHeading}, so a section reads the same everywhere.
 */
export function Section({
  title,
  description,
  right,
  framed = false,
  divider = true,
  children,
  className,
}: SectionProps) {
  if (framed) {
    return (
      <Scroll className={className}>
        <SectionHeading title={title} description={description} right={right} />
        {children}
      </Scroll>
    );
  }

  return (
    <FormSection
      title={title}
      description={description}
      right={right}
      divider={divider}
      className={className}
    >
      {children}
    </FormSection>
  );
}
