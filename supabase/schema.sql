-- TimeMind: tabela de atividades por usuário, com segurança por linha (RLS).
-- Rode este arquivo uma vez no SQL Editor do Supabase.

create table if not exists public.items (
  user_id    uuid    not null default auth.uid() references auth.users (id) on delete cascade,
  id         text    not null,
  data       jsonb,                          -- a atividade inteira (null quando apagada)
  deleted    boolean not null default false, -- apagada: mantém o registro para sincronizar a exclusão
  updated_ms bigint  not null,               -- momento da última mudança (ms), usado para resolver conflitos
  primary key (user_id, id)
);

alter table public.items enable row level security;

-- Cada pessoa só enxerga e altera as próprias linhas.
create policy "items_select_own" on public.items
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "items_insert_own" on public.items
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "items_update_own" on public.items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "items_delete_own" on public.items
  for delete to authenticated using ((select auth.uid()) = user_id);
