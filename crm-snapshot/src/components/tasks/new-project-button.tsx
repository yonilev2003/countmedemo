"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Input, Field } from "@/components/ui/input";
import { PlusIcon } from "@/components/ui/icon";
import { createProjectAction } from "@/app/(app)/tasks/actions";
import { useToast } from "@/components/ui/toast";

const COLORS = ["#1a84e8", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#0ea5e9", "#84cc16"];

export function NewProjectButton({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await createProjectAction({ workspaceId, name, color });
      if (!r.ok) {
        toast({ title: "שגיאה", description: r.error, tone: "danger" });
        return;
      }
      setOpen(false);
      setName("");
      router.push(`/tasks/${r.projectId}`);
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon /> פרויקט חדש
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title="פרויקט חדש">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="שם הפרויקט">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="למשל: הקמת אתר ללקוח X"
            />
          </Field>
          <Field label="צבע">
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-9 w-9 rounded-lg border-2 transition-all ${
                    color === c ? "border-surface-900 scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
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
