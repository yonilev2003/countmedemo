"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Task, TaskStatus } from "@/types/db";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { CheckIcon } from "@/components/ui/icon";
import { TaskFormDialog } from "./task-form-dialog";
import { updateTaskAction } from "@/app/(app)/tasks/actions";
import { formatDate, cn } from "@/lib/utils";

type Member = { id: string; full_name: string | null; email: string; avatar_url: string | null };

type TaskWithAssignee = Task & { assignee: Member | null };

const STATUS_LABELS: Record<TaskStatus, { label: string; tone: "neutral" | "brand" | "warning" | "success" | "danger" }> = {
  todo: { label: "לעשות", tone: "neutral" },
  in_progress: { label: "בעבודה", tone: "brand" },
  review: { label: "בבדיקה", tone: "warning" },
  done: { label: "הושלם", tone: "success" },
  blocked: { label: "תקוע", tone: "danger" },
};

export function TaskList({
  tasks,
  members,
  projectId,
}: {
  tasks: TaskWithAssignee[];
  members: Member[];
  projectId: string;
}) {
  const [editing, setEditing] = useState<TaskWithAssignee | null>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  function toggleDone(t: TaskWithAssignee) {
    const next: TaskStatus = t.status === "done" ? "todo" : "done";
    startTransition(async () => {
      await updateTaskAction({ id: t.id, status: next });
      router.refresh();
    });
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center text-sm text-surface-500 py-12">
        אין עדיין משימות. הוסף משימה ראשונה או העלה גאנט.
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardBody className="p-0">
          <ul className="divide-y divide-surface-100">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 p-3 hover:bg-surface-50 cursor-pointer"
                onClick={() => setEditing(t)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDone(t);
                  }}
                  className={cn(
                    "h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0",
                    t.status === "done"
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-surface-300 hover:border-brand-500",
                  )}
                  aria-label="סמן הושלם"
                >
                  {t.status === "done" && <CheckIcon className="h-3.5 w-3.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "text-sm font-medium truncate",
                    t.status === "done" ? "text-surface-400 line-through" : "text-surface-900",
                  )}>
                    {t.title}
                  </div>
                  {(t.start_date || t.end_date) && (
                    <div className="text-xs text-surface-500 mt-0.5">
                      {t.start_date && formatDate(t.start_date)}
                      {t.start_date && t.end_date && " ← "}
                      {t.end_date && formatDate(t.end_date)}
                    </div>
                  )}
                </div>
                <Badge tone={STATUS_LABELS[t.status].tone}>{STATUS_LABELS[t.status].label}</Badge>
                {t.assignee && (
                  <Avatar
                    name={t.assignee.full_name ?? t.assignee.email}
                    src={t.assignee.avatar_url}
                    size="xs"
                  />
                )}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

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
