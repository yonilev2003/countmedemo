"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function acceptInviteAction(args: {
  token: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const admin = createAdminClient();

  const { data: invite, error: invErr } = await admin
    .from("invitations")
    .select("*")
    .eq("token", args.token)
    .single();

  if (invErr || !invite) return { ok: false, error: "ההזמנה לא נמצאה" };
  if (invite.accepted_at) return { ok: false, error: "כבר אושרה" };
  if (new Date(invite.expires_at) < new Date())
    return { ok: false, error: "ההזמנה פגה" };

  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return {
      ok: false,
      error: `ההזמנה נשלחה לכתובת אחרת (${invite.email}). התחבר עם המייל הנכון.`,
    };
  }

  // Add to workspace_members (idempotent)
  const { error: memErr } = await admin
    .from("workspace_members")
    .upsert(
      { workspace_id: invite.workspace_id, user_id: user.id, role: invite.role },
      { onConflict: "workspace_id,user_id" },
    );
  if (memErr) return { ok: false, error: memErr.message };

  // Mark invite as accepted
  await admin
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  redirect("/dashboard");
}
