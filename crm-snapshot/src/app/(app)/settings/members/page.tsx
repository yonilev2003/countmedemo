import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { InviteForm } from "./invite-form";
import { RemoveMemberButton } from "./remove-member-button";
import { RevokeInviteButton } from "./revoke-invite-button";

export default async function MembersPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const isAdmin = session.role === "owner" || session.role === "admin";

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("user_id, role, joined_at, profile:profiles(*)")
      .eq("workspace_id", session.workspace.id)
      .order("joined_at"),
    supabase
      .from("invitations")
      .select("*")
      .eq("workspace_id", session.workspace.id)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
  ]);

  const memberRows = (members ?? []) as unknown as Array<{
    user_id: string;
    role: "owner" | "admin" | "member";
    joined_at: string;
    profile: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null;
  }>;

  return (
    <div className="space-y-4">
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>הזמן אדם חדש</CardTitle>
          </CardHeader>
          <CardBody>
            <InviteForm workspaceId={session.workspace.id} />
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>חברים ({memberRows.length})</CardTitle>
        </CardHeader>
        <CardBody className="divide-y divide-surface-100 [&>*:not(:first-child)]:pt-3 [&>*:not(:last-child)]:pb-3">
          {memberRows.map((m) => (
            <div key={m.user_id} className="flex items-center gap-3">
              <Avatar
                name={m.profile?.full_name ?? m.profile?.email ?? "?"}
                src={m.profile?.avatar_url}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-surface-900 truncate">
                  {m.profile?.full_name ?? m.profile?.email}
                </div>
                <div className="text-xs text-surface-500 truncate">
                  {m.profile?.email}
                </div>
              </div>
              <Badge tone={m.role === "owner" ? "brand" : m.role === "admin" ? "purple" : "neutral"}>
                {m.role === "owner" ? "בעלים" : m.role === "admin" ? "מנהל" : "חבר"}
              </Badge>
              {isAdmin && m.role !== "owner" && m.user_id !== session.user.id && (
                <RemoveMemberButton workspaceId={session.workspace.id} userId={m.user_id} />
              )}
            </div>
          ))}
        </CardBody>
      </Card>

      {invites && invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>הזמנות פתוחות ({invites.length})</CardTitle>
          </CardHeader>
          <CardBody className="divide-y divide-surface-100 [&>*:not(:first-child)]:pt-3 [&>*:not(:last-child)]:pb-3">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-surface-100 text-surface-500 flex items-center justify-center">
                  ✉
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-surface-900 truncate">{inv.email}</div>
                  <div className="text-xs text-surface-500">
                    פג תוקף: {new Date(inv.expires_at).toLocaleDateString("he-IL")}
                  </div>
                </div>
                <Badge tone="neutral">{inv.role === "admin" ? "מנהל" : "חבר"}</Badge>
                {isAdmin && <RevokeInviteButton invitationId={inv.id} />}
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
