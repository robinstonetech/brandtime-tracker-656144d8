-- 05. Invitations (hybrid onboarding: self-serve owners, invited teammates)

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email citext not null,
  role public.app_role not null default 'member',
  status public.invitation_status not null default 'pending',
  -- SHA-256 of the token that is emailed; the raw token is never stored.
  token_hash text not null unique,
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists invitations_pending_unique
  on public.invitations (organization_id, email)
  where status = 'pending';

create index if not exists invitations_email_idx on public.invitations (email);

create trigger invitations_set_updated_at
  before update on public.invitations
  for each row execute function public.set_updated_at();

-- Accept an invitation for the calling user. Runs as definer so the invitee
-- (not yet a member) can create their own membership row exactly once.
create or replace function public.accept_invitation(_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invitations;
  uid uuid := auth.uid();
  uemail citext;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select email into uemail from public.profiles where id = uid;

  select * into inv
  from public.invitations
  where token_hash = _token_hash
  for update;

  if inv.id is null then
    raise exception 'Invitation not found';
  end if;
  if inv.status <> 'pending' then
    raise exception 'Invitation is no longer pending';
  end if;
  if inv.expires_at < now() then
    update public.invitations set status = 'expired' where id = inv.id;
    raise exception 'Invitation has expired';
  end if;
  if lower(inv.email) <> lower(uemail) then
    raise exception 'Invitation was issued to a different email address';
  end if;

  insert into public.memberships (organization_id, user_id, role, invited_by)
  values (inv.organization_id, uid, inv.role, inv.invited_by)
  on conflict (organization_id, user_id)
  do update set is_active = true, role = excluded.role;

  update public.invitations
     set status = 'accepted', accepted_at = now(), accepted_by = uid
   where id = inv.id;

  return inv.organization_id;
end;
$$;

grant select, insert, update, delete on public.invitations to authenticated;
grant all on public.invitations to service_role;
grant execute on function public.accept_invitation(text) to authenticated;
