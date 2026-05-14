import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ContactsListPage } from "@/components/contacts/contacts-list-page";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; tag?: string }>;
}) {
  const session = await requireSession();
  const supabase = await createClient();
  const params = await searchParams;

  let q = supabase
    .from("contacts")
    .select("*")
    .eq("workspace_id", session.workspace.id)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (params.q) {
    q = q.or(`name.ilike.%${params.q}%,company.ilike.%${params.q}%,email.ilike.%${params.q}%`);
  }
  if (params.status) {
    q = q.eq("status", params.status);
  }
  if (params.tag) {
    q = q.contains("tags", [params.tag]);
  }

  const { data: contacts } = await q;

  // Collect all tags for filter UI
  const allTagsSet = new Set<string>();
  for (const c of contacts ?? []) {
    for (const t of c.tags ?? []) allTagsSet.add(t);
  }

  return (
    <ContactsListPage
      workspaceId={session.workspace.id}
      contacts={contacts ?? []}
      allTags={Array.from(allTagsSet).sort()}
      filters={params}
    />
  );
}
