-- TimeMind: permite que a própria pessoa exclua a conta e todos os dados dela.
-- Rode este arquivo uma vez no SQL Editor do Supabase (depois de schema.sql). Pode rodar de novo sem problema.
--
-- SECURITY DEFINER: a função roda com os direitos do dono (necessário para apagar de auth.users),
-- mas só apaga a linha de quem está logado (auth.uid()). Quem não está logado não apaga nada.
-- As linhas de public.items somem junto (on delete cascade na chave user_id).

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;

  delete from public.items where user_id = uid; -- explícito, além do cascade
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
