-- Instagram keys from Meta's business setup (Instagram API with unified login).
--
-- These are system-user keys that never expire. They read the account through
-- graph.facebook.com by its Instagram account ID, so the ID is stored with the key.
-- Keys from Instagram login (starting "IG") work as before and renew themselves.

alter table public.instagram_auth
  add column if not exists account_id text check (account_id ~ '^[0-9]{5,40}$');

drop function if exists public.set_instagram_token(text, integer);

create or replace function public.set_instagram_token(token text, expires_in_days integer default 60, account_id text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  acct text := nullif(trim(coalesce(account_id, '')), '');
begin
  if not public.is_staff() then
    raise exception 'Only staff can connect Instagram.' using errcode = '42501';
  end if;
  if token is null or char_length(trim(token)) < 20 or char_length(token) > 1000 or trim(token) ~ '\s' then
    raise exception 'That doesn''t look like an Instagram access token.' using errcode = '22023';
  end if;
  if acct is not null and acct !~ '^[0-9]{5,40}$' then
    raise exception 'The Instagram account ID is a long number, like 17841402024265975.' using errcode = '22023';
  end if;
  if acct is null and trim(token) !~ '^IG' then
    raise exception 'This key is from Meta''s business setup: add the Instagram account ID shown next to the account.' using errcode = '22023';
  end if;
  insert into public.instagram_auth (id, access_token, account_id, expires_at, refreshed_at, updated_at, updated_by)
  values (
    1, trim(token), acct,
    -- Business keys never expire; Instagram-login keys last 60 days and renew themselves.
    case when acct is null then now() + make_interval(days => greatest(1, least(expires_in_days, 60))) end,
    null, now(), auth.uid()
  )
  on conflict (id) do update
    set access_token = excluded.access_token,
        account_id = excluded.account_id,
        expires_at = excluded.expires_at,
        refreshed_at = null,
        updated_at = now(),
        updated_by = auth.uid();
end;
$$;

create or replace function public.instagram_status()
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  auth_row public.instagram_auth;
begin
  if not public.is_staff() then
    raise exception 'Only staff can see this.' using errcode = '42501';
  end if;
  select * into auth_row from public.instagram_auth where id = 1;
  return json_build_object(
    'connected', auth_row.id is not null,
    'account_id', auth_row.account_id,
    'expires_at', auth_row.expires_at,
    'refreshed_at', auth_row.refreshed_at,
    'updated_at', auth_row.updated_at
  );
end;
$$;

revoke execute on function public.set_instagram_token(text, integer, text) from public, anon;
grant execute on function public.set_instagram_token(text, integer, text) to authenticated;
