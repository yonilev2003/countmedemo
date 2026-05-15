import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GanttView } from "@/components/tasks/gantt-view";

export default async function GanttPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await requireSession();
  const supabase = await createClient();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, assignee:profiles(full_name)")
    .eq("project_id", projectId)
    .order("start_date", { nullsFirst: false });

  const { data: project } = await supabase
    .from("projects")
    .select("color")
    .eq("id", projectId)
    .single();

  // Fetch dependencies for tasks in this project
  const taskIds = (tasks ?? []).map((t) => (t as { id: string }).id);
  const depsByTaskId: Record<string, string[]> = {};
  if (taskIds.length > 0) {
    const { data: deps } = await supabase
      .from("task_dependencies")
      .select("task_id, depends_on_task_id")
      .in("task_id", taskIds);
    for (const d of (deps ?? []) as Array<{ task_id: string; depends_on_task_id: string }>) {
      const arr = depsByTaskId[d.task_id] ?? [];
      arr.push(d.depends_on_task_id);
      depsByTaskId[d.task_id] = arr;
    }
  }

  return (
    <div className="h-full overflow-auto p-6">
      <GanttView
        projectId={projectId}
        projectColor={project?.color ?? "#1a84e8"}
        tasks={(tasks ?? []) as unknown as Parameters<typeof GanttView>[0]["tasks"]}
        dependenciesByTaskId={depsByTaskId}
      />
    </div>
  );
}
