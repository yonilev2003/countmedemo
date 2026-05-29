"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ContactStatus, ActivityType } from "@/types/db";

export async function upsertContactAction(args: {
  id?: string;
  workspaceId: string;
  name: string;
  company: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  status: ContactStatus;
  tags: string[];
  notes: string | null;
}): Promise<{ ok: true; contactId: string } | { ok: false; error: string }> {
  const user = await requireUser();
  const supabase = await createClient();

  if (!args.name.trim()) return { ok: false, error: "שם חובה" };

  if (args.id) {
    const { data, error } = await supabase
      .from("contacts")
      .update({
        name: args.name,
        company: args.company,
        role: args.role,
        email: args.email,
        phone: args.phone,
        status: args.status,
        tags: args.tags,
        notes: args.notes,
      })
      .eq("id", args.id)
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/contacts/${args.id}`);
    revalidatePath("/contacts");
    return { ok: true, contactId: data.id };
  }

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      workspace_id: args.workspaceId,
      name: args.name,
      company: args.company,
      role: args.role,
      email: args.email,
      phone: args.phone,
      status: args.status,
      tags: args.tags,
      notes: args.notes,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/contacts");
  return { ok: true, contactId: data.id };
}

export async function deleteContactAction(args: {
  id: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("contacts").delete().eq("id", args.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/contacts");
  return { ok: true };
}

export async function addActivityAction(args: {
  contactId: string;
  type: ActivityType;
  body: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("contact_activities").insert({
    contact_id: args.contactId,
    type: args.type,
    body: args.body,
    created_by: user.id,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/contacts/${args.contactId}`);
  return { ok: true };
}
