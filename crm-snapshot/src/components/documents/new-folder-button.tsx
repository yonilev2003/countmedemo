"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Input, Field } from "@/components/ui/input";
import { FolderIcon, PlusIcon } from "@/components/ui/icon";
import { createFolderAction } from "@/app/(app)/docs/actions";
import { useToast } from "@/components/ui/toast";

export function NewFolderButton({
  workspaceId,
  parentFolderId,
  compact,
}: {
  workspaceId: string;
  parentFolderId: string | null;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await createFolderAction({ workspaceId, parentFolderId, name });
      if (!r.ok) {
        toast({ title: "שגיאה", description: r.error, tone: "danger" });
        return;
      }
      setOpen(false);
      setName("");
      router.refresh();
    });
  }

  return (
    <>
      {compact ? (
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setOpen(true)}
          aria-label="תיקייה חדשה"
          className="h-7 w-7"
        >
          <FolderIcon className="h-4 w-4" />
        </Button>
      ) : (
        <Button variant="secondary" onClick={() => setOpen(true)}>
          <PlusIcon /> תיקייה חדשה
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen} title="תיקייה חדשה">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="שם התיקייה">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              maxLength={100}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button type="submit" loading={pending}>
              צור
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
