-- Apply in the shared SONVIX Supabase SQL Editor.
-- Bonus only for confirmed AI Music signups, never for Distribution-only accounts.
create or replace function public.sonvix_grant_ai_signup_bonus(p_user uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_inserted integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Not authorized';
  end if;
  if not exists (
    select 1 from auth.users
    where id = p_user
      and email_confirmed_at is not null
      and raw_user_meta_data->>'sonvix_signup_platform' = 'ai_music'
  ) then return false; end if;
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
-- Note: signup metadata is user-controlled; this is a product-onboarding marker,
-- not a trusted proof of identity or a defense against multiple accounts.
