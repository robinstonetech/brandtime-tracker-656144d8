-- 01. Extensions, enum types, shared helpers
-- Robinstone Business Suite - Time

create extension if not exists pgcrypto;
create extension if not exists citext;

do $$ begin
  create type public.app_role as enum ('owner', 'admin', 'manager', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.timesheet_status as enum ('draft', 'submitted', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.project_status as enum ('active', 'on_hold', 'archived');
exception when duplicate_object then null; end $$;

-- Shared updated_at trigger function.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
