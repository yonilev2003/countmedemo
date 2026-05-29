import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DocumentEditorShell } from "@/components/documents/document-editor-shell";

export default async function DocPage({
  params,
}: {
  params: Promise<{ docId: string }>;
}) {
  const { docId } = await params;
  const session = await requireSession();
  const supabase = await createClient();

  const { data: document } = await supabase
    .from("documents")
    .select("*, author:profiles!documents_created_by_fkey(full_name)")
    .eq("id", docId)
    .eq("workspace_id", session.workspace.id)
    .single();
  if (!document) notFound();

  return (
    <DocumentEditorShell
      documentId={document.id}
      initialTitle={document.title}
      initialContent={document.content}
      updatedAt={document.updated_at}
    />
  );
}
