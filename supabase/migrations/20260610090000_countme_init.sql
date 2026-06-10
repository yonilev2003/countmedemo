-- countme — full schema init (idempotent; safe to re-run).
-- Recreates the backend on a fresh Supabase project (the akfgudspliyymiysajoh
-- schema, rebuilt cleanly for hbsgzelipeawkvtcazdr).
--
-- Apply one of:
--   • Supabase CLI:   supabase db push        (after `supabase link --project-ref hbsgzelipeawkvtcazdr`)
--   • SQL editor:     paste this whole file and Run
--   • MCP:            apply_migration (once the MCP is connected to this project's account)

create extension if not exists pgcrypto;  -- gen_random_uuid()

-- ── Tables ──────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null default '',
  first_name text not null default '',
  last_name text not null default '',
  user_type text check (user_type = any (array['zaair','patur','murshe'])),
  is_registration_complete boolean not null default false,
  deductions_summary jsonb,
  chat_history jsonb default '[]'::jsonb,
  persona jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric not null,
  description text not null,
  income_date date not null default current_date,
  payment_method text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric not null,
  category text not null,
  description text,
  expense_date date not null default current_date,
  recognition_percentage numeric not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_name text not null,
  client_email text not null,
  description text not null,
  amount numeric not null,
  date date not null,
  invoice_number integer not null,
  status text not null default 'draft' check (status = any (array['draft','sent','paid'])),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.income_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  doc_type text not null check (doc_type = any (array['receipt','tax_invoice_receipt'])),
  doc_number integer not null,
  amount numeric not null check (amount > 0),
  description text,
  client_name text,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.invoice_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  income_id uuid not null references public.incomes(id) on delete cascade,
  recipient_email text not null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info' check (type = any (array['info','payment','submission','reminder','update'])),
  read boolean not null default false,
  due_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.tax_rules (
  id uuid primary key default gen_random_uuid(),
  rule_type text not null unique,
  value_num numeric,
  value_text text,
  description text,
  valid_from date not null default '2026-01-01',
  updated_at timestamptz not null default now()
);

create index if not exists incomes_user_id_idx          on public.incomes(user_id);
create index if not exists expenses_user_id_idx         on public.expenses(user_id);
create index if not exists invoices_user_id_idx         on public.invoices(user_id);
create index if not exists income_documents_user_id_idx on public.income_documents(user_id);
create index if not exists invoice_sends_user_id_idx    on public.invoice_sends(user_id);
create index if not exists notifications_user_id_idx    on public.notifications(user_id);

-- ── Functions ───────────────────────────────────────────────────────────────
-- Auto-create a profile row on signup.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = 'public' as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Sequential per-user invoice / document numbering (advisory-locked).
create or replace function public.get_next_invoice_number(p_user_id uuid)
returns integer language plpgsql security definer as $$
declare next_num integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));
  select coalesce(max(invoice_number), 0) + 1 into next_num
  from public.invoices where user_id = p_user_id;
  return next_num;
end;
$$;

create or replace function public.get_next_doc_number(p_user_id uuid)
returns integer language plpgsql security definer as $$
declare next_num integer;
begin
  perform pg_advisory_xact_lock(hashtext('doc_number:' || p_user_id::text));
  select coalesce(max(doc_number), 0) + 1 into next_num
  from public.income_documents where user_id = p_user_id;
  return next_num;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table public.profiles          enable row level security;
alter table public.incomes           enable row level security;
alter table public.expenses          enable row level security;
alter table public.invoices          enable row level security;
alter table public.income_documents  enable row level security;
alter table public.invoice_sends     enable row level security;
alter table public.notifications     enable row level security;
alter table public.tax_rules         enable row level security;

-- Per-user tables: each user reads/writes only their own rows (anon sees nothing).
do $$
declare t text;
begin
  foreach t in array array['profiles','incomes','expenses','invoices','income_documents','invoice_sends','notifications']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_own', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t || '_own', t);
  end loop;
end $$;

-- tax_rules: global reference data — authenticated may READ; writes via service-role only.
drop policy if exists tax_rules_read on public.tax_rules;
create policy tax_rules_read on public.tax_rules for select to authenticated using (true);
