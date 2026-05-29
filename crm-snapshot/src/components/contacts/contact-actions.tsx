"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Contact } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { PencilIcon, TrashIcon } from "@/components/ui/icon";
import { ContactFormDialog } from "./contact-form-dialog";
import { deleteContactAction } from "@/app/(app)/contacts/actions";
import { useToast } from "@/components/ui/toast";

export function ContactActions({
  contact,
  workspaceId,
}: {
  contact: Contact;
  workspaceId: string;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  function remove() {
    startTransition(async () => {
      const r = await deleteContactAction({ id: contact.id });
      if (!r.ok) {
        toast({ title: "שגיאה", description: r.error, tone: "danger" });
        return;
      }
      toast({ title: "נמחק", tone: "success" });
      router.push("/contacts");
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={() => setEditOpen(true)}>
          <PencilIcon /> ערוך
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setConfirmOpen(true)} aria-label="מחק">
          <TrashIcon className="text-danger" />
        </Button>
      </div>

      <ContactFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        workspaceId={workspaceId}
        contact={contact}
      />

      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="מחיקת איש קשר"
        description="הפעולה הזו תמחק גם את כל הפעילויות הקשורות. אין דרך לשחזר."
      >
        <DialogFooter>
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>ביטול</Button>
          <Button variant="danger" onClick={remove} loading={pending}>מחק</Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
