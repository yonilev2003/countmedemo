"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { UploadIcon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { GanttReviewModal } from "./gantt-review-modal";
import { importGanttTasksAction } from "@/app/(app)/tasks/actions";
import type { ParsedGanttTask, GanttUncertainty } from "@/types/db";

type ParseResp = {
  importId: string;
  format: string;
  tasks: ParsedGanttTask[];
  uncertainties: GanttUncertainty[];
  notes?: string;
};

export function GanttUploadDialog({
  open,
  onOpenChange,
  projectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);
  const [parsed, setParsed] = useState<ParseResp | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    setParsed(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", projectId);

    try {
      const res = await fetch("/api/gantt/parse", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError({ message: data.error ?? "שגיאת פירוק", hint: data.hint });
        return;
      }
      setParsed(data as ParseResp);
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : "שגיאת רשת" });
    } finally {
      setBusy(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) upload(f);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) upload(f);
  }

  function importAll(finalTasks: ParsedGanttTask[]) {
    if (!parsed) return;
    startTransition(async () => {
      const r = await importGanttTasksAction({
        projectId,
        importId: parsed.importId,
        tasks: finalTasks,
      });
      if (!r.ok) {
        toast({ title: "ייבוא נכשל", description: r.error, tone: "danger" });
        return;
      }
      toast({
        title: "ייבוא הושלם",
        description: `${r.count} משימות נוספו לפרויקט`,
        tone: "success",
      });
      onOpenChange(false);
      setParsed(null);
      router.refresh();
    });
  }

  function closeAll() {
    onOpenChange(false);
    setParsed(null);
    setError(null);
  }

  if (parsed) {
    return (
      <GanttReviewModal
        open
        onOpenChange={closeAll}
        parsed={parsed}
        onConfirm={importAll}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={closeAll} title="העלאת גאנט" className="max-w-lg">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="rounded-xl border-2 border-dashed border-surface-300 hover:border-brand-400 bg-surface-50 p-8 text-center cursor-pointer transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        {busy ? (
          <div className="flex flex-col items-center gap-3">
            <Spinner size={32} />
            <p className="text-sm text-surface-700 font-medium">מנתח את הקובץ...</p>
            <p className="text-xs text-surface-500">PDF ותמונה עוברים דרך Claude. CSV/XLSX מקומי.</p>
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-3">
              <div className="h-12 w-12 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center">
                <UploadIcon className="h-6 w-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-surface-900 mb-1">גרור קובץ או לחץ לבחירה</p>
            <p className="text-xs text-surface-500">
              CSV · XLSX · PDF · PNG · JPG · MS Project XML
            </p>
            <p className="text-xs text-surface-400 mt-1">עד 25MB</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.webp,.xml"
          onChange={onFileChange}
        />
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-800">{error.message}</p>
          {error.hint && <p className="text-xs text-red-700 mt-1">{error.hint}</p>}
        </div>
      )}

      <DialogFooter>
        <Button variant="secondary" onClick={closeAll}>
          סגור
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
