-- get_next_invoice_number() and get_next_doc_number() (added in
-- 20260723120000_harden_numbering_rpcs.sql) select from public.invoices /
-- public.income_documents, both dropped in 20260813120000_drop_unused_
-- relational_tables.sql. That drop migration verified zero client-side
-- `.from("<table>")` calls before dropping the tables, but didn't check for
-- SQL-level dependents inside function bodies -- these two functions were
-- missed and would now throw "relation does not exist" if ever invoked.
-- Confirmed unused (grep for get_next_invoice_number/get_next_doc_number in
-- src/ finds only stale generated-type declarations, no real `.rpc()` call).
drop function if exists public.get_next_invoice_number();
drop function if exists public.get_next_doc_number();
