import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Text } from "@/components/ui/text";

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** What is about to happen, and what survives it. */
  description?: string;
  /** The word on the button that goes through with it. */
  confirmLabel?: string;
  /** The word on the button that does not. */
  cancelLabel?: string;
  /** Draws the confirming button in the destructive tone. */
  destructive?: boolean;
  /** True while the action is in flight; the confirming button says so and waits. */
  loading?: boolean;
  onConfirm: () => void;
};

/**
 * "Are you sure?", once.
 *
 * Deleting a character, a node, an adventure or an object all asked the same
 * question in four hand-built dialogs; they ask it here now, so the wording of
 * the buttons and the order they sit in cannot drift apart.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onPress={() => onOpenChange(false)}>
            <Text>{cancelLabel}</Text>
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={loading}
            onPress={onConfirm}
          >
            <Text>{loading ? "Working…" : confirmLabel}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
