import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FolderTree } from "@/components/documents/folder-tree";

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const supabase = await createClient();

  const [{ data: folders }, { data: documents }] = await Promise.all([
    supabase
      .from("document_folders")
      .select("id, name, parent_folder_id")
      .eq("workspace_id", session.workspace.id)
      .order("name"),
    supabase
      .from("documents")
      .select("id, title, folder_id, updated_at")
      .eq("workspace_id", session.workspace.id)
      .order("updated_at", { ascending: false }),
  ]);

  return (
    <div className="flex h-full">
      <FolderTree
        workspaceId={session.workspace.id}
        folders={folders ?? []}
        documents={documents ?? []}
      />
      <div className="flex-1 bg-white border-s border-surface-200 min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
