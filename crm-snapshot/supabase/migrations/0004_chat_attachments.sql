-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ countme-crm — Chat attachments bucket                            ║
-- ║                                                                  ║
-- ║ Bucket:                                                          ║
-- ║   chat-attachments — files attached to chat messages             ║
-- ║                                                                  ║
-- ║ Path: <workspace_id>/<channel_id>/<uuid>-<filename>              ║
-- ╚══════════════════════════════════════════════════════════════════╝

insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', false)
on conflict (id) do nothing;

create policy "chat-attachments: members read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and public.is_workspace_member(public.storage_workspace_id(name))
  );

create policy "chat-attachments: members upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and public.is_workspace_member(public.storage_workspace_id(name))
  );

create policy "chat-attachments: owner or admin delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'chat-attachments'
    and (
      owner = auth.uid()
      or public.is_workspace_admin(public.storage_workspace_id(name))
    )
  );
