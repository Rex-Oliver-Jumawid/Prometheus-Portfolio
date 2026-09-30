"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { useState, useTransition, type ReactElement } from "react";

import { Button } from "@/components/ui/button";

interface ConfirmationDialogProps {
  trigger: ReactElement;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => Promise<boolean | void> | boolean | void;
}

export function ConfirmationDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  onConfirm,
}: ConfirmationDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await onConfirm();
      if (result !== false) setOpen(false);
    });
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger render={trigger} />
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-40 min-h-dvh bg-black/35 backdrop-blur-[2px] transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <AlertDialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <AlertDialog.Popup className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-2xl transition-[transform,opacity] duration-150 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0">
            <AlertDialog.Title className="text-lg font-semibold tracking-tight">
              {title}
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
              {description}
            </AlertDialog.Description>
            <div className="mt-6 flex justify-end gap-2">
              <AlertDialog.Close
                render={<Button variant="outline" disabled={isPending} />}
              >
                Cancel
              </AlertDialog.Close>
              <Button
                variant="destructive"
                disabled={isPending}
                onClick={confirm}
              >
                {isPending ? "Working…" : confirmLabel}
              </Button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
