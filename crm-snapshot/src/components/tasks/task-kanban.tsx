"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Task, TaskStatus } from "@/types/db";
import { Avatar } from "@/components/ui/avatar";
import { TaskFormDialog } from "./task-form-dialog";
import { updateTaskAction } from "@/app/(app)/tasks/actions";
import { formatDate, cn } from "@/lib/utils";

type Member = { id: string; full_name: string | null; email: string; avatar_url: string | null };
type TaskWithAssignee = Task & { assignee: Member | null };

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: "todo", label: "לעשות", color: "bg-surface-100" },
  { id: "in_progress", label: "בעבודה", color: "bg-brand-100" },
  { id: "review", label: "בבדיקה", color: "bg-amber-100" },
  { id: "done", label: "הושלם", color: "bg-emerald-100" },
  { id: "blocked", label: "תקוע", color: "bg-red-100" },
];

export function TaskKanban({
  tasks,
  members,
  projectId,
}: {
  tasks: TaskWithAssignee[];
  members: Member[];
  projectId: string;
}) {
  const [editing, setEditing] = useState<TaskWithAssignee | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  function moveTo(taskId: string, status: TaskStatus) {
    startTransition(async () => {
      await updateTaskAction({ id: taskId, status });
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex gap-4 h-full pb-4">
        {COLUMNS.map((col) => {
          const items = tasks.filter((t) => t.status === col.id);
          return (
            <div
              key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                if (id) moveTo(id, col.id);
                setDraggedId(null);
              }}
              className="w-72 shrink-0 flex flex-col rounded-xl bg-white border border-surface-200"
            >
              <div className={cn("rounded-t-xl px-3 py-2 flex items-center justify-between", col.color)}>
                <span className="text-sm font-semibold text-surface-800">{col.label}</span>
                <span className="text-xs text-surface-600 bg-white/70 px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {items.map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", t.id);
                      setDraggedId(t.id);
                    }}
                    onDragEnd={() => setDraggedId(null)}
                    onClick={() => setEditing(t)}
                    className={cn(
                      "rounded-lg border border-surface-200 bg-white p-3 cursor-pointer hover:border-brand-300 transition-colors",
                      draggedId === t.id && "opacity-50",
                    )}
                  >
                    <div className="text-sm font-medium text-surface-900 mb-1">{t.title}</div>
                    {(t.start_date || t.end_date) && (
                      <div className="text-xs text-surface-500 mb-2">
                        {t.end_date ? `עד ${formatDate(t.end_date)}` : t.start_date ? `מ-${formatDate(t.start_date)}` : ""}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      {t.progress > 0 && (
                        <div className="flex-1 h-1.5 bg-surface-100 rounded-full overflow-hidden me-2">
                          <div className="h-full bg-brand-500" style={{ width: `${t.progress}%` }} />
                        </div>
                      )}
                      {t.assignee && (
                        <Avatar
                          name={t.assignee.full_name ?? t.assignee.email}
                          src={t.assignee.avatar_url}
                          size="xs"
                        />
                      )}
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="text-xs text-surface-400 text-center py-4">— ריק —</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <TaskFormDialog
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
          projectId={projectId}
          task={editing}
          members={members}
        />
      )}
    </>
  );
}
