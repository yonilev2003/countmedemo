import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TaskList } from "@/components/tasks/task-list";

export default async function ProjectListPage({
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
    .order("position")
    .order("created_at");

  const { data: members } = await supabase
    .from("workspace_members")
    .select("user_id, profile:profiles(id, full_name, email, avatar_url)")
    .eq("workspace_id", session.workspace.id);

  const memberList = (members ?? []).map((m) => {
    const mm = m as unknown as { user_id: string; profile: { id: string; full_name: string | null; email: string; avatar_url: string | null } };
    return mm.profile;
  });

  return (
    <div className="h-full overflow-y-auto p-6">
      <TaskList
        tasks={(tasks ?? []) as unknown as Parameters<typeof TaskList>[0]["tasks"]}
        members={memberList}
        projectId={projectId}
      />
    </div>
  );
}
