# Authentication

Authentication uses Supabase Auth only. No custom credential or session system exists.

## Implemented flow

- `/login`: email/password sign-in
- `/forgot-password`: non-enumerating recovery request
- `/auth/callback`: exchanges PKCE codes or verifies email OTP tokens
- `/reset-password`: updates the password for a verified recovery session
- `signOutAction()`: revokes the browser session and returns to login
- `src/proxy.ts`: refreshes cookie sessions, calls `getClaims()` to verify identity, and redirects protected paths
- `(dashboard)/layout.tsx`: loads a current profile before rendering the shell

The server client is request-scoped and cookie-aware. Server code never trusts `getSession()` for identity. Authorization roles are read from database-controlled profile/membership rows, never `user_metadata`.

## Auth redirect configuration

Local URLs are configured in `supabase/config.toml`. For a hosted project, set:

- Site URL to the exact production origin.
- Allowed redirect URL to `<origin>/auth/callback`.
- Exact preview redirect patterns only if preview authentication is needed.
- `NEXT_PUBLIC_SITE_URL` to the same production origin.

Password recovery requires email delivery. Local mail is captured by Mailpit. Configure a reliable custom SMTP provider before production.

## First production administrator

Do not deploy the seeded users. After applying migrations to a new hosted project:

1. Create/invite the first user through Supabase Dashboard Auth (or an approved server-only admin workflow).
2. Confirm the account so the `profiles` trigger has run.
3. In the Supabase SQL editor, promote exactly that account:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where email = 'first-admin@your-domain.example'
);
```

4. Confirm exactly one row changed, sign in, then create/invite other users through the project’s chosen onboarding workflow.
5. Disable public signup in Supabase when the client application is invitation-only.

Never add a service key to browser configuration or commit a bootstrap password.
