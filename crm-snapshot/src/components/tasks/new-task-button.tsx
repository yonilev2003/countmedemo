"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@/components/ui/icon";
import { TaskFormDialog } from "./task-form-dialog";

type Member = { id: string; full_name: string | null; email: string; avatar_url: string | null };
type TaskPick = { id: string; title: string; parent_task_id: string | null };

export function NewTaskButton({
  projectId,
  members,
  allTasks,
}: {
  projectId: string;
  members: Member[];
  allTasks?: TaskPick[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon /> משימה חדשה
      </Button>
      <TaskFormDialog
        open={open}
        onOpenChange={setOpen}
        projectId={projectId}
        members={members}
        allTasks={allTasks}
      />
    </>
  );
}
