"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { TiptapDoc } from "@/types/db";
import { getTemplate } from "@/lib/documents/templates";

export async function createDocumentAction(args: {
  workspaceId: string;
  folderId: string | null;
  templateKey: string;
}): Promise<{ ok: true; documentId: string } | { ok: false; error: string }> {
  const user = await requireUser();
  const supabase = await createClient();
  const tpl = getTemplate(args.templateKey);

  const { data, error } = await supabase
    .from("documents")
    .insert({
      workspace_id: args.workspaceId,
      folder_id: args.folderId,
      title: tpl.buildTitle(),
      content: tpl.buildContent(),
      template_key: tpl.key,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/docs", "layout");
  return { ok: true, documentId: data.id };
}

export async function saveDocumentAction(args: {
  id: string;
  title: string;
  content: TiptapDoc;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("documents")
    .update({
      title: args.title.slice(0, 500),
      content: args.content,
      updated_by: user.id,
    })
    .eq("id", args.id);
  if (error) return { ok: false, error: error.message };

  // Snapshot version on each save (cheap, can prune later)
  await supabase.from("document_versions").insert({
    document_id: args.id,
    content: args.content,
    created_by: user.id,
  });

  return { ok: true };
}

export async function deleteDocumentAction(args: {
  id: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("documents").delete().eq("id", args.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/docs", "layout");
  return { ok: true };
}

export async function createFolderAction(args: {
  workspaceId: string;
  parentFolderId: string | null;
  name: string;
}): Promise<{ ok: true; folderId: string } | { ok: false; error: string }> {
  const user = await requireUser();
  const supabase = await createClient();
  if (!args.name.trim()) return { ok: false, error: "שם חובה" };

  const { data, error } = await supabase
    .from("document_folders")
    .insert({
      workspace_id: args.workspaceId,
      parent_folder_id: args.parentFolderId,
      name: args.name.trim(),
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/docs", "layout");
  return { ok: true, folderId: data.id };
}
