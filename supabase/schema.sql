create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  telegram_chat_id bigint unique not null,
  nombre text,
  estado text not null default 'interesado',
  resumen text not null default '',
  ai_paused boolean not null default false,
  alerta_inyeccion boolean not null default false,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user','bot','admin')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_created_at_idx
  on public.messages (conversation_id, created_at);

alter table public.conversations replica identity full;
alter table public.messages replica identity full;

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "hackathon conversations" on public.conversations;
create policy "hackathon conversations"
  on public.conversations for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "hackathon messages" on public.messages;
create policy "hackathon messages"
  on public.messages for all
  to anon, authenticated
  using (true)
  with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
