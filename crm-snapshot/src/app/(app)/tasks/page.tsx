import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TasksIcon, PlusIcon } from "@/components/ui/icon";
import { NewProjectButton } from "@/components/tasks/new-project-button";

export default async function TasksRootPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, color, updated_at, contact:contacts(name)")
    .eq("workspace_id", session.workspace.id)
    .order("updated_at", { ascending: false });

  // Per-project task stats
  const projIds = (projects ?? []).map((p) => p.id);
  const { data: stats } = projIds.length > 0
    ? await supabase
        .from("tasks")
        .select("project_id, status")
        .in("project_id", projIds)
    : { data: [] };

  const statsByProject = new Map<string, { total: number; done: number; open: number }>();
  for (const r of (stats ?? []) as Array<{ project_id: string; status: string }>) {
    const s = statsByProject.get(r.project_id) ?? { total: 0, done: 0, open: 0 };
    s.total++;
    if (r.status === "done") s.done++;
    else s.open++;
    statsByProject.set(r.project_id, s);
  }

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-surface-900">משימות וגאנט</h1>
          <p className="text-sm text-surface-600 mt-1">פרויקטים ומשימות של {session.workspace.name}</p>
        </div>
        <NewProjectButton workspaceId={session.workspace.id} />
      </div>

      {!projects || projects.length === 0 ? (
        <EmptyState
          icon={<TasksIcon />}
          title="אין עדיין פרויקטים"
          description="התחל פרויקט חדש כדי להוסיף משימות ולהעלות גאנט"
          action={<NewProjectButton workspaceId={session.workspace.id} />}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => {
            const s = statsByProject.get(p.id) ?? { total: 0, done: 0, open: 0 };
            const pct = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;
            const contact = p.contact as unknown as { name: string } | null;
            return (
              <Link key={p.id} href={`/tasks/${p.id}`}>
                <Card className="hover:border-brand-300 transition-colors h-full">
                  <CardBody>
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold shrink-0"
                        style={{ backgroundColor: p.color }}
                      >
                        {p.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-surface-900 truncate">{p.name}</h3>
                        {contact && (
                          <p className="text-xs text-surface-500 truncate">{contact.name}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-surface-500 flex items-center justify-between mb-1.5">
                      <span>{s.done}/{s.total} משימות הושלמו</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-100 overflow-hidden">
                      <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
                    </div>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
