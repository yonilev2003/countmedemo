"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { TrashIcon } from "@/components/ui/icon";
import { removeMemberAction } from "./actions";
import { useToast } from "@/components/ui/toast";

export function RemoveMemberButton({ workspaceId, userId }: { workspaceId: string; userId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function remove() {
    startTransition(async () => {
      const r = await removeMemberAction({ workspaceId, userId });
      if (!r.ok) {
        toast({ title: "שגיאה", description: r.error, tone: "danger" });
        return;
      }
      toast({ title: "החבר הוסר", tone: "success" });
      setOpen(false);
    });
  }

  return (
    <>
      <Button size="icon" variant="ghost" onClick={() => setOpen(true)} aria-label="הסר חבר">
        <TrashIcon className="text-danger" />
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="הסרת חבר"
        description="הוא יאבד גישה לכל המידע במרחב הזה. אפשר להזמין שוב בעתיד."
      >
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            ביטול
          </Button>
          <Button variant="danger" onClick={remove} loading={pending}>
            הסר
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
