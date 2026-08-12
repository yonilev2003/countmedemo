-- Private Storage bucket for expense-receipt uploads (W5, 2026-08-12).
--
-- Path convention: receipts/{auth.uid()}/{filename} — RLS restricts each user
-- to their own folder, same "own data only" model as every table in this
-- schema (see countme_init.sql).
--
-- 7-year retention: no delete policy is granted to `authenticated` — the app
-- never hard-deletes a receipt object. "Deleting" an expense in the UI only
-- soft-deletes its row in persona.income.expenses (sets deletedAt), the file
-- stays in Storage. A scheduled purge job for objects past the retention
-- window is future work (documented, not built — beta scale, ≤100 users).

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "receipts_own_read" on storage.objects;
create policy "receipts_own_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "receipts_own_insert" on storage.objects;
create policy "receipts_own_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "receipts_own_update" on storage.objects;
create policy "receipts_own_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

-- No delete policy for `authenticated` — enforces 7-year retention at the RLS
-- layer itself, not just in application code. Only service-role (a future
-- purge job) can remove objects past the retention window.
