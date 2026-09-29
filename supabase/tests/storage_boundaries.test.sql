begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(8);
-- Exercise DELETE RLS on synthetic rows inside this rolled-back transaction.
-- Production object deletion must continue to use the Storage API.
set local storage.allow_delete_query = 'true';

-- Simulate an old object written before the hardening migration.
insert into storage.objects (bucket_id, name)
values ('attachments', 'organizations/not-a-uuid/legacy.txt');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('attachments', 'organizations/not-a-uuid/new.txt')$$,
  '42501', null, 'staff cannot upload into a malformed organization path'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('attachments', 'organizations/missing-id.txt')$$,
  '42501', null, 'organization uploads require an identifier'
);
select is_empty(
  $$select id from storage.objects where name = 'organizations/not-a-uuid/legacy.txt'$$,
  'staff cannot read legacy objects with malformed organization scope'
);
select is_empty(
  $$delete from storage.objects where name = 'organizations/not-a-uuid/legacy.txt' returning id$$,
  'staff cannot delete malformed organization objects'
);
reset role;
select results_eq(
  $$select count(*) from storage.objects where name = 'organizations/not-a-uuid/legacy.txt'$$,
  array[1::bigint], 'denied delete preserves the object'
);
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('attachments', 'organizations/not-a-uuid/admin.txt')$$,
  '42501', null, 'even administrators must use valid organization identifiers'
);
reset role;
select results_eq(
  $$select file_size_limit from storage.buckets where id = 'attachments'$$,
  array[4194304::bigint], 'bucket uses the supported upload limit'
);
set local role authenticated;
select throws_ok(
  $$insert into public.file_records (object_path, original_name, mime_type, size_bytes)
    values ('users/00000000-0000-0000-0000-000000000001/large.pdf', 'large.pdf', 'application/pdf', 4194305)$$,
  '23514', null, 'metadata cannot bypass the upload size limit'
);
select * from finish();
rollback;
