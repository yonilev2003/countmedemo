-- Additive-only: adds the columns the /expenses upload flow's Expense Object
-- (docs/specs/beta/artifacts/02-expense-upload-spec.md §2) needs that
-- public.expenses (20260610090000_countme_init.sql) doesn't have yet.
--
-- NOT required for the feature to work — this round persists entirely to
-- profiles.persona (jsonb) via persistPersona(), matching the established
-- pattern for invoices/documents (see src/lib/data/persona-store.ts). This
-- migration is documentation for a FUTURE move to the dedicated SQL table;
-- nothing in the app depends on it being applied. Apply manually (Yoni) —
-- migrations in this repo are not applied automatically.
--
-- All columns nullable — existing rows (recognition_percentage default 100)
-- stay valid without a backfill.

alter table public.expenses
  add column if not exists vendor_name text,
  add column if not exists document_number text,
  add column if not exists receipt_path text,
  add column if not exists currency text default 'ILS',
  add column if not exists original_amount numeric,
  add column if not exists exchange_rate numeric,
  add column if not exists business_purpose text,
  add column if not exists status text check (status is null or status = any (array['full','partial','needs_review']));
