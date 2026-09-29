-- Audit records must retain tenant context after an organization is deleted.
-- A foreign key with `on delete set null` would erase that historical scope.
alter table public.audit_events
drop constraint audit_events_organization_id_fkey;

create or replace function private.audit_row_change()
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
  source_organization_id := private.try_uuid(
    coalesce(
      source_row ->> 'organization_id',
      case when tg_argv[0] = 'organization' then source_row ->> 'id' end
    )
  );

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

create trigger organizations_audit
after insert or update or delete on public.organizations
for each row execute function private.audit_row_change('organization');
