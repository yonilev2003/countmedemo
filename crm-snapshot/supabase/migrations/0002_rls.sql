-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ countme-crm — Row Level Security                                 ║
-- ║                                                                  ║
-- ║ Default deny. Every table that holds workspace data is gated by  ║
-- ║ is_workspace_member(workspace_id). Admin-only mutations gated by ║
-- ║ is_workspace_admin().                                            ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- Enable RLS everywhere
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.invitations enable row level security;
alter table public.channels enable row level security;
alter table public.channel_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_reactions enable row level security;
alter table public.contacts enable row level security;
alter table public.contact_activities enable row level security;
alter table public.contact_owners enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_dependencies enable row level security;
alter table public.gantt_imports enable row level security;
alter table public.document_folders enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.files enable row level security;
alter table public.calendar_events enable row level security;
alter table public.event_attendees enable row level security;
alter table public.user_google_tokens enable row level security;

-- ─────────────────────────────────────────────────────────────────────
-- profiles: every authenticated user can see basic profiles of people
-- in their shared workspaces. Self-update only.
-- ─────────────────────────────────────────────────────────────────────
create policy "profiles: read shared workspace members"
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.workspace_members m1
      join public.workspace_members m2 on m1.workspace_id = m2.workspace_id
      where m1.user_id = auth.uid() and m2.user_id = profiles.id
    )
  );

create policy "profiles: self update"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────
-- workspaces
-- ─────────────────────────────────────────────────────────────────────
create policy "workspaces: members can read"
  on public.workspaces for select to authenticated
  using (public.is_workspace_member(id));

create policy "workspaces: any authenticated user can create"
  on public.workspaces for insert to authenticated
  with check (owner_id = auth.uid());

create policy "workspaces: admins can update"
  on public.workspaces for update to authenticated
  using (public.is_workspace_admin(id))
  with check (public.is_workspace_admin(id));

create policy "workspaces: owner can delete"
  on public.workspaces for delete to authenticated
  using (owner_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────
-- workspace_members
-- ─────────────────────────────────────────────────────────────────────
create policy "members: members can read"
  on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "members: admins can insert"
  on public.workspace_members for insert to authenticated
  with check (
    public.is_workspace_admin(workspace_id)
    or user_id = auth.uid()                    -- self-join via accept invitation
  );

create policy "members: admins can update roles"
  on public.workspace_members for update to authenticated
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

create policy "members: admins can remove or self-leave"
  on public.workspace_members for delete to authenticated
  using (
    public.is_workspace_admin(workspace_id)
    or user_id = auth.uid()
  );

-- ─────────────────────────────────────────────────────────────────────
-- invitations: admins manage; recipients access via service-role API
-- ─────────────────────────────────────────────────────────────────────
create policy "invitations: admins read"
  on public.invitations for select to authenticated
  using (public.is_workspace_admin(workspace_id));

create policy "invitations: admins create"
  on public.invitations for insert to authenticated
  with check (public.is_workspace_admin(workspace_id) and invited_by = auth.uid());

create policy "invitations: admins delete"
  on public.invitations for delete to authenticated
  using (public.is_workspace_admin(workspace_id));

-- ─────────────────────────────────────────────────────────────────────
-- channels & messages
-- ─────────────────────────────────────────────────────────────────────
create policy "channels: workspace members read"
  on public.channels for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "channels: members create"
  on public.channels for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());

create policy "channels: creator or admin update"
  on public.channels for update to authenticated
  using (created_by = auth.uid() or public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "channels: creator or admin delete"
  on public.channels for delete to authenticated
  using (created_by = auth.uid() or public.is_workspace_admin(workspace_id));

create policy "channel_members: read same workspace"
  on public.channel_members for select to authenticated
  using (
    exists (
      select 1 from public.channels c
      where c.id = channel_id and public.is_workspace_member(c.workspace_id)
    )
  );

create policy "channel_members: members add themselves or admins add others"
  on public.channel_members for insert to authenticated
  with check (
    user_id = auth.uid() or exists (
      select 1 from public.channels c
      where c.id = channel_id and public.is_workspace_admin(c.workspace_id)
    )
  );

create policy "channel_members: self update"
  on public.channel_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "channel_members: self leave or admin remove"
  on public.channel_members for delete to authenticated
  using (
    user_id = auth.uid() or exists (
      select 1 from public.channels c
      where c.id = channel_id and public.is_workspace_admin(c.workspace_id)
    )
  );

create policy "messages: read in member channels"
  on public.messages for select to authenticated
  using (
    exists (
      select 1 from public.channels c
      where c.id = channel_id and public.is_workspace_member(c.workspace_id)
    )
  );

create policy "messages: post as self in member channels"
  on public.messages for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.channels c
      where c.id = channel_id and public.is_workspace_member(c.workspace_id)
    )
  );

create policy "messages: edit own"
  on public.messages for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "messages: delete own or admin"
  on public.messages for delete to authenticated
  using (
    user_id = auth.uid() or exists (
      select 1 from public.channels c
      where c.id = channel_id and public.is_workspace_admin(c.workspace_id)
    )
  );

create policy "reactions: read in member channels"
  on public.message_reactions for select to authenticated
  using (
    exists (
      select 1 from public.messages m
      join public.channels c on c.id = m.channel_id
      where m.id = message_id and public.is_workspace_member(c.workspace_id)
    )
  );

create policy "reactions: self insert"
  on public.message_reactions for insert to authenticated
  with check (user_id = auth.uid());

create policy "reactions: self delete"
  on public.message_reactions for delete to authenticated
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────
-- contacts
-- ─────────────────────────────────────────────────────────────────────
create policy "contacts: workspace members read"
  on public.contacts for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "contacts: workspace members write"
  on public.contacts for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());

