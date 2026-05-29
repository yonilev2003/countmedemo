"use client";

import { useState } from "react";
import type { ParsedGanttTask, GanttUncertainty } from "@/types/db";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ParseResp = {
  importId: string;
  format: string;
  tasks: ParsedGanttTask[];
  uncertainties: GanttUncertainty[];
  notes?: string;
};

export function GanttReviewModal({
  open,
  onOpenChange,
  parsed,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parsed: ParseResp;
  onConfirm: (tasks: ParsedGanttTask[]) => void;
}) {
  const [tasks, setTasks] = useState<ParsedGanttTask[]>(parsed.tasks);

  const uncertaintiesByIndex = new Map<number, GanttUncertainty[]>();
  for (const u of parsed.uncertainties) {
    const arr = uncertaintiesByIndex.get(u.task_index) ?? [];
    arr.push(u);
    uncertaintiesByIndex.set(u.task_index, arr);
  }

  function update(i: number, patch: Partial<ParsedGanttTask>) {
    setTasks((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  }

  function remove(i: number) {
    setTasks((prev) => prev.filter((_, idx) => idx !== i));
  }

  const totalUncertain = parsed.uncertainties.length;
  const remainingMissing = tasks.filter((t) => !t.start_date || !t.end_date).length;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="בדיקת המשימות לפני ייבוא"
      description={`${tasks.length} משימות זוהו מהקובץ. ${
        totalUncertain > 0
          ? `ב-${totalUncertain} שדות הייתי לא בטוח — בדוק ותקן.`
          : "הכל נראה תקין."
      }`}
      className="max-w-3xl"
    >
      {parsed.notes && (
        <div className="mb-3 rounded-lg bg-brand-50 border border-brand-200 p-3 text-sm text-brand-900">
          {parsed.notes}
        </div>
      )}

      <div className="max-h-[55vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-surface-500 sticky top-0 bg-white">
            <tr>
              <th className="text-start p-2">כותרת</th>
              <th className="text-start p-2 w-32">התחלה</th>
              <th className="text-start p-2 w-32">סיום</th>
              <th className="text-start p-2 w-20">ביטחון</th>
              <th className="text-start p-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t, i) => {
              const issues = uncertaintiesByIndex.get(i) ?? [];
              const startIssue = issues.find((u) => u.field === "start_date");
              const endIssue = issues.find((u) => u.field === "end_date");
              const lowConfidence = t.confidence < 0.7;
              return (
                <tr key={i} className={cn("border-t border-surface-100", lowConfidence && "bg-amber-50/50")}>
                  <td className="p-2">
                    <Input
                      value={t.title}
                      onChange={(e) => update(i, { title: e.target.value })}
                      className="!h-9 !text-sm"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="date"
                      value={t.start_date ?? ""}
                      onChange={(e) => update(i, { start_date: e.target.value || null })}
                      className={cn("!h-9 !text-sm", startIssue && "!border-amber-400")}
                    />
                    {startIssue && (
                      <div className="text-[10px] text-amber-700 mt-0.5">{startIssue.reason}</div>
                    )}
                  </td>
                  <td className="p-2">
                    <Input
                      type="date"
                      value={t.end_date ?? ""}
                      onChange={(e) => update(i, { end_date: e.target.value || null })}
                      className={cn("!h-9 !text-sm", endIssue && "!border-amber-400")}
                    />
                    {endIssue && (
                      <div className="text-[10px] text-amber-700 mt-0.5">{endIssue.reason}</div>
                    )}
                  </td>
                  <td className="p-2">
                    <Badge
                      tone={
                        t.confidence >= 0.85 ? "success" : t.confidence >= 0.6 ? "warning" : "danger"
                      }
                    >
                      {Math.round(t.confidence * 100)}%
                    </Badge>
                  </td>
                  <td className="p-2 text-end">
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="text-danger text-xs hover:underline"
                    >
                      הסר
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {remainingMissing > 0 && (
        <div className="mt-3 text-xs text-amber-700">
          ⚠ {remainingMissing} משימות עדיין ללא תאריכים — הן יוסיפו לפרויקט אבל לא יופיעו בגאנט עד שתוסיף תאריכים.
        </div>
      )}

      <DialogFooter>
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          ביטול
        </Button>
        <Button onClick={() => onConfirm(tasks)} disabled={tasks.length === 0}>
          יבא {tasks.length} משימות
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
