"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { TiptapDoc } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrashIcon } from "@/components/ui/icon";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { saveDocumentAction, deleteDocumentAction } from "@/app/(app)/docs/actions";
import { DocumentEditor } from "./document-editor";
import { relativeTime } from "@/lib/utils";

export function DocumentEditorShell({
  documentId,
  initialTitle,
  initialContent,
  updatedAt,
}: {
  documentId: string;
  initialTitle: string;
  initialContent: TiptapDoc;
  updatedAt: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState<TiptapDoc>(initialContent);
  const [savedAt, setSavedAt] = useState(updatedAt);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initial = useRef(true);

  // Debounced auto-save
  useEffect(() => {
    if (initial.current) {
      initial.current = false;
      return;
    }
    setStatus("saving");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const r = await saveDocumentAction({
        id: documentId,
        title: title.trim() || "מסמך ללא שם",
        content,
      });
      if (r.ok) {
        setSavedAt(new Date().toISOString());
        setStatus("saved");
      } else {
        setStatus("error");
      }
    }, 1200);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content]);

  async function remove() {
    const r = await deleteDocumentAction({ id: documentId });
    if (!r.ok) {
      toast({ title: "שגיאה", description: r.error, tone: "danger" });
      return;
    }
    toast({ title: "המסמך נמחק", tone: "success" });
    router.push("/docs");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-surface-200 px-6 py-3 flex items-center justify-between gap-4 bg-white">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="!h-9 !text-base font-semibold !border-transparent hover:!border-surface-200 focus:!border-brand-500 max-w-xl"
          placeholder="כותרת המסמך"
        />
        <div className="flex items-center gap-3">
          <span className="text-xs text-surface-500 whitespace-nowrap">
            {status === "saving" ? "שומר..." : status === "saved" ? `נשמר ${relativeTime(savedAt)}` : status === "error" ? "שגיאה בשמירה" : `עודכן ${relativeTime(savedAt)}`}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.open(`/api/documents/${documentId}/pdf`, "_blank")}
          >
            ייצא PDF
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setConfirmDelete(true)}
            aria-label="מחק"
          >
            <TrashIcon className="text-danger" />
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <DocumentEditor content={content} onChange={setContent} />
      </div>

      <Dialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="מחיקת מסמך"
        description="הפעולה הזו לא ניתנת לביטול."
      >
        <DialogFooter>
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>ביטול</Button>
          <Button variant="danger" onClick={remove}>מחק</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
