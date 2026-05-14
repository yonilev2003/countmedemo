// Server-only auth helpers. Use from Server Components / Server Actions / Route Handlers.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoMode, DEMO_USER_ID } from "@/lib/demo/mode";
import type { Profile, Workspace, MemberRole } from "@/types/db";

export interface SessionContext {
  user: {
    id: string;
    email: string;
  };
  profile: Profile;
  workspace: Workspace;
  role: MemberRole;
}

const DEMO_USER = { id: DEMO_USER_ID, email: "dana@countme.app" };

/** Returns the logged-in user, or redirects to /login. */
export async function requireUser() {
  if (isDemoMode()) return DEMO_USER;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || !data.user.email) {
    redirect("/login");
  }
  return { id: data.user.id, email: data.user.email };
}

/** Returns null if not logged in (no redirect). */
export async function getUser() {
  if (isDemoMode()) return DEMO_USER;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user || !data.user.email) return null;
  return { id: data.user.id, email: data.user.email };
}

/**
 * Requires a logged-in user AND an active workspace.
 * If the user has no workspace, redirects to /onboarding.
 * Returns the active session context.
 */
export async function requireSession(): Promise<SessionContext> {
  const user = await requireUser();
  const supabase = await createClient();

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) {
    redirect("/login");
  }

  // Fetch first workspace (we'll improve this when multi-workspace switching is added)
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("role, workspace:workspaces(*)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })
    .limit(1);

  const first = memberships?.[0];
  if (!first || !first.workspace) {
    redirect("/onboarding");
  }

  const workspace = first.workspace as unknown as Workspace;

  return {
    user,
    profile,
    workspace,
    role: first.role as MemberRole,
  };
}

/** Used during onboarding flow — fetches user without forcing a workspace. */
export async function requireUserWithProfile() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  return { user, profile };
}

/**
 * Atomically create a workspace + add the creator as owner.
 * Uses admin client to bypass RLS during the brief window where the
 * member row doesn't exist yet.
 */
export async function createWorkspaceForUser(args: {
  userId: string;
  name: string;
  slug: string;
}): Promise<Workspace> {
  const admin = createAdminClient();

  const { data: ws, error } = await admin
    .from("workspaces")
    .insert({ name: args.name, slug: args.slug, owner_id: args.userId })
    .select("*")
    .single<Workspace>();

  if (error || !ws) {
    throw new Error(`Failed to create workspace: ${error?.message ?? "unknown"}`);
  }

  const { error: memErr } = await admin
    .from("workspace_members")
    .insert({ workspace_id: ws.id, user_id: args.userId, role: "owner" });

  if (memErr) {
    throw new Error(`Failed to add owner membership: ${memErr.message}`);
  }

  // Seed default channel
  await admin.from("channels").insert({
    workspace_id: ws.id,
    name: "general",
    type: "channel",
    topic: "ערוץ ראשי",
    created_by: args.userId,
  });

  return ws;
}
