-- Confirmed sales are registered by the operator; chat intent does not create sales.
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id),
  course_id integer not null check (course_id between 1 and 21),
  course_name text not null check (length(trim(course_name)) > 0),
  amount numeric(10, 2) not null check (amount > 0),
  sold_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index if not exists sales_one_course_per_prospect_idx on public.sales (conversation_id, course_id);
create index if not exists sales_sold_at_idx on public.sales (sold_at desc);
create index if not exists sales_conversation_idx on public.sales (conversation_id);
alter table public.sales enable row level security;
alter table public.sales replica identity full;
grant select, insert on public.sales to anon, authenticated;
drop policy if exists "hackathon read sales" on public.sales;
create policy "hackathon read sales" on public.sales for select to anon, authenticated using (true);
drop policy if exists "hackathon register sales" on public.sales;
create policy "hackathon register sales" on public.sales for insert to anon, authenticated with check (true);
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sales') then
    alter publication supabase_realtime add table public.sales;
  end if;
end $$;
