import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DocsIcon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";
import { NewDocumentButton } from "@/components/documents/new-document-button";
import { Card, CardBody } from "@/components/ui/card";
import Link from "next/link";
import { relativeTime } from "@/lib/utils";

export default async function DocsIndex() {
  const session = await requireSession();
  const supabase = await createClient();

  const { data: recent } = await supabase
    .from("documents")
    .select("id, title, updated_at, updated_by_profile:profiles!documents_updated_by_fkey(full_name)")
    .eq("workspace_id", session.workspace.id)
    .order("updated_at", { ascending: false })
    .limit(10);

  if (!recent || recent.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <EmptyState
          icon={<DocsIcon />}
          title="אין עדיין מסמכים"
          description="צור מסמך חדש מתבנית או מאפס"
          action={<NewDocumentButton workspaceId={session.workspace.id} />}
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold font-display text-surface-900">מסמכים אחרונים</h1>
          <NewDocumentButton workspaceId={session.workspace.id} />
        </div>
        <Card>
          <CardBody className="p-0">
            <ul className="divide-y divide-surface-100">
              {recent.map((d) => {
                const updated = d.updated_by_profile as unknown as { full_name: string | null } | null;
                return (
                  <li key={d.id}>
                    <Link href={`/docs/${d.id}`} className="flex items-center justify-between p-4 hover:bg-surface-50">
                      <div className="flex items-center gap-3 min-w-0">
                        <DocsIcon className="text-surface-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-surface-900 truncate">{d.title}</div>
                          {updated?.full_name && (
                            <div className="text-xs text-surface-500">ע״י {updated.full_name}</div>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-surface-400 whitespace-nowrap">
                        {relativeTime(d.updated_at)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
