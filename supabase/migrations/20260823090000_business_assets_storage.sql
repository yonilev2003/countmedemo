-- Private Storage bucket for business-branding uploads (document settings,
-- Tomi's request 2026-08-23): logo + signature images shown on issued
-- documents (invoices/receipts) instead of the default trade-name monogram.
--
-- Path convention: business-assets/{auth.uid()}/{logo|signature}-{filename} —
-- same "own folder only" RLS model as the receipts bucket
-- (20260812130000_receipts_storage.sql).
--
-- UNLIKE receipts (7-year retention, no delete policy): a logo/signature is a
-- single replaceable asset, not a retained financial record — `authenticated`
-- DOES get a delete policy, so uploading a new one can remove the old object
-- instead of accumulating orphaned files forever.

insert into storage.buckets (id, name, public)
values ('business-assets', 'business-assets', false)
on conflict (id) do nothing;

drop policy if exists "business_assets_own_read" on storage.objects;
create policy "business_assets_own_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'business-assets' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "business_assets_own_insert" on storage.objects;
create policy "business_assets_own_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'business-assets' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "business_assets_own_update" on storage.objects;
create policy "business_assets_own_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'business-assets' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'business-assets' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "business_assets_own_delete" on storage.objects;
create policy "business_assets_own_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'business-assets' and (storage.foldername(name))[1] = auth.uid()::text);
