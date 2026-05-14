import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChannelHeader } from "@/components/chat/channel-header";
import { MessageList } from "@/components/chat/message-list";
import { MessageComposer } from "@/components/chat/message-composer";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;
  const session = await requireSession();
  const supabase = await createClient();

  const { data: channel } = await supabase
    .from("channels")
    .select("*")
    .eq("id", channelId)
    .eq("workspace_id", session.workspace.id)
    .single();
  if (!channel) notFound();

  // Resolve DM partner if applicable
  let displayName = channel.name ?? "ערוץ";
  if (channel.type === "dm") {
    const { data: members } = await supabase
      .from("channel_members")
      .select("user_id, profile:profiles(full_name, email)")
      .eq("channel_id", channelId);
    const partner = (members ?? []).find((m) => {
      const mm = m as unknown as { user_id: string };
      return mm.user_id !== session.user.id;
    }) as unknown as { profile: { full_name: string | null; email: string } } | undefined;
    displayName = partner?.profile?.full_name ?? partner?.profile?.email ?? "שיחה";
  }

  // Initial messages page (last 50)
  const { data: initialMessages } = await supabase
    .from("messages")
    .select("*, author:profiles(*)")
    .eq("channel_id", channelId)
    .is("parent_message_id", null)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <>
      <ChannelHeader
        title={displayName}
        topic={channel.topic}
        type={channel.type}
      />
      <MessageList
        channelId={channelId}
        currentUserId={session.user.id}
        initialMessages={(initialMessages ?? []).reverse()}
      />
      <MessageComposer channelId={channelId} placeholder={`כתוב הודעה ל-${displayName}...`} />
    </>
  );
}
