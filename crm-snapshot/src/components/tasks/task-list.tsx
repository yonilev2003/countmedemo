"use client";

import { useState, useTransition, useMemo } from "react";
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
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const [, startTransition] = useTransition();

  function toggleDone(t: TaskWithAssignee) {
    const next: TaskStatus = t.status === "done" ? "todo" : "done";
    startTransition(async () => {
      await updateTaskAction({ id: t.id, status: next });
      router.refresh();
    });
  }

  const { roots, childrenByParent } = useMemo(() => {
    const childrenByParent = new Map<string, TaskWithAssignee[]>();
    const roots: TaskWithAssignee[] = [];
    for (const t of tasks) {
      if (t.parent_task_id) {
        const arr = childrenByParent.get(t.parent_task_id) ?? [];
        arr.push(t);
        childrenByParent.set(t.parent_task_id, arr);
      } else {
        roots.push(t);
      }
    }
    // Orphans (parent not in tasks) → treat as roots
    for (const t of tasks) {
      if (t.parent_task_id && !tasks.some((x) => x.id === t.parent_task_id)) {
        roots.push(t);
      }
    }
    return { roots, childrenByParent };
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="text-center text-sm text-surface-500 py-12">
        אין עדיין משימות. הוסף משימה ראשונה או העלה גאנט.
      </div>
    );
  }

  function renderTask(t: TaskWithAssignee, depth: number) {
    const kids = childrenByParent.get(t.id) ?? [];
    const isCollapsed = !!collapsed[t.id];
    return (
      <li key={t.id}>
        <div
          className="flex items-center gap-3 p-3 hover:bg-surface-50 cursor-pointer"
          style={depth > 0 ? { paddingInlineStart: `${12 + depth * 24}px` } : undefined}
          onClick={() => setEditing(t)}
        >
          {kids.length > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCollapsed((prev) => ({ ...prev, [t.id]: !prev[t.id] }));
              }}
              className="h-5 w-5 flex items-center justify-center text-surface-500 hover:text-surface-800 shrink-0"
              aria-label={isCollapsed ? "פתח" : "סגור"}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          ) : (
            <span className="h-5 w-5 shrink-0" />
          )}
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
        </div>
        {!isCollapsed && kids.length > 0 && (
          <ul className="border-s-2 border-surface-200 ms-6">
            {kids.map((k) => renderTask(k, depth + 1))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <>
      <Card>
        <CardBody className="p-0">
          <ul className="divide-y divide-surface-100">
            {roots.map((t) => renderTask(t, 0))}
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
          allTasks={tasks}
        />
      )}
    </>
  );
}
