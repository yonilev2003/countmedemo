import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TaskKanban } from "@/components/tasks/task-kanban";

export default async function KanbanPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await requireSession();
  const supabase = await createClient();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, assignee:profiles(id, full_name, avatar_url, email)")
    .eq("project_id", projectId)
    .order("position");

  const { data: members } = await supabase
    .from("workspace_members")
    .select("user_id, profile:profiles(id, full_name, email, avatar_url)")
    .eq("workspace_id", session.workspace.id);

  const memberList = (members ?? []).map((m) => {
    const mm = m as unknown as { user_id: string; profile: { id: string; full_name: string | null; email: string; avatar_url: string | null } };
    return mm.profile;
  });

  return (
    <div className="h-full overflow-x-auto overflow-y-hidden p-6">
      <TaskKanban
        tasks={(tasks ?? []) as unknown as Parameters<typeof TaskKanban>[0]["tasks"]}
        members={memberList}
        projectId={projectId}
      />
    </div>
  );
}
