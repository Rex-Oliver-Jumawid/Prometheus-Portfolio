# Client operations runbook

Complete this per client before launch. One independent GitHub repository, Supabase project, Vercel project, environment, and billing owner is the default. Infrastructure expenses belong to the client engagement.

## Ownership and handover record

| Item                                                       | Client-specific value |
| ---------------------------------------------------------- | --------------------- |
| Repository and release commit                              | TODO                  |
| Supabase project/region and Vercel project                 | TODO                  |
| Production domain and DNS owner                            | TODO                  |
| Hosting/database/email/domain billing owners               | TODO                  |
| Technical owner and backup contact                         | TODO                  |
| Client administrator and support channel                   | TODO                  |
| Secret manager location (no secret values)                 | TODO                  |
| Backup retention, recovery point and recovery time targets | TODO                  |
| Maintenance scope, hours, escalation, renewal dates        | TODO                  |

Use least-privilege named operator accounts with MFA. Confirm the client can access its resources and invoices before handover.

## User onboarding and access removal

The initial supported operator workflow uses Supabase Dashboard; there is no application user-management UI.

1. Disable **Allow new users to sign up** in hosted Supabase Auth. The checked-in local configuration does not configure a hosted project's Auth settings. This is mandatory for internal applications.
2. Create/invite the approved employee through Dashboard Auth. Verify the intended account/email and SMTP delivery. In the invitation email template, use `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&next=/reset-password` as the invitation link, with the exact production Site URL configured. The callback establishes the invitation session and the reset page lets the employee choose a password. Test this journey before onboarding real users.
3. Assign the approved global role using the exact user UUID in SQL; confirm exactly one row changed. Follow [authentication.md](authentication.md) for first-admin bootstrap. For tenant apps, assign only the required organization memberships. Keep a second administrator available.
4. Record who approved the access change, who executed it, and when. SQL editor changes may have a null `auth.uid()` audit actor, so retain the operator record with the change ticket.
5. For offboarding, ban the Auth account and revoke its sessions using the current supported Dashboard/Admin API operation. Remove organization memberships. Banning or revoking refresh tokens does not immediately invalidate already-issued access JWTs; document and allow the configured JWT expiry window before certifying revocation. Existing signed download URLs also remain usable until expiry.
6. Verify login/refresh denial and denied data access after token expiry. Do not use account deletion as a revocation shortcut; customer history can prevent deletion and files require separate retention handling. If immediate revocation is a client requirement, implement and test an active-account/session check in both server authorization and RLS before launch.

## Release procedure

1. Record the release commit, applied template patches, changes, and responsible operator.
2. Run `pnpm verify`. For database changes, reset a disposable local database, regenerate types, run `pnpm db:test` and `pnpm db:advisors`. Never reset a hosted database as a deployment step.
3. Test against a separate nonproduction Supabase project. Preview deployments must not mutate production data.
4. Confirm a recoverable backup for risky migrations. Review migrations for compatibility with the currently deployed application. Prefer additive schema changes; remove old columns only in a later release after old code is no longer running.
5. Apply reviewed migrations to the explicitly identified hosted project, without seed data; deploy the recorded app commit. Follow [deployment.md](deployment.md).
6. Verify signup rejection, approved login, recovery email, role restrictions, CRUD, upload/download/delete, and audit events using designated test accounts. Record results and clean up test records through normal app operations.
7. Monitor application errors and Supabase database/Auth/Storage errors. Record who owns alerts and how a client reports an incident.

## Failure and recovery

- App regression: restore the last compatible Vercel deployment. Check schema compatibility first; an app rollback does not roll back migrations.
- Migration failure: stop further rollout, inspect the actual migration state, and prepare a reviewed forward repair. Never guess at production reset or reverse SQL.
- Data loss: establish the affected time range and stop writes where needed. Restore to an isolated project first using the backup method supported by the client's Supabase plan. Verify row counts, key business totals, permissions, login, and application behavior before a controlled cutover.
- Database backups do not contain the Storage object bytes. Define and test a separate object backup/restore method, alongside metadata, policies, configuration, and secrets recovery.
- Rehearse restoration before launch and after material backup changes. Record elapsed recovery time and the data-loss window; compare them with the client's agreed targets.
- Errors should expose safe user messages and diagnostic operation/correlation identifiers. Never log passwords, tokens, uploaded content, or raw sensitive payloads. Investigate relevant Vercel/Supabase logs; add structured application diagnostics when a client workflow needs more context.

## Launch evidence

Record dates/operators and evidence for disabled public signup, SMTP recovery, access roles, restored backup and files, release rollback compatibility, client billing ownership, and client training. A green local build or `doctor` run does not certify these hosted controls.
