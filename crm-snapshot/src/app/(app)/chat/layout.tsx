import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChannelList } from "@/components/chat/channel-list";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const supabase = await createClient();

  const { data: channels } = await supabase
    .from("channels")
    .select("id, name, type, topic, is_private")
    .eq("workspace_id", session.workspace.id)
    .order("created_at");

  // Fetch DM partners for each DM channel
  const dmIds = (channels ?? []).filter((c) => c.type === "dm").map((c) => c.id);
  const { data: dmMembers } = dmIds.length > 0
    ? await supabase
        .from("channel_members")
        .select("channel_id, user_id, profile:profiles(full_name, avatar_url, email)")
        .in("channel_id", dmIds)
    : { data: [] as unknown[] };

  const dmPartners = new Map<string, { full_name: string | null; avatar_url: string | null; email: string }>();
  for (const m of (dmMembers ?? []) as unknown as Array<{
    channel_id: string;
    user_id: string;
    profile: { full_name: string | null; avatar_url: string | null; email: string };
  }>) {
    if (m.user_id !== session.user.id) {
      dmPartners.set(m.channel_id, m.profile);
    }
  }

  const { data: people } = await supabase
    .from("workspace_members")
    .select("user_id, profile:profiles(*)")
    .eq("workspace_id", session.workspace.id);

  const peopleList = (people ?? [])
    .map((p) => {
      const pp = p as unknown as { user_id: string; profile: { id: string; full_name: string | null; email: string; avatar_url: string | null } };
      return { ...pp.profile, user_id: pp.user_id };
    })
    .filter((p) => p.user_id !== session.user.id);

  return (
    <div className="flex h-full">
      <ChannelList
        workspaceId={session.workspace.id}
        currentUserId={session.user.id}
        channels={(channels ?? []).map((c) => ({
          ...c,
          dmPartner: c.type === "dm" ? dmPartners.get(c.id) ?? null : null,
        }))}
        people={peopleList}
      />
      <div className="flex-1 flex flex-col bg-white border-s border-surface-200 min-w-0">
        {children}
      </div>
    </div>
  );
}
