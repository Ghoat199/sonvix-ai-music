-- SONVIX AI Music: stop granting signup credits to all Supabase users.
-- Run in the shared Supabase project's SQL Editor.
-- Existing balances and transaction history remain unchanged.
drop trigger if exists sonvix_signup_bonus_trigger on auth.users;
drop trigger if exists on_auth_user_created_sonvix on auth.users;

-- Bonus must only be granted by a trusted server after a verified AI Music
-- registration / eligibility check. Browser metadata is NOT trustworthy.
create or replace function public.sonvix_grant_ai_signup_bonus(p_user uuid)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_inserted integer;
begin
  -- Only the server-side service role may call this.
  if (select auth.role()) <> 'service_role' then
    raise exception 'Not authorized';
  end if;
  if not exists(select 1 from auth.users where id = p_user and email_confirmed_at is not null) then
    return false;
  end if;
  insert into public.credit_transactions(user_id,amount,reason,reference_key)
  values(p_user,10,'ai_signup_bonus','ai_signup:' || p_user::text)
  on conflict(reference_key) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then return false; end if;
  insert into public.credit_wallets(user_id,balance)
  values(p_user,10)
  on conflict(user_id) do update set balance = public.credit_wallets.balance + 10;
  return true;
end;
$$;
revoke all on function public.sonvix_grant_ai_signup_bonus(uuid) from public, anon, authenticated;
grant execute on function public.sonvix_grant_ai_signup_bonus(uuid) to service_role;
-- Before calling this function, the server MUST verify that the user
-- actually signed up for AI Music, is eligible, and has confirmed email.
-- Existing credits from the old trigger are NOT automatically removed.
