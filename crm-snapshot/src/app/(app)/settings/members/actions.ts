"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, renderInvitationEmail } from "@/lib/email";
import { env } from "@/lib/env";

export async function inviteMemberAction(args: {
  workspaceId: string;
  email: string;
  role: "member" | "admin";
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const supabase = await createClient();

  const email = args.email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return { ok: false, error: "אימייל לא תקין" };
  }

  // Verify the user is admin/owner of the workspace
  const { data: me } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", args.workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!me || (me.role !== "owner" && me.role !== "admin")) {
    return { ok: false, error: "אין לך הרשאה" };
  }

  // Per-workspace rate-limit: max 10 invitations per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .from("invitations")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", args.workspaceId)
    .gte("created_at", oneHourAgo);
  if ((recentCount ?? 0) >= 10) {
    return { ok: false, error: "יותר מדי הזמנות בשעה האחרונה — נסה שוב מאוחר יותר" };
  }

  // Already a member?
  const { data: existing } = await supabase
    .from("workspace_members")
    .select("user_id, profile:profiles!inner(email)")
    .eq("workspace_id", args.workspaceId);
  if (
    (existing ?? []).some((row) => {
      const r = row as unknown as { profile: { email: string } };
      return r.profile.email.toLowerCase() === email;
    })
  ) {
    return { ok: false, error: "המייל הזה כבר חבר" };
  }

  // Use admin to insert + read back the token (we're already authorized at this point)
  const admin = createAdminClient();
  const { data: invite, error } = await admin
    .from("invitations")
    .insert({
      workspace_id: args.workspaceId,
      email,
      role: args.role,
      invited_by: user.id,
    })
    .select("token, workspace:workspaces(name)")
    .single();
  if (error || !invite) return { ok: false, error: error?.message ?? "Failed" };

  const ws = invite.workspace as unknown as { name: string };
  const acceptUrl = `${env.appUrl}/invite/${invite.token}`;

  // Get inviter display name
  const { data: inviterProfile } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();
  const inviterName = inviterProfile?.full_name ?? inviterProfile?.email ?? "חבר צוות";

  try {
    await sendEmail({
      to: email,
      subject: `הוזמנת ל-${ws.name} ב-countme CRM`,
      html: renderInvitationEmail({
        workspaceName: ws.name,
        inviterName,
        acceptUrl,
        role: args.role,
      }),
    });
  } catch (e) {
    // Email failed but invite was created — return the link so admin can share manually
    return {
      ok: false,
      error: `ההזמנה נוצרה אבל המייל נכשל. שלח את הקישור ידנית: ${acceptUrl}`,
    };
  }

  revalidatePath("/settings/members");
  return { ok: true };
}

export async function removeMemberAction(args: {
  workspaceId: string;
  userId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: me } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", args.workspaceId)
    .eq("user_id", user.id)
    .single();
  if (!me || (me.role !== "owner" && me.role !== "admin")) {
    return { ok: false, error: "אין לך הרשאה" };
  }

  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", args.workspaceId)
    .eq("user_id", args.userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings/members");
  return { ok: true };
}

export async function revokeInvitationAction(args: {
  invitationId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("invitations")
    .delete()
    .eq("id", args.invitationId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings/members");
  return { ok: true };
}
