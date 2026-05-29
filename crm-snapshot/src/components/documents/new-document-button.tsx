"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { PlusIcon } from "@/components/ui/icon";
import { createDocumentAction } from "@/app/(app)/docs/actions";
import { useToast } from "@/components/ui/toast";
import { TEMPLATES } from "@/lib/documents/templates";
import { cn } from "@/lib/utils";

export function NewDocumentButton({
  workspaceId,
  folderId,
  compact,
}: {
  workspaceId: string;
  folderId?: string | null;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>("blank");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  function create() {
    startTransition(async () => {
      const r = await createDocumentAction({
        workspaceId,
        folderId: folderId ?? null,
        templateKey: selected,
      });
      if (!r.ok) {
        toast({ title: "שגיאה", description: r.error, tone: "danger" });
        return;
      }
      setOpen(false);
      router.push(`/docs/${r.documentId}`);
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
          aria-label="מסמך חדש"
          className="h-7 w-7"
        >
          <PlusIcon className="h-4 w-4" />
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <PlusIcon /> מסמך חדש
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen} title="בחר תבנית" className="max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TEMPLATES.map((t) => (
            <button
              type="button"
              key={t.key}
              onClick={() => setSelected(t.key)}
              className={cn(
                "text-start rounded-xl border p-4 transition-all",
                selected === t.key
                  ? "border-brand-500 bg-brand-50"
                  : "border-surface-200 hover:border-surface-300",
              )}
            >
              <div className="font-semibold text-surface-900 mb-1">{t.label}</div>
              <div className="text-xs text-surface-600">{t.description}</div>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>ביטול</Button>
          <Button onClick={create} loading={pending}>צור מסמך</Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
