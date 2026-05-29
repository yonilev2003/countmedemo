-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ countme-crm — Storage buckets and policies                       ║
-- ║                                                                  ║
-- ║ Buckets:                                                         ║
-- ║   documents     — files attached to documents/messages/contacts  ║
-- ║   gantt-uploads — raw gantt files (images, pdf, csv, xlsx, xml)  ║
-- ║                                                                  ║
-- ║ Path convention: <workspace_id>/<remaining...>                   ║
-- ║ Storage policies enforce that the authenticated user is a member ║
-- ║ of the workspace whose UUID is the first path segment.           ║
-- ╚══════════════════════════════════════════════════════════════════╝

insert into storage.buckets (id, name, public)
values
  ('documents', 'documents', false),
  ('gantt-uploads', 'gantt-uploads', false)
on conflict (id) do nothing;

-- Helper: workspace-id is the first segment of the storage path
-- storage.foldername returns text[] of path segments
create or replace function public.storage_workspace_id(name text)
returns uuid
language sql
immutable
as $$
  select case
    when (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then ((storage.foldername(name))[1])::uuid
    else null
  end;
$$;

-- documents bucket policies
create policy "documents bucket: members read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and public.is_workspace_member(public.storage_workspace_id(name))
  );

create policy "documents bucket: members upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and public.is_workspace_member(public.storage_workspace_id(name))
  );

create policy "documents bucket: owner or admin delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents'
    and (
      owner = auth.uid()
      or public.is_workspace_admin(public.storage_workspace_id(name))
    )
  );

-- gantt-uploads bucket policies
create policy "gantt bucket: members read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'gantt-uploads'
    and public.is_workspace_member(public.storage_workspace_id(name))
  );

create policy "gantt bucket: members upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'gantt-uploads'
    and public.is_workspace_member(public.storage_workspace_id(name))
  );

create policy "gantt bucket: owner or admin delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'gantt-uploads'
    and (
      owner = auth.uid()
      or public.is_workspace_admin(public.storage_workspace_id(name))
    )
  );
