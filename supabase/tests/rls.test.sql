begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(32);

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

select ok(
  private.has_permission('members:manage'),
  'admin can manage members'
);

insert into public.organizations (id, name, slug)
values (
  '10000000-0000-0000-0000-000000000002',
  'Isolated Organization',
  'isolated-organization'
);

insert into public.customers (
  id,
  organization_id,
  name,
  status
)
values
  (
    '20000000-0000-0000-0000-000000000010',
    '10000000-0000-0000-0000-000000000001',
    'Demo Organization Customer',
    'active'
  ),
  (
    '20000000-0000-0000-0000-000000000011',
    '10000000-0000-0000-0000-000000000002',
    'Isolated Organization Customer',
    'active'
  );

select results_eq(
  $$
    select organization_id
    from public.audit_events
    where entity_type = 'organization'
      and entity_id = '10000000-0000-0000-0000-000000000002'
      and action = 'insert'
  $$,
  array['10000000-0000-0000-0000-000000000002'::uuid],
  'organization creation is audited with tenant scope'
);

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';

select ok(
  private.has_permission('customers:write'),
  'manager can write unscoped customers'
);
select results_eq(
  $$
    select name
    from public.customers
    where id = '20000000-0000-0000-0000-000000000010'
  $$,
  array['Demo Organization Customer'::text],
  'manager can read customers in their organization'
);
select is_empty(
  $$
    select id
    from public.customers
    where id = '20000000-0000-0000-0000-000000000011'
  $$,
  'manager cannot read customers in another organization'
);
select throws_ok(
  $$
    insert into public.customers (organization_id, name, status)
    values (
      '10000000-0000-0000-0000-000000000002',
      'Denied tenant customer',
      'lead'
    )
  $$,
  '42501',
  null,
  'manager cannot create customers in another organization'
);
select results_eq(
  $$
    insert into public.customers (name, status)
    values ('Allowed customer', 'lead')
    returning name
  $$,
  array['Allowed customer'::text],
  'manager can create an unscoped customer'
);
select throws_ok(
  $$
    insert into public.organizations (name, slug)
    values ('Denied Organization', 'denied-organization')
  $$,
  '42501',
  null,
  'manager cannot create organizations'
);
select is_empty(
  $$
    update public.organization_memberships
    set role = 'admin'
    where organization_id = '10000000-0000-0000-0000-000000000001'
      and user_id = '00000000-0000-0000-0000-000000000002'
    returning user_id
  $$,
  'manager cannot promote their own organization membership'
);
select results_eq(
  $$
    select role
    from public.organization_memberships
    where organization_id = '10000000-0000-0000-0000-000000000001'
      and user_id = '00000000-0000-0000-0000-000000000002'
  $$,
  array['manager'::public.app_role],
  'denied membership promotion leaves the role unchanged'
);

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';

