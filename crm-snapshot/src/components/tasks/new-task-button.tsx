"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@/components/ui/icon";
import { TaskFormDialog } from "./task-form-dialog";

type Member = { id: string; full_name: string | null; email: string; avatar_url: string | null };

export function NewTaskButton({ projectId, members }: { projectId: string; members: Member[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon /> משימה חדשה
      </Button>
      <TaskFormDialog open={open} onOpenChange={setOpen} projectId={projectId} members={members} />
    </>
  );
}
