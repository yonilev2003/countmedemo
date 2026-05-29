import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ContactsIcon,
  TasksIcon,
  DocsIcon,
  CalendarIcon,
  ChatIcon,
} from "@/components/ui/icon";
import { formatDate, relativeTime } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const [{ count: contactsCount }, { count: tasksCount }, { count: docsCount }, { data: members }, { data: upcomingTasks }, { data: upcomingEvents }] = await Promise.all([
    supabase.from("contacts").select("*", { count: "exact", head: true }).eq("workspace_id", session.workspace.id),
    supabase.from("tasks").select("*, project:projects!inner(workspace_id)", { count: "exact", head: true }).eq("project.workspace_id", session.workspace.id).neq("status", "done"),
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("workspace_id", session.workspace.id),
    supabase.from("workspace_members").select("user_id, role, profile:profiles(*)").eq("workspace_id", session.workspace.id),
    supabase
      .from("tasks")
      .select("id, title, status, end_date, project:projects!inner(name, workspace_id), assignee:profiles(full_name, avatar_url)")
      .eq("project.workspace_id", session.workspace.id)
      .neq("status", "done")
      .not("end_date", "is", null)
      .order("end_date", { ascending: true })
      .limit(5),
    supabase
      .from("calendar_events")
      .select("id, title, start_at, end_at, color")
      .eq("workspace_id", session.workspace.id)
      .gte("start_at", new Date().toISOString())
      .order("start_at", { ascending: true })
      .limit(5),
  ]);

  const memberRows = (members ?? []) as unknown as Array<{
    user_id: string;
    role: "owner" | "admin" | "member";
    profile: { full_name: string | null; email: string; avatar_url: string | null } | null;
  }>;

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-surface-900">
          שלום{session.profile.full_name ? `, ${session.profile.full_name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="text-sm text-surface-600 mt-1">
          סקירה מהירה של {session.workspace.name}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={<ContactsIcon />}
          label="אנשי קשר"
          value={contactsCount ?? 0}
          href="/contacts"
        />
        <StatCard
          icon={<TasksIcon />}
          label="משימות פתוחות"
          value={tasksCount ?? 0}
          href="/tasks"
        />
        <StatCard
          icon={<DocsIcon />}
          label="מסמכים"
          value={docsCount ?? 0}
          href="/docs"
        />
        <StatCard
          icon={<CalendarIcon />}
          label="אירועי השבוע"
          value={upcomingEvents?.length ?? 0}
          href="/calendar"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>הצוות שלך</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {memberRows.length === 0 && (
              <p className="text-sm text-surface-500">אין עדיין חברים נוספים</p>
            )}
            {memberRows.map((m) => (
              <div key={m.user_id} className="flex items-center gap-3">
                <Avatar
                  name={m.profile?.full_name ?? m.profile?.email ?? "?"}
                  src={m.profile?.avatar_url}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-surface-900">
                    {m.profile?.full_name ?? m.profile?.email}
                  </div>
                  <div className="truncate text-xs text-surface-500">
                    {m.profile?.email}
                  </div>
                </div>
                <Badge tone={m.role === "owner" ? "brand" : "neutral"}>
                  {m.role === "owner" ? "בעלים" : m.role === "admin" ? "מנהל" : "חבר"}
                </Badge>
              </div>
            ))}
            <Link
              href="/settings/members"
              className="block text-center text-sm text-brand-600 hover:underline mt-2"
            >
              נהל חברים והזמנות →
            </Link>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>משימות קרובות</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {upcomingTasks && upcomingTasks.length > 0 ? (
              upcomingTasks.map((t) => {
                const tt = t as unknown as {
                  id: string;
                  title: string;
                  end_date: string | null;
                  status: string;
                  project: { name: string };
                  assignee: { full_name: string | null; avatar_url: string | null } | null;
                };
                return (
                  <Link
                    key={tt.id}
                    href={`/tasks/${tt.id}`}
                    className="flex items-center gap-2 rounded-lg p-2 hover:bg-surface-50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-medium text-surface-900">{tt.title}</div>
                      <div className="text-xs text-surface-500">
                        {tt.project.name} · {tt.end_date ? formatDate(tt.end_date) : ""}
                      </div>
                    </div>
                    {tt.assignee && (
                      <Avatar name={tt.assignee.full_name ?? "?"} src={tt.assignee.avatar_url} size="xs" />
                    )}
                  </Link>
                );
              })
            ) : (
              <p className="text-sm text-surface-500 text-center py-4">אין משימות עם תאריך יעד</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>אירועים קרובים</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {upcomingEvents && upcomingEvents.length > 0 ? (
              upcomingEvents.map((e) => (
                <Link
                  key={e.id}
                  href="/calendar"
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-surface-50"
                >
                  <div
                    className="h-9 w-1 rounded-full"
                    style={{ background: e.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium text-surface-900">{e.title}</div>
                    <div className="text-xs text-surface-500">
                      {relativeTime(e.start_at)} · {formatDate(e.start_at, { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-surface-500 text-center py-4">אין אירועים קרובים</p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>התחל מהר</CardTitle>
            <Link href="/chat" className="text-sm text-brand-600 hover:underline">
              לכל הצ'אטים →
            </Link>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QuickAction icon={<ChatIcon />} href="/chat" label="פתח צ'אט" />
            <QuickAction icon={<ContactsIcon />} href="/contacts" label="הוסף איש קשר" />
            <QuickAction icon={<DocsIcon />} href="/docs" label="כתוב מסמך" />
            <QuickAction icon={<CalendarIcon />} href="/calendar" label="צור אירוע" />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-surface-200 bg-white p-4 hover:border-brand-300 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-surface-500">{label}</div>
          <div className="mt-1 text-2xl font-bold text-surface-900 font-display">{value}</div>
        </div>
        <div className="h-9 w-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
          {icon}
        </div>
      </div>
    </Link>
  );
}

function QuickAction({ icon, href, label }: { icon: React.ReactNode; href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-xl border border-surface-200 p-4 hover:border-brand-300 hover:bg-brand-50 transition-colors"
    >
      <div className="h-10 w-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center">
        {icon}
      </div>
      <div className="text-sm font-medium text-surface-700">{label}</div>
    </Link>
  );
}