select ok(
  not private.has_permission('customers:write'),
  'staff cannot write customers'
);
select results_eq(
  $$select count(*) from public.customers where organization_id is null$$,
  array[4::bigint],
  'staff can read unscoped customers'
);
select throws_ok(
  $$
    insert into public.customers (name, status)
    values ('Denied customer', 'lead')
  $$,
  '42501',
  null,
  'staff customer insert is blocked by RLS'
);
select is_empty(
  $$
    update public.customers
    set name = 'Unauthorized update'
    where id = '20000000-0000-0000-0000-000000000001'
    returning id
  $$,
  'staff customer update returns no rows'
);
select results_eq(
  $$
    select name
    from public.customers
    where id = '20000000-0000-0000-0000-000000000001'
  $$,
  array['Northstar Supplies'::text],
  'denied staff update leaves the customer unchanged'
);
select is_empty(
  $$
    delete from public.customers
    where id = '20000000-0000-0000-0000-000000000001'
    returning id
  $$,
  'staff customer delete returns no rows'
);
select results_eq(
  $$
    select count(*)
    from public.customers
    where id = '20000000-0000-0000-0000-000000000001'
  $$,
  array[1::bigint],
  'denied staff delete leaves the customer in place'
);
select results_eq(
  $$
    select name
    from public.customers
    where id = '20000000-0000-0000-0000-000000000010'
  $$,
  array['Demo Organization Customer'::text],
  'staff can read customers in their organization'
);
select throws_ok(
  $$
    update public.profiles
    set role = 'admin'
    where id = '00000000-0000-0000-0000-000000000003'
  $$,
  '42501',
  null,
  'column grants prevent staff from changing their global role'
);
select results_eq(
  $$
    insert into public.file_records (
      object_path,
      original_name,
      mime_type,
      size_bytes
    )
    values (
      'users/00000000-0000-0000-0000-000000000003/staff-note.txt',
      'staff-note.txt',
      'text/plain',
      10
    )
    returning original_name
  $$,
  array['staff-note.txt'::text],
  'staff can create personal file metadata'
);
select throws_ok(
  $$
    insert into public.file_records (
      object_path,
      original_name,
      mime_type,
      size_bytes,
      uploaded_by
    )
    values (
      'users/00000000-0000-0000-0000-000000000002/spoofed.txt',
      'spoofed.txt',
      'text/plain',
      10,
      '00000000-0000-0000-0000-000000000002'
    )
  $$,
  '42501',
  null,
  'staff cannot create file metadata for another user'
);
select lives_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values (
      'attachments',
      'users/00000000-0000-0000-0000-000000000003/staff-object.txt'
    )
  $$,
  'staff can create an object in their personal storage path'
);
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values (
      'attachments',
      'users/00000000-0000-0000-0000-000000000002/denied-object.txt'
    )
  $$,
  '42501',
  null,
  'staff cannot create an object in another user storage path'
);
select lives_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values (
      'attachments',
      'organizations/10000000-0000-0000-0000-000000000001/staff-object.txt'
    )
  $$,
  'staff can create an object in their organization storage path'
);
select throws_ok(
  $$
    insert into public.audit_events (action, entity_type)
    values ('forged', 'customer')
  $$,
  '42501',
  null,
  'authenticated users cannot forge audit events'
);
select is_empty(
  $$select id from public.audit_events$$,
  'staff cannot read audit events'
);

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';

select is_empty(
  $$
    select id
    from public.file_records
    where object_path = 'users/00000000-0000-0000-0000-000000000003/staff-note.txt'
  $$,
  'manager cannot read another user personal file metadata'
);
select is_empty(
  $$
    select id
    from storage.objects
    where name = 'users/00000000-0000-0000-0000-000000000003/staff-object.txt'
  $$,
  'manager cannot read another user personal storage object'
);
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values (
      'attachments',
      'organizations/10000000-0000-0000-0000-000000000002/denied-object.txt'
    )
  $$,
  '42501',
  null,
  'manager cannot create objects in another organization storage path'
);
select ok(
  exists (
    select 1
    from public.audit_events
    where entity_type = 'customer'
      and action = 'insert'
  ),
  'manager can read unscoped customer audit events'
);

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

update public.organizations
set name = 'Renamed Isolated Organization'
where id = '10000000-0000-0000-0000-000000000002';

delete from public.organizations
where id = '10000000-0000-0000-0000-000000000002';

select results_eq(
  $$
    select action
    from public.audit_events
    where entity_type = 'organization'
      and entity_id = '10000000-0000-0000-0000-000000000002'
    order by id
  $$,
  array['insert'::text, 'update'::text, 'delete'::text],
  'organization create, update, and delete are audited'
);
select results_eq(
  $$
    select count(*)
    from public.audit_events
    where entity_type = 'organization'
      and entity_id = '10000000-0000-0000-0000-000000000002'
      and organization_id = '10000000-0000-0000-0000-000000000002'
  $$,
  array[3::bigint],
  'organization audit scope is retained after deletion'
);

select * from finish();
rollback;
