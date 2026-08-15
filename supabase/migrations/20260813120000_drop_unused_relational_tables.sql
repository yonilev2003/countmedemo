-- Drop 6 unused relational tables (0 rows in production, 0 code references anywhere
-- in src/). The app's actual data model is persona-JSONB-in-profiles.persona, not
-- a relational shape — these tables were scaffolded in the initial migration
-- (20260610090000_countme_init.sql) before that pattern was settled, and the app
-- never moved onto them. Confirmed via repo-wide grep (zero `.from("<table>")`
-- calls) and live row counts (all 0) before dropping. profiles/plans/subscriptions/
-- payments/events/rate_limit_buckets/tax_rules are NOT touched — those are either
-- actively used or intentionally kept per a locked product decision (billing seam).
--
-- If real relational storage is needed later, design it fresh against the actual
-- current data model (persona.income.expenses[]/invoices[] shape in src/lib/
-- persona.ts), not by resurrecting this dropped schema.

-- invoice_sends must drop before incomes (invoice_sends_income_id_fkey).
-- No other FK crosses between these 6 tables and anything else in the schema
-- (verified via list_tables verbose=true) -- no CASCADE needed.
drop table if exists public.expenses;
drop table if exists public.invoice_sends;
drop table if exists public.incomes;
drop table if exists public.invoices;
drop table if exists public.income_documents;
drop table if exists public.notifications;
