"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { TaskStatus, ParsedGanttTask } from "@/types/db";

export async function createProjectAction(args: {
  workspaceId: string;
  name: string;
  color: string;
}): Promise<{ ok: true; projectId: string } | { ok: false; error: string }> {
  const user = await requireUser();
  const supabase = await createClient();
  const name = args.name.trim();
  if (!name) return { ok: false, error: "שם חובה" };

  const { data, error } = await supabase
    .from("projects")
    .insert({
      workspace_id: args.workspaceId,
      name,
      color: args.color,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/tasks");
  return { ok: true, projectId: data.id };
}

export async function upsertTaskAction(args: {
  id?: string;
  projectId: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  start_date: string | null;
  end_date: string | null;
  status: TaskStatus;
  progress: number;
}): Promise<{ ok: true; taskId: string } | { ok: false; error: string }> {
  const user = await requireUser();
  const supabase = await createClient();
  if (!args.title.trim()) return { ok: false, error: "כותרת חובה" };

  if (args.id) {
    const { data, error } = await supabase
      .from("tasks")
      .update({
        title: args.title,
        description: args.description,
        assignee_id: args.assignee_id,
        start_date: args.start_date,
        end_date: args.end_date,
        status: args.status,
        progress: args.progress,
      })
      .eq("id", args.id)
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/tasks/${args.projectId}`, "layout");
    return { ok: true, taskId: data.id };
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      project_id: args.projectId,
      title: args.title,
      description: args.description,
      assignee_id: args.assignee_id,
      start_date: args.start_date,
      end_date: args.end_date,
      status: args.status,
      progress: args.progress,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/tasks/${args.projectId}`, "layout");
  return { ok: true, taskId: data.id };
}

/** Partial update for inline drag/status changes. */
export async function updateTaskAction(args: {
  id: string;
  status?: TaskStatus;
  start_date?: string;
  end_date?: string;
  progress?: number;
  assignee_id?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser();
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (args.status !== undefined) patch.status = args.status;
  if (args.start_date !== undefined) patch.start_date = args.start_date;
  if (args.end_date !== undefined) patch.end_date = args.end_date;
  if (args.progress !== undefined) patch.progress = args.progress;
  if (args.assignee_id !== undefined) patch.assignee_id = args.assignee_id;
  const { error } = await supabase.from("tasks").update(patch).eq("id", args.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteTaskAction(args: {
  id: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", args.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function importGanttTasksAction(args: {
  projectId: string;
  importId: string;
  tasks: ParsedGanttTask[];
}): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const user = await requireUser();
  const supabase = await createClient();

  const rows = args.tasks.map((t, i) => ({
    project_id: args.projectId,
    title: t.title.slice(0, 500),
    description: t.description ?? null,
    start_date: t.start_date,
    end_date: t.end_date,
    progress: t.progress ?? 0,
    status: "todo" as TaskStatus,
    position: i,
    created_by: user.id,
  }));

  const { error } = await supabase.from("tasks").insert(rows);
  if (error) return { ok: false, error: error.message };

  await supabase
    .from("gantt_imports")
    .update({ status: "imported" })
    .eq("id", args.importId);

  revalidatePath(`/tasks/${args.projectId}`, "layout");
  return { ok: true, count: rows.length };
}
