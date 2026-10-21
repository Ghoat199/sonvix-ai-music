-- SONVIX AI Music: initial credit ledger
-- Run in a NEW Supabase project's SQL Editor.
create table if not exists public.credit_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  created_at timestamptz not null default now()
);
create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount <> 0),
  reason text not null,
  reference_key text not null unique,
  created_at timestamptz not null default now()
);
create table if not exists public.song_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'queued' check (status in ('queued','processing','completed','failed')),
  cost integer not null default 5 check (cost = 5),
  created_at timestamptz not null default now()
);
alter table public.credit_wallets enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.song_jobs enable row level security;
create policy "Read own wallet" on public.credit_wallets for select to authenticated using ((select auth.uid()) = user_id);
create policy "Read own transactions" on public.credit_transactions for select to authenticated using ((select auth.uid()) = user_id);
create policy "Read own song jobs" on public.song_jobs for select to authenticated using ((select auth.uid()) = user_id);
-- No client INSERT/UPDATE/DELETE policies: credits can only change in trusted database functions.
create or replace function public.grant_signup_credits()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.credit_wallets(user_id,balance) values (new.id,10);
  insert into public.credit_transactions(user_id,amount,reason,reference_key)
    values (new.id,10,'signup_bonus','signup:' || new.id::text);
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_sonvix on auth.users;
create trigger on_auth_user_created_sonvix
after insert on auth.users for each row execute function public.grant_signup_credits();
-- Reservation is atomic; unique request keys prevent duplicate charging.
create or replace function public.reserve_song_credits(p_user uuid, p_job uuid, p_title text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_updated integer;
begin
  if p_user is distinct from (select auth.uid()) then
    raise exception 'Unauthorized';
  end if;
  if p_title is null or length(trim(p_title)) = 0 or length(p_title) > 160 then
    raise exception 'Invalid title';
  end if;
  if exists (select 1 from public.song_jobs where id = p_job and user_id = p_user) then
    return true;
  end if;
  update public.credit_wallets set balance = balance - 5
  where user_id = p_user and balance >= 5;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then return false; end if;
  insert into public.song_jobs(id,user_id,title) values (p_job,p_user,p_title);
  insert into public.credit_transactions(user_id,amount,reason,reference_key)
  values (p_user,-5,'song_reservation','song:' || p_job::text);
  return true;
end;
$$;
revoke all on function public.reserve_song_credits(uuid,uuid,text) from public;
grant execute on function public.reserve_song_credits(uuid,uuid,text) to authenticated;
-- Completion/refunds must be done by trusted server-side code only.
create or replace function public.finish_song_job(p_job uuid, p_success boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_status text;
begin
  select user_id,status into v_user,v_status from public.song_jobs where id=p_job for update;
  if not found or v_status in ('completed','failed') then return; end if;
  update public.song_jobs set status = case when p_success then 'completed' else 'failed' end where id=p_job;
  if not p_success then
    insert into public.credit_transactions(user_id,amount,reason,reference_key)
      values (v_user,5,'song_refund','refund:' || p_job::text)
      on conflict(reference_key) do nothing;
    if found then update public.credit_wallets set balance=balance+5 where user_id=v_user; end if;
  end if;
end;
$$;
revoke all on function public.finish_song_job(uuid,boolean) from public, anon, authenticated;
grant execute on function public.finish_song_job(uuid,boolean) to service_role;
