create schema if not exists private;

create type public.app_role as enum ('admin', 'manager', 'staff');
create type public.customer_status as enum ('lead', 'active', 'inactive');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 120),
  role public.app_role not null default 'staff',
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_memberships (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null default 'staff',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index organization_memberships_user_id_idx
  on public.organization_memberships (user_id);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  email text check (email is null or char_length(email) <= 254),
  phone text check (phone is null or char_length(phone) <= 40),
  status public.customer_status not null default 'lead',
  notes text check (notes is null or char_length(notes) <= 2000),
  created_by uuid not null references auth.users (id) on delete restrict default auth.uid(),
  updated_by uuid not null references auth.users (id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_organization_id_idx on public.customers (organization_id);
create index customers_status_idx on public.customers (status);
create index customers_created_at_idx on public.customers (created_at desc);
create index customers_name_search_idx on public.customers (lower(name));

create table public.file_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  bucket_id text not null default 'attachments' check (bucket_id = 'attachments'),
  object_path text not null unique,
  original_name text not null check (char_length(original_name) between 1 and 255),
  mime_type text not null check (char_length(mime_type) between 1 and 127),
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  uploaded_by uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now()
);

create index file_records_organization_id_idx on public.file_records (organization_id);
create index file_records_uploaded_by_idx on public.file_records (uploaded_by);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null check (char_length(action) between 1 and 80),
  entity_type text not null check (char_length(entity_type) between 1 and 80),
  entity_id uuid,
  organization_id uuid references public.organizations (id) on delete set null,
  old_data jsonb,
  new_data jsonb,
  occurred_at timestamptz not null default now()
);

create index audit_events_actor_user_id_idx on public.audit_events (actor_user_id);
create index audit_events_organization_id_idx on public.audit_events (organization_id);
create index audit_events_entity_idx on public.audit_events (entity_type, entity_id);
create index audit_events_occurred_at_idx on public.audit_events (occurred_at desc);

create function private.try_uuid(value text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return value::uuid;
exception
  when invalid_text_representation then return null;
end;
$$;

create function private.role_has_permission(
  assigned_role public.app_role,
  requested_permission text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case assigned_role
    when 'admin' then true
    when 'manager' then requested_permission = any (array[
      'dashboard:view',
      'customers:read',
      'customers:write',
      'customers:delete',
      'files:read',
      'files:write',
      'files:delete',
      'audit:read'
    ])
    when 'staff' then requested_permission = any (array[
      'dashboard:view',
      'customers:read',
      'files:read',
      'files:write',
      'files:delete'
    ])
    else false
  end
$$;

create function private.has_permission(
  requested_permission text,
  target_organization_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and (target_organization_id is null or p.role = 'admin')
        and private.role_has_permission(p.role, requested_permission)
    )
    or (
      target_organization_id is not null
      and exists (
        select 1
        from public.organization_memberships m
        where m.user_id = (select auth.uid())
          and m.organization_id = target_organization_id
          and private.role_has_permission(m.role, requested_permission)
      )
    ),
    false
  )
$$;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'New user'
      ),
      120
    )
  );
  return new;
end;
$$;

create function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_row jsonb;
  new_row jsonb;
  source_row jsonb;
  source_entity_id uuid;
  source_organization_id uuid;
begin
  old_row := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  new_row := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  source_row := coalesce(new_row, old_row);
  source_entity_id := private.try_uuid(
    coalesce(
      source_row ->> 'id',
      source_row ->> 'user_id',
      source_row ->> 'organization_id'
    )
  );
  source_organization_id := private.try_uuid(source_row ->> 'organization_id');

  insert into public.audit_events (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    organization_id,
    old_data,
    new_data
  )
  values (
    (select auth.uid()),
    lower(tg_op),
    tg_argv[0],
    source_entity_id,
    source_organization_id,
    old_row,
    new_row
  );

  return coalesce(new, old);
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function private.set_updated_at();

create trigger organization_memberships_set_updated_at
before update on public.organization_memberships
for each row execute function private.set_updated_at();

create trigger customers_set_updated_at
before update on public.customers
for each row execute function private.set_updated_at();

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create trigger customers_audit
after insert or update or delete on public.customers
for each row execute function private.audit_row_change('customer');

create trigger organization_memberships_audit
after insert or update or delete on public.organization_memberships
for each row execute function private.audit_row_change('organization_membership');

create trigger file_records_audit
after insert or delete on public.file_records
for each row execute function private.audit_row_change('file');

create trigger profile_role_audit
after update of role on public.profiles
for each row
when (old.role is distinct from new.role)
execute function private.audit_row_change('profile_role');

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.customers enable row level security;
alter table public.file_records enable row level security;
alter table public.audit_events enable row level security;

create policy "profiles_select_allowed"
on public.profiles for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.has_permission('members:manage'))
);

