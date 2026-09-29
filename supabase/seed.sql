-- Deterministic local-only users. Never copy these credentials to a hosted project.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'admin@example.test',
    crypt('Starter123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Alex Admin"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'manager@example.test',
    crypt('Starter123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Morgan Manager"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'staff@example.test',
    crypt('Starter123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Sam Staff"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

insert into auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  id::text,
  id,
  jsonb_build_object('sub', id::text, 'email', email),
  'email',
  now(),
  now(),
  now()
from auth.users
where id in (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003'
);

update public.profiles
set role = case id
  when '00000000-0000-0000-0000-000000000001' then 'admin'::public.app_role
  when '00000000-0000-0000-0000-000000000002' then 'manager'::public.app_role
  else 'staff'::public.app_role
end
where id in (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003'
);

insert into public.organizations (id, name, slug, created_by)
values (
  '10000000-0000-0000-0000-000000000001',
  'Demo Trading Co.',
  'demo-trading-co',
  '00000000-0000-0000-0000-000000000001'
);

insert into public.organization_memberships (organization_id, user_id, role)
values
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'manager'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    'staff'
  );

-- The canonical Customers feature defaults to unscoped rows so it also works
-- for a single-company application. See docs/database.md before enabling scope.
insert into public.customers (
  id,
  name,
  email,
  phone,
  status,
  notes,
  created_by,
  updated_by,
  created_at,
  updated_at
)
values
  (
    '20000000-0000-0000-0000-000000000001',
    'Northstar Supplies',
    'orders@northstar.example',
    '+1 555 010 1001',
    'active',
    'Prefers email for order confirmations.',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '2026-01-10 08:00:00+00',
    '2026-01-10 08:00:00+00'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'Harbor & Field',
    'hello@harborfield.example',
    '+1 555 010 1002',
    'lead',
    'Requested a follow-up next month.',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '2026-02-12 09:30:00+00',
    '2026-02-12 09:30:00+00'
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    'Cedar Works',
    null,
    '+1 555 010 1003',
    'inactive',
    null,
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    '2026-03-03 14:15:00+00',
    '2026-03-03 14:15:00+00'
  );
