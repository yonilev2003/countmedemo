-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ countme-crm — Initial schema                                     ║
-- ║                                                                  ║
-- ║ Convention: every table that holds user data has workspace_id    ║
-- ║ and is RLS-locked. The membership table is the single source of  ║
-- ║ truth for "is this user allowed to see this workspace's data".   ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- Required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────
-- profiles  (mirror of auth.users with public-safe fields)
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  locale text default 'he-IL',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────
-- workspaces + members + invitations
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.workspaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create type public.member_role as enum ('owner', 'admin', 'member');

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'member',
  joined_at timestamptz default now() not null,
  primary key (workspace_id, user_id)
);

create table if not exists public.invitations (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role public.member_role not null default 'member',
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by uuid not null references public.profiles(id) on delete restrict,
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz default now() not null
);
create index if not exists invitations_workspace_idx on public.invitations(workspace_id);
create index if not exists invitations_email_idx on public.invitations(lower(email));

-- ─────────────────────────────────────────────────────────────────────
-- Helper: is_workspace_member(workspace_id) — used in RLS everywhere
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_admin(ws_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

-- ─────────────────────────────────────────────────────────────────────
-- Chat: channels, members, messages, reactions
-- ─────────────────────────────────────────────────────────────────────
create type public.channel_type as enum ('channel', 'dm');

create table if not exists public.channels (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text,                          -- null for DMs
  type public.channel_type not null default 'channel',
  is_private boolean default false not null,
  topic text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz default now() not null
);
create index if not exists channels_workspace_idx on public.channels(workspace_id);

create table if not exists public.channel_members (
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz default now() not null,
  last_read_at timestamptz default now() not null,
  primary key (channel_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  content jsonb not null,             -- Tiptap JSON or { text: "..." }
  parent_message_id uuid references public.messages(id) on delete set null,
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz default now() not null,
  edited_at timestamptz
);
create index if not exists messages_channel_created_idx on public.messages(channel_id, created_at desc);
create index if not exists messages_thread_idx on public.messages(parent_message_id) where parent_message_id is not null;

create table if not exists public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now() not null,
  primary key (message_id, user_id, emoji)
);

-- Enable Realtime publication for messages
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.message_reactions;

-- ─────────────────────────────────────────────────────────────────────
-- Contacts (CRM)
-- ─────────────────────────────────────────────────────────────────────
create type public.contact_status as enum ('lead', 'qualified', 'customer', 'lost', 'archived');

create table if not exists public.contacts (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  company text,
  role text,
  email text,
  phone text,
  status public.contact_status not null default 'lead',
  tags text[] default '{}'::text[],
  notes text,
  source text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
create index if not exists contacts_workspace_idx on public.contacts(workspace_id);
create index if not exists contacts_status_idx on public.contacts(workspace_id, status);
create index if not exists contacts_tags_idx on public.contacts using gin(tags);
create index if not exists contacts_search_idx on public.contacts using gin(
  to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(company,'') || ' ' || coalesce(email,''))
);

create type public.activity_type as enum ('note', 'call', 'meeting', 'email', 'task', 'document');

create table if not exists public.contact_activities (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  type public.activity_type not null,
  body text,
  metadata jsonb default '{}'::jsonb,
  created_by uuid not null references public.profiles(id) on delete restrict,
  occurred_at timestamptz default now() not null,
  created_at timestamptz default now() not null
);
create index if not exists contact_activities_contact_idx on public.contact_activities(contact_id, occurred_at desc);

create table if not exists public.contact_owners (
  contact_id uuid not null references public.contacts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (contact_id, user_id)
);

-- ─────────────────────────────────────────────────────────────────────
-- Projects, tasks, dependencies, gantt imports
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  color text default '#1a84e8',
  contact_id uuid references public.contacts(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
create index if not exists projects_workspace_idx on public.projects(workspace_id);

create type public.task_status as enum ('todo', 'in_progress', 'review', 'done', 'blocked');

create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  assignee_id uuid references public.profiles(id) on delete set null,
  start_date date,
  end_date date,
  status public.task_status not null default 'todo',
  progress int not null default 0 check (progress between 0 and 100),
  parent_task_id uuid references public.tasks(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  position int default 0,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
create index if not exists tasks_project_idx on public.tasks(project_id);
create index if not exists tasks_assignee_idx on public.tasks(assignee_id);
create index if not exists tasks_dates_idx on public.tasks(start_date, end_date);

create type public.dependency_type as enum ('FS', 'SS', 'FF', 'SF');

create table if not exists public.task_dependencies (
  task_id uuid not null references public.tasks(id) on delete cascade,
  depends_on_task_id uuid not null references public.tasks(id) on delete cascade,
  type public.dependency_type not null default 'FS',
  primary key (task_id, depends_on_task_id),
  check (task_id <> depends_on_task_id)
);

create type public.import_status as enum ('pending', 'parsed', 'reviewed', 'imported', 'failed');

create table if not exists public.gantt_imports (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  source_file_url text,
  source_format text not null,           -- csv | xlsx | pdf | image | mpp | xml
  raw_ai_response jsonb,
  parsed_tasks jsonb default '[]'::jsonb,
  uncertainties jsonb default '[]'::jsonb,
  status public.import_status not null default 'pending',
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz default now() not null
);

-- ─────────────────────────────────────────────────────────────────────
-- Documents + folders + files + versions
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.document_folders (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  parent_folder_id uuid references public.document_folders(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz default now() not null
);
create index if not exists folders_workspace_idx on public.document_folders(workspace_id);
create index if not exists folders_parent_idx on public.document_folders(parent_folder_id);

create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  folder_id uuid references public.document_folders(id) on delete set null,
  title text not null default 'מסמך ללא שם',
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  template_key text,
  contact_id uuid references public.contacts(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz default now() not null,
  created_at timestamptz default now() not null
);
create index if not exists docs_workspace_idx on public.documents(workspace_id);
create index if not exists docs_folder_idx on public.documents(folder_id);
create index if not exists docs_search_idx on public.documents using gin(
  to_tsvector('simple', coalesce(title,''))
);

create table if not exists public.document_versions (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references public.documents(id) on delete cascade,
  content jsonb not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz default now() not null
);
create index if not exists doc_versions_idx on public.document_versions(document_id, created_at desc);

create table if not exists public.files (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  mime text,
  size_bytes bigint,
  storage_bucket text not null,
  storage_path text not null,
  related_kind text,                     -- 'contact' | 'task' | 'document' | 'message'
  related_id uuid,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz default now() not null
);
create index if not exists files_workspace_idx on public.files(workspace_id);
create index if not exists files_related_idx on public.files(related_kind, related_id);

-- ─────────────────────────────────────────────────────────────────────
-- Calendar: events, attendees, google tokens
-- ─────────────────────────────────────────────────────────────────────
create type public.attendee_response as enum ('pending', 'accepted', 'declined', 'tentative');

create table if not exists public.calendar_events (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  description text,
  location text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean default false not null,
  color text default '#1a84e8',
  contact_id uuid references public.contacts(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  google_event_id text,
  google_calendar_id text,
  google_etag text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  check (end_at >= start_at)
);
create index if not exists events_workspace_idx on public.calendar_events(workspace_id);
create index if not exists events_dates_idx on public.calendar_events(start_at, end_at);
create index if not exists events_google_idx on public.calendar_events(google_event_id);

create table if not exists public.event_attendees (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  external_email text,
  response public.attendee_response not null default 'pending',
  unique (event_id, user_id),
  check ((user_id is not null) or (external_email is not null))
);

create table if not exists public.user_google_tokens (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz not null,
  scopes text not null,
  primary_calendar_id text,
  sync_token text,
  channel_id text,                       -- google push notification channel
  channel_resource_id text,
  channel_expires_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ─────────────────────────────────────────────────────────────────────
-- updated_at triggers
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  tbl text;
begin
  for tbl in
    select unnest(array[
      'profiles', 'workspaces', 'contacts',
      'projects', 'tasks', 'documents',
      'calendar_events', 'user_google_tokens'
    ])
  loop
    execute format(
      'drop trigger if exists trg_%1$s_updated_at on public.%1$s;
       create trigger trg_%1$s_updated_at
         before update on public.%1$s
         for each row execute procedure public.touch_updated_at();',
      tbl);
  end loop;
end$$;
