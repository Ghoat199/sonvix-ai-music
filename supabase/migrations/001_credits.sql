-- SONVIX AI Music: run in Supabase SQL Editor after creating the project.
create table if not exists public.credit_wallets (
 user_id uuid primary key references auth.users(id) on delete cascade,
 balance integer not null default 0 check(balance >= 0)
);
create table if not exists public.credit_transactions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 amount integer not null check(amount <> 0),
 reason text not null,
 reference_key text not null unique,
 created_at timestamptz not null default now()
);
alter table public.credit_wallets enable row level security;
alter table public.credit_transactions enable row level security;
create policy "wallet_owner_read" on public.credit_wallets for select to authenticated using (user_id = (select auth.uid()));
create policy "transactions_owner_read" on public.credit_transactions for select to authenticated using (user_id = (select auth.uid()));
create or replace function public.sonvix_signup_bonus()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.credit_wallets(user_id,balance) values(new.id,10);
 insert into public.credit_transactions(user_id,amount,reason,reference_key)
 values(new.id,10,'signup_bonus','signup:' || new.id::text);
 return new;
end; $$;
drop trigger if exists sonvix_signup_bonus_trigger on auth.users;
create trigger sonvix_signup_bonus_trigger after insert on auth.users
for each row execute function public.sonvix_signup_bonus();
-- Credit spending/refunds and Stripe grants must be implemented through secure
-- server-side transactions before real song generation or purchases are enabled.
