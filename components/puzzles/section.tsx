import type { ReactNode } from "react";

import { Scroll } from "@/components/shell";
import { FormSection } from "@/components/ui";

export type SectionProps = {
  title: string;
  /** One line under the heading, in the screen's own voice. */
  description?: string;
  /** Controls that belong to this section, aligned to the end of the heading row. */
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/**
 * One titled step of a puzzle screen: a Scroll panel around a {@link FormSection},
 * so the heading reads exactly as it does on the character editor.
 *
 * All three puzzle screens are the same shape — roster, framing, setup, run,
 * results — so they are built from these rather than each inventing a panel.
 */
export function Section({ title, description, right, children, className }: SectionProps) {
  return (
    <Scroll className={className}>
      <FormSection title={title} description={description} right={right}>
        {children}
      </FormSection>
    </Scroll>
  );
}
