# Deployment

The default production topology is one Vercel project and one hosted Supabase project.

## Supabase

1. Create a Supabase project in the required region.
2. Link the repository with `pnpm exec supabase link --project-ref <ref>`.
3. Review migrations, then apply them with `pnpm exec supabase db push`.
4. Do not run `supabase/seed.sql` against production.
5. Configure the exact Site URL and `/auth/callback` redirect URL.
6. Disable public signup for internal applications in hosted Supabase Auth; local config does not apply this setting remotely. Configure production SMTP and review Auth password and rate-limit settings.
7. Bootstrap the first administrator using [authentication.md](authentication.md).
8. Run Supabase security/performance advisors and inspect RLS before launch.

## Vercel

Import the repository and use pnpm. Add these environment variables to Production and any intentionally supported Preview environment:

```text
NEXT_PUBLIC_SITE_URL=https://your-production-origin.example
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

All three are public. The application does not require a service-role key. Do not add one unless a future server-only workflow is reviewed and cannot use user-scoped RLS.

The build command is `pnpm build`; it uses Next’s webpack mode for deterministic CSS builds. The output is a standard Next.js App Router application.

## Release gate

- GitHub Actions passes frozen install, lint, typecheck, unit tests, and build.
- Hosted migrations match the repository.
- Production Auth redirects and SMTP work.
- Public signup is rejected through the Auth API, including attempts outside the application UI.
- Admin bootstrap is complete and demo credentials do not exist.
- Protected routes redirect anonymous users.
- Admin, manager, and staff permissions are exercised with hosted test accounts.
- File upload/download/delete works against the private bucket.
- Audit events appear for relevant mutations.
- Vercel logs and Supabase logs contain no secrets or unsafe error payloads.
- Backup and Storage restoration, access removal, client ownership/billing, and release recovery have evidence in [operations.md](operations.md).

Use Vercel preview authentication only if Supabase redirect patterns are intentionally configured. Prefer exact production URLs over broad wildcards.
