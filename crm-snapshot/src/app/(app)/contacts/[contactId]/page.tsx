import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Contact, ContactActivity } from "@/types/db";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MailIcon,
  PhoneIcon,
  BuildingIcon,
  ChevronRightIcon,
} from "@/components/ui/icon";
import { StatusBadge } from "@/components/contacts/status-badge";
import { ActivityTimeline } from "@/components/contacts/activity-timeline";
import { QuickAddActivity } from "@/components/contacts/quick-add-activity";
import { ContactActions } from "@/components/contacts/contact-actions";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const { contactId } = await params;
  const session = await requireSession();
  const supabase = await createClient();

  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .eq("workspace_id", session.workspace.id)
    .single<Contact>();

  if (!contact) notFound();

  const { data: activities } = await supabase
    .from("contact_activities")
    .select("*, author:profiles(full_name, avatar_url, email)")
    .eq("contact_id", contactId)
    .order("occurred_at", { ascending: false })
    .limit(50);

  const { data: relatedTasks } = await supabase
    .from("tasks")
    .select("id, title, status, end_date, project:projects!inner(name, workspace_id)")
    .eq("contact_id", contactId)
    .eq("project.workspace_id", session.workspace.id)
    .order("end_date", { ascending: true });

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-8">
      <Link
        href="/contacts"
        className="inline-flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700 mb-4"
      >
        <ChevronRightIcon /> חזרה לרשימה
      </Link>

      <div className="flex items-start gap-4 mb-6">
        <Avatar name={contact.name} size="xl" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold font-display text-surface-900">{contact.name}</h1>
            <StatusBadge status={contact.status} />
          </div>
          <div className="text-sm text-surface-600">
            {contact.role && contact.company
              ? `${contact.role} ב-${contact.company}`
              : contact.role || contact.company || ""}
          </div>
        </div>
        <ContactActions contact={contact} workspaceId={session.workspace.id} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>פעילות</CardTitle>
            </CardHeader>
            <CardBody>
              <QuickAddActivity contactId={contact.id} />
              <div className="mt-4">
                <ActivityTimeline
                  activities={(activities ?? []) as unknown as Array<
                    ContactActivity & {
                      author: { full_name: string | null; avatar_url: string | null; email: string } | null;
                    }
                  >}
                />
              </div>
            </CardBody>
          </Card>

          {relatedTasks && relatedTasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>משימות קשורות</CardTitle>
              </CardHeader>
              <CardBody className="space-y-2">
                {relatedTasks.map((t) => {
                  const tt = t as unknown as {
                    id: string;
                    title: string;
                    status: string;
                    end_date: string | null;
                    project: { name: string };
                  };
                  return (
                    <Link
                      key={tt.id}
                      href={`/tasks/${tt.id}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-50"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-surface-900 truncate">{tt.title}</div>
                        <div className="text-xs text-surface-500">{tt.project.name}</div>
                      </div>
                      <Badge tone={tt.status === "done" ? "success" : "neutral"}>
                        {tt.status === "done" ? "הושלם" : "פתוח"}
                      </Badge>
                    </Link>
                  );
                })}
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>פרטי קשר</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-2 text-sm text-surface-700 hover:text-brand-600"
                  dir="ltr"
                >
                  <MailIcon className="text-surface-400" />
                  {contact.email}
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-2 text-sm text-surface-700 hover:text-brand-600"
                  dir="ltr"
                >
                  <PhoneIcon className="text-surface-400" />
                  {contact.phone}
                </a>
              )}
              {contact.company && (
                <div className="flex items-center gap-2 text-sm text-surface-700">
                  <BuildingIcon className="text-surface-400" />
                  {contact.company}
                </div>
              )}
              {!contact.email && !contact.phone && !contact.company && (
                <div className="text-sm text-surface-500">אין פרטי קשר</div>
              )}
            </CardBody>
          </Card>

          {contact.tags && contact.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>תגיות</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="flex flex-wrap gap-1.5">
                  {contact.tags.map((t) => (
                    <Badge key={t} tone="brand">#{t}</Badge>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {contact.notes && (
            <Card>
              <CardHeader>
                <CardTitle>הערות</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-surface-700 whitespace-pre-wrap">{contact.notes}</p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
