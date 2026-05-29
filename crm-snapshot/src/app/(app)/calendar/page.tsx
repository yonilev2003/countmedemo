import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/calendar/calendar-view";

export default async function CalendarPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const inThreeMonths = new Date();
  inThreeMonths.setMonth(inThreeMonths.getMonth() + 3);

  const { data: events } = await supabase
    .from("calendar_events")
    .select("*, attendees:event_attendees(*, user:profiles(full_name, email, avatar_url))")
    .eq("workspace_id", session.workspace.id)
    .gte("start_at", monthAgo.toISOString())
    .lte("start_at", inThreeMonths.toISOString())
    .order("start_at");

  const { data: members } = await supabase
    .from("workspace_members")
    .select("user_id, profile:profiles(id, full_name, email, avatar_url)")
    .eq("workspace_id", session.workspace.id);

  const memberList = (members ?? []).map((m) => {
    const mm = m as unknown as { user_id: string; profile: { id: string; full_name: string | null; email: string; avatar_url: string | null } };
    return mm.profile;
  });

  const { data: googleTokens } = await supabase
    .from("user_google_tokens")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  return (
    <div className="h-full p-4 lg:p-6">
      <CalendarView
        events={(events ?? []) as unknown as Parameters<typeof CalendarView>[0]["events"]}
        members={memberList}
        currentUserId={session.user.id}
        googleConnected={!!googleTokens}
      />
    </div>
  );
}
