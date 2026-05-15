"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Task } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { GanttIcon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";
import { updateTaskAction } from "@/app/(app)/tasks/actions";
import { useToast } from "@/components/ui/toast";

type TaskWithAssignee = Task & { assignee: { full_name: string | null } | null };

const VIEW_MODES = ["Day", "Week", "Month"] as const;
type ViewMode = (typeof VIEW_MODES)[number];

const MODE_LABELS: Record<ViewMode, string> = {
  Day: "יום",
  Week: "שבוע",
  Month: "חודש",
};

export function GanttView({
  tasks,
  projectColor,
  projectId,
  dependenciesByTaskId,
}: {
  tasks: TaskWithAssignee[];
  projectColor: string;
  projectId: string;
  dependenciesByTaskId?: Record<string, string[]>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ganttRef = useRef<unknown>(null);
  const [mode, setMode] = useState<ViewMode>("Week");
  const router = useRouter();
  const { toast } = useToast();

  // Filter to tasks with both start + end dates
  const validTasks = tasks.filter((t) => t.start_date && t.end_date);

  useEffect(() => {
    if (!containerRef.current || validTasks.length === 0) return;

    let cancelled = false;

    (async () => {
      const Gantt = (await import("frappe-gantt")).default;
      if (cancelled || !containerRef.current) return;

      // Clear container
      containerRef.current.innerHTML = "";

      const validIds = new Set(validTasks.map((t) => t.id));
      const ganttTasks = validTasks.map((t) => ({
        id: t.id,
        name: t.title,
        start: t.start_date as string,
        end: t.end_date as string,
        progress: t.progress,
        dependencies: (dependenciesByTaskId?.[t.id] ?? [])
          .filter((depId) => validIds.has(depId))
          .join(","),
        custom_class:
          t.status === "done" ? "gantt-bar-done"
            : t.status === "blocked" ? "gantt-bar-blocked"
            : t.status === "in_progress" ? "gantt-bar-active"
            : "",
      }));

      const gantt = new Gantt(containerRef.current, ganttTasks, {
        view_mode: mode,
        language: "en",
        bar_height: 28,
        bar_corner_radius: 6,
        padding: 18,
        on_date_change: async (task: { id: string }, start: Date, end: Date) => {
          const r = await updateTaskAction({
            id: task.id,
            start_date: start.toISOString().slice(0, 10),
            end_date: end.toISOString().slice(0, 10),
          });
          if (!r.ok) {
            toast({ title: "שגיאה בעדכון", description: r.error, tone: "danger" });
          } else {
            router.refresh();
          }
        },
        on_progress_change: async (task: { id: string }, progress: number) => {
          await updateTaskAction({ id: task.id, progress: Math.round(progress) });
          router.refresh();
        },
      });

      ganttRef.current = gantt;
    })();

    return () => {
      cancelled = true;
    };
  }, [validTasks, mode, projectId, router, toast, dependenciesByTaskId]);

  if (tasks.length === 0) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            icon={<GanttIcon />}
            title="אין משימות בפרויקט"
            description="הוסף משימה ראשונה או העלה גאנט מקובץ"
          />
        </CardBody>
      </Card>
    );
  }

  if (validTasks.length === 0) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            icon={<GanttIcon />}
            title="אין משימות עם תאריכים"
            description="כדי שמשימה תופיע בגאנט, צריך תאריך התחלה ותאריך סיום"
          />
        </CardBody>
      </Card>
    );
  }

  const skipped = tasks.length - validTasks.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-surface-600 me-2">תצוגה:</span>
        {VIEW_MODES.map((m) => (
          <Button
            key={m}
            size="sm"
            variant={mode === m ? "primary" : "secondary"}
            onClick={() => setMode(m)}
          >
            {MODE_LABELS[m]}
          </Button>
        ))}
        {skipped > 0 && (
          <span className="text-xs text-surface-500 ms-auto">
            ({skipped} משימות בלי תאריכים — לא מוצגות)
          </span>
        )}
      </div>
      <Card>
        <CardBody className="p-2">
          <div className="gantt-rtl-wrap overflow-x-auto">
            <style>{`
              .gantt-rtl-wrap .gantt .bar { fill: ${projectColor}; }
              .gantt-rtl-wrap .gantt .bar-progress { fill: color-mix(in oklab, ${projectColor} 60%, white); }
              .gantt-rtl-wrap .gantt .bar-done .bar { fill: #10b981; }
              .gantt-rtl-wrap .gantt .bar-done .bar-progress { fill: #6ee7b7; }
              .gantt-rtl-wrap .gantt .bar-blocked .bar { fill: #ef4444; }
              .gantt-rtl-wrap .gantt .bar-active .bar { fill: ${projectColor}; }
              .gantt-rtl-wrap .gantt .bar-label { fill: white; font-weight: 600; font-size: 12px; direction: rtl; }
              .gantt-rtl-wrap .gantt .grid-header { fill: #f1f3f7; }
              .gantt-rtl-wrap .gantt .lower-text, .gantt-rtl-wrap .gantt .upper-text { fill: #475467; font-size: 12px; }
            `}</style>
            <svg ref={(el) => {
              // frappe-gantt expects a div; we mount a div instead.
            }} />
            <div ref={containerRef} />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
