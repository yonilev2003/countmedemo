"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Task, TaskStatus } from "@/types/db";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { upsertTaskAction, deleteTaskAction } from "@/app/(app)/tasks/actions";

type Member = { id: string; full_name: string | null; email: string; avatar_url: string | null };

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "לעשות" },
  { value: "in_progress", label: "בעבודה" },
  { value: "review", label: "בבדיקה" },
  { value: "done", label: "הושלם" },
  { value: "blocked", label: "תקוע" },
];

export function TaskFormDialog({
  open,
  onOpenChange,
  projectId,
  task,
  members,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  task?: Task;
  members: Member[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [delPending, startDelete] = useTransition();

  const [form, setForm] = useState({
    title: task?.title ?? "",
    description: task?.description ?? "",
    assignee_id: task?.assignee_id ?? "",
    start_date: task?.start_date ?? "",
    end_date: task?.end_date ?? "",
    status: task?.status ?? ("todo" as TaskStatus),
    progress: task?.progress ?? 0,
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await upsertTaskAction({
        id: task?.id,
        projectId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        assignee_id: form.assignee_id || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        status: form.status,
        progress: Number(form.progress) || 0,
      });
      if (!r.ok) {
        toast({ title: "שגיאה", description: r.error, tone: "danger" });
        return;
      }
      toast({ title: task ? "עודכן" : "נוצר", tone: "success" });
      onOpenChange(false);
      router.refresh();
    });
  }

  function remove() {
    if (!task) return;
    startDelete(async () => {
      const r = await deleteTaskAction({ id: task.id });
      if (!r.ok) {
        toast({ title: "שגיאה", description: r.error, tone: "danger" });
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={task ? "ערוך משימה" : "משימה חדשה"} className="max-w-xl">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="כותרת">
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            autoFocus
            maxLength={500}
          />
        </Field>
        <Field label="תיאור">
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="תאריך התחלה">
            <Input
              type="date"
              value={form.start_date ?? ""}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </Field>
          <Field label="תאריך סיום">
            <Input
              type="date"
              value={form.end_date ?? ""}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            />
          </Field>
          <Field label="אחראי">
            <Select
              value={form.assignee_id}
              onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}
            >
              <option value="">— ללא —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name ?? m.email}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="סטטוס">
            <Select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={`התקדמות: ${form.progress}%`}>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={form.progress}
            onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })}
            className="w-full"
          />
        </Field>
        <DialogFooter>
          {task && (
            <Button type="button" variant="ghost" onClick={remove} loading={delPending} className="text-danger me-auto">
              מחק
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button type="submit" loading={pending}>
            {task ? "שמור" : "צור"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
