-- TimeMind: tela de Feedback (sugestões privadas).
-- Rode este arquivo uma vez no SQL Editor do Supabase (depois de schema.sql). Pode rodar de novo sem problema.
--
-- Quem pode o quê:
--   * qualquer pessoa logada ENVIA (insert) uma sugestão, sempre com o próprio user_id;
--   * SÓ quem está em public.app_admins LÊ, marca como lida (read_at) e apaga as sugestões;
--   * app_admins: cada pessoa só enxerga a própria linha (é assim que o app descobre se é admin);
--     ninguém escreve nela pelo app. Só você, pelo SQL Editor.
--
-- Como virar admin (uma vez, no SQL Editor, com o seu e-mail):
--   insert into public.app_admins (user_id)
--   select id from auth.users where email = 'seu-email@exemplo.com'
--   on conflict do nothing;

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users on delete cascade
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users on delete cascade,
  message text not null check (char_length(message) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  app_version text
);

create index if not exists feedback_created_idx on public.feedback (created_at desc);
create index if not exists feedback_user_created_idx on public.feedback (user_id, created_at desc);

alter table public.app_admins enable row level security;
alter table public.feedback enable row level security;

-- privilégios mínimos: o cliente nunca escreve em app_admins; em feedback só altera read_at
revoke all on public.app_admins from anon, authenticated;
grant select on public.app_admins to authenticated;
revoke all on public.feedback from anon, authenticated;
grant select, insert, delete on public.feedback to authenticated;
grant update (read_at) on public.feedback to authenticated;

-- app_admins: só a própria linha
drop policy if exists "admin vê a própria linha" on public.app_admins;
create policy "admin vê a própria linha" on public.app_admins
  for select to authenticated using (user_id = auth.uid());

-- feedback: qualquer pessoa logada envia, só em nome dela
drop policy if exists "enviar feedback" on public.feedback;
create policy "enviar feedback" on public.feedback
  for insert to authenticated with check (user_id = auth.uid());

-- feedback: leitura, marcar como lida e apagar só para admins
drop policy if exists "admin lê feedback" on public.feedback;
create policy "admin lê feedback" on public.feedback
  for select to authenticated
  using (exists (select 1 from public.app_admins a where a.user_id = auth.uid()));

drop policy if exists "admin marca feedback" on public.feedback;
create policy "admin marca feedback" on public.feedback
  for update to authenticated
  using (exists (select 1 from public.app_admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.app_admins a where a.user_id = auth.uid()));

drop policy if exists "admin apaga feedback" on public.feedback;
create policy "admin apaga feedback" on public.feedback
  for delete to authenticated
  using (exists (select 1 from public.app_admins a where a.user_id = auth.uid()));

-- Limite simples contra spam: no máximo 5 envios por pessoa por hora.
-- SECURITY DEFINER para contar as linhas da pessoa mesmo sem ela poder ler a tabela.
create or replace function public.feedback_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.feedback
      where user_id = new.user_id and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Muitas sugestões em pouco tempo. Tente de novo mais tarde.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists feedback_rate_limit on public.feedback;
create trigger feedback_rate_limit
  before insert on public.feedback
  for each row execute function public.feedback_rate_limit();

-- Teste rápido (como você, logado no app): envie 6 sugestões seguidas; a 6ª deve falhar com
-- "Muitas sugestões em pouco tempo". Uma conta que não é admin não vê nenhuma linha em feedback.
