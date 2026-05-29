import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChevronRightIcon } from "@/components/ui/icon";
import { ProjectViewTabs } from "@/components/tasks/project-view-tabs";
import { NewTaskButton } from "@/components/tasks/new-task-button";
import { GanttUploadButton } from "@/components/tasks/gantt-upload-button";

export default async function ProjectLayout({
  params,
  children,
}: {
  params: Promise<{ projectId: string }>;
  children: React.ReactNode;
}) {
  const { projectId } = await params;
  const session = await requireSession();
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("workspace_id", session.workspace.id)
    .single();
  if (!project) notFound();

  // Members for assignee picker
  const { data: members } = await supabase
    .from("workspace_members")
    .select("user_id, profile:profiles(id, full_name, email, avatar_url)")
    .eq("workspace_id", session.workspace.id);

  const memberList = (members ?? []).map((m) => {
    const mm = m as unknown as { user_id: string; profile: { id: string; full_name: string | null; email: string; avatar_url: string | null } };
    return mm.profile;
  });

  // Tasks for parent/dependency pickers in the New Task dialog
  const { data: tasksForPickers } = await supabase
    .from("tasks")
    .select("id, title, parent_task_id")
    .eq("project_id", project.id)
    .order("position");
  const taskPicks = (tasksForPickers ?? []) as Array<{ id: string; title: string; parent_task_id: string | null }>;

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-surface-200 bg-white">
        <div className="px-6 pt-4">
          <Link
            href="/tasks"
            className="inline-flex items-center gap-1 text-xs text-surface-500 hover:text-surface-700 mb-2"
          >
            <ChevronRightIcon className="h-3.5 w-3.5" /> חזרה לפרויקטים
          </Link>
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="h-9 w-9 rounded-lg flex items-center justify-center text-white font-bold shrink-0"
                style={{ backgroundColor: project.color }}
              >
                {project.name.slice(0, 1).toUpperCase()}
              </div>
              <h1 className="text-xl font-bold font-display text-surface-900 truncate">
                {project.name}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <GanttUploadButton projectId={project.id} />
              <NewTaskButton projectId={project.id} members={memberList} allTasks={taskPicks} />
            </div>
          </div>
          <ProjectViewTabs projectId={project.id} />
        </div>
      </header>
      <div className="flex-1 overflow-hidden bg-surface-50">{children}</div>
    </div>
  );
}