create policy "contacts: workspace members update"
  on public.contacts for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "contacts: workspace admins delete"
  on public.contacts for delete to authenticated
  using (public.is_workspace_admin(workspace_id));

create policy "contact_activities: read"
  on public.contact_activities for select to authenticated
  using (
    exists (
      select 1 from public.contacts c
      where c.id = contact_id and public.is_workspace_member(c.workspace_id)
    )
  );

create policy "contact_activities: insert"
  on public.contact_activities for insert to authenticated
  with check (
    created_by = auth.uid() and exists (
      select 1 from public.contacts c
      where c.id = contact_id and public.is_workspace_member(c.workspace_id)
    )
  );

create policy "contact_activities: update own"
  on public.contact_activities for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy "contact_activities: delete own or admin"
  on public.contact_activities for delete to authenticated
  using (
    created_by = auth.uid() or exists (
      select 1 from public.contacts c
      where c.id = contact_id and public.is_workspace_admin(c.workspace_id)
    )
  );

create policy "contact_owners: read"
  on public.contact_owners for select to authenticated
  using (
    exists (
      select 1 from public.contacts c
      where c.id = contact_id and public.is_workspace_member(c.workspace_id)
    )
  );

create policy "contact_owners: write"
  on public.contact_owners for all to authenticated
  using (
    exists (
      select 1 from public.contacts c
      where c.id = contact_id and public.is_workspace_member(c.workspace_id)
    )
  ) with check (
    exists (
      select 1 from public.contacts c
      where c.id = contact_id and public.is_workspace_member(c.workspace_id)
    )
  );

-- ─────────────────────────────────────────────────────────────────────
-- projects, tasks, dependencies, gantt imports
-- ─────────────────────────────────────────────────────────────────────
create policy "projects: members read"
  on public.projects for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "projects: members write"
  on public.projects for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());

create policy "projects: members update"
  on public.projects for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "projects: admins delete"
  on public.projects for delete to authenticated
  using (public.is_workspace_admin(workspace_id));

create policy "tasks: read"
  on public.tasks for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and public.is_workspace_member(p.workspace_id)
    )
  );

create policy "tasks: write"
  on public.tasks for insert to authenticated
  with check (
    created_by = auth.uid() and exists (
      select 1 from public.projects p
      where p.id = project_id and public.is_workspace_member(p.workspace_id)
    )
  );

create policy "tasks: update"
  on public.tasks for update to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and public.is_workspace_member(p.workspace_id)
    )
  );

create policy "tasks: delete"
  on public.tasks for delete to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and public.is_workspace_member(p.workspace_id)
    )
  );

create policy "task_dependencies: workspace members all"
  on public.task_dependencies for all to authenticated
  using (
    exists (
      select 1 from public.tasks t
      join public.projects p on p.id = t.project_id
      where t.id = task_id and public.is_workspace_member(p.workspace_id)
    )
  ) with check (
    exists (
      select 1 from public.tasks t
      join public.projects p on p.id = t.project_id
      where t.id = task_id and public.is_workspace_member(p.workspace_id)
    )
  );

create policy "gantt_imports: workspace members all"
  on public.gantt_imports for all to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and public.is_workspace_member(p.workspace_id)
    )
  ) with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and public.is_workspace_member(p.workspace_id)
    )
  );

-- ─────────────────────────────────────────────────────────────────────
-- documents, folders, versions, files
-- ─────────────────────────────────────────────────────────────────────
create policy "folders: members read"
  on public.document_folders for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "folders: members write"
  on public.document_folders for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());

create policy "folders: members update"
  on public.document_folders for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "folders: admins delete"
  on public.document_folders for delete to authenticated
  using (public.is_workspace_admin(workspace_id));

create policy "documents: members read"
  on public.documents for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "documents: members write"
  on public.documents for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());

create policy "documents: members update"
  on public.documents for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "documents: members delete"
  on public.documents for delete to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "doc_versions: members read"
  on public.document_versions for select to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and public.is_workspace_member(d.workspace_id)
    )
  );

create policy "doc_versions: members insert"
  on public.document_versions for insert to authenticated
  with check (
    created_by = auth.uid() and exists (
      select 1 from public.documents d
      where d.id = document_id and public.is_workspace_member(d.workspace_id)
    )
  );

create policy "files: members read"
  on public.files for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "files: members write"
  on public.files for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and uploaded_by = auth.uid());

create policy "files: uploader or admin delete"
  on public.files for delete to authenticated
  using (uploaded_by = auth.uid() or public.is_workspace_admin(workspace_id));

-- ─────────────────────────────────────────────────────────────────────
-- calendar
-- ─────────────────────────────────────────────────────────────────────
create policy "events: members read"
  on public.calendar_events for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "events: members write"
  on public.calendar_events for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());

create policy "events: members update"
  on public.calendar_events for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "events: members delete"
  on public.calendar_events for delete to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "attendees: read"
  on public.event_attendees for select to authenticated
  using (
    exists (
      select 1 from public.calendar_events e
      where e.id = event_id and public.is_workspace_member(e.workspace_id)
    )
  );

create policy "attendees: write"
  on public.event_attendees for all to authenticated
  using (
    exists (
      select 1 from public.calendar_events e
      where e.id = event_id and public.is_workspace_member(e.workspace_id)
    )
  ) with check (
    exists (
      select 1 from public.calendar_events e
      where e.id = event_id and public.is_workspace_member(e.workspace_id)
    )
  );

create policy "google_tokens: self only"
  on public.user_google_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