create policy "profiles_update_self"
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "organizations_select_allowed"
on public.organizations for select
to authenticated
using (
  created_by = (select auth.uid())
  or (select private.has_permission('settings:manage'))
  or (select private.has_permission('dashboard:view', id))
);

create policy "organizations_insert_allowed"
on public.organizations for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (select private.has_permission('settings:manage'))
);

create policy "organizations_update_allowed"
on public.organizations for update
to authenticated
using ((select private.has_permission('settings:manage', id)))
with check ((select private.has_permission('settings:manage', id)));

create policy "organizations_delete_allowed"
on public.organizations for delete
to authenticated
using ((select private.has_permission('settings:manage', id)));

create policy "organization_memberships_select_allowed"
on public.organization_memberships for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.has_permission('members:manage', organization_id))
);

create policy "organization_memberships_insert_allowed"
on public.organization_memberships for insert
to authenticated
with check ((select private.has_permission('members:manage', organization_id)));

create policy "organization_memberships_update_allowed"
on public.organization_memberships for update
to authenticated
using ((select private.has_permission('members:manage', organization_id)))
with check ((select private.has_permission('members:manage', organization_id)));

create policy "organization_memberships_delete_allowed"
on public.organization_memberships for delete
to authenticated
using ((select private.has_permission('members:manage', organization_id)));

create policy "customers_select_allowed"
on public.customers for select
to authenticated
using ((select private.has_permission('customers:read', organization_id)));

create policy "customers_insert_allowed"
on public.customers for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and updated_by = (select auth.uid())
  and (select private.has_permission('customers:write', organization_id))
);

create policy "customers_update_allowed"
on public.customers for update
to authenticated
using ((select private.has_permission('customers:write', organization_id)))
with check (
  updated_by = (select auth.uid())
  and (select private.has_permission('customers:write', organization_id))
);

create policy "customers_delete_allowed"
on public.customers for delete
to authenticated
using ((select private.has_permission('customers:delete', organization_id)));

create policy "file_records_select_allowed"
on public.file_records for select
to authenticated
using (
  (organization_id is null and uploaded_by = (select auth.uid()))
  or (organization_id is not null and (select private.has_permission('files:read', organization_id)))
);

create policy "file_records_insert_allowed"
on public.file_records for insert
to authenticated
with check (
  uploaded_by = (select auth.uid())
  and (
    organization_id is null
    or (select private.has_permission('files:write', organization_id))
  )
);

create policy "file_records_delete_allowed"
on public.file_records for delete
to authenticated
using (
  (organization_id is null and uploaded_by = (select auth.uid()))
  or (organization_id is not null and (select private.has_permission('files:delete', organization_id)))
);

create policy "audit_events_select_allowed"
on public.audit_events for select
to authenticated
using ((select private.has_permission('audit:read', organization_id)));

revoke all on schema private from public;
grant usage on schema private to authenticated;
revoke execute on all functions in schema private from public;
grant execute on function private.has_permission(text, uuid) to authenticated;
grant execute on function private.try_uuid(text) to authenticated;

revoke all on all tables in schema public from anon, authenticated;
revoke all on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, avatar_path) on public.profiles to authenticated;
grant select, insert, delete on public.organizations to authenticated;
grant update (name, slug) on public.organizations to authenticated;
grant select, insert, delete on public.organization_memberships to authenticated;
grant update (role) on public.organization_memberships to authenticated;
grant select, insert, delete on public.customers to authenticated;
grant update (name, email, phone, status, notes, updated_by) on public.customers to authenticated;
grant select, insert, delete on public.file_records to authenticated;
revoke all on public.audit_events from authenticated;
grant select on public.audit_events to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'attachments',
  'attachments',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'application/pdf', 'text/plain']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "attachments_insert_allowed"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'attachments'
  and (
    (
      (storage.foldername(name))[1] = 'users'
      and (storage.foldername(name))[2] = (select auth.uid())::text
    )
    or (
      (storage.foldername(name))[1] = 'organizations'
      and (select private.has_permission(
        'files:write',
        private.try_uuid((storage.foldername(name))[2])
      ))
    )
  )
);

create policy "attachments_select_allowed"
on storage.objects for select
to authenticated
using (
  bucket_id = 'attachments'
  and (
    (
      (storage.foldername(name))[1] = 'users'
      and (storage.foldername(name))[2] = (select auth.uid())::text
    )
    or (
      (storage.foldername(name))[1] = 'organizations'
      and (select private.has_permission(
        'files:read',
        private.try_uuid((storage.foldername(name))[2])
      ))
    )
  )
);

create policy "attachments_delete_allowed"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'attachments'
  and (
    (
      (storage.foldername(name))[1] = 'users'
      and (storage.foldername(name))[2] = (select auth.uid())::text
    )
    or (
      (storage.foldername(name))[1] = 'organizations'
      and (select private.has_permission(
        'files:delete',
        private.try_uuid((storage.foldername(name))[2])
      ))
    )
  )
);
