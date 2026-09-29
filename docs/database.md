# Database and Supabase

PostgreSQL in Supabase is the system of record. The initial migration is `supabase/migrations/20260904002410_application_foundation.sql`.

## Schema

| Table                      | Purpose                                                  |
| -------------------------- | -------------------------------------------------------- |
| `profiles`                 | Auth-linked display name and global role                 |
| `organizations`            | Optional tenant/account record                           |
| `organization_memberships` | Optional user role within an organization                |
| `customers`                | Complete CRUD reference entity                           |
| `file_records`             | Metadata for objects in the private `attachments` bucket |
| `audit_events`             | Append-only records written by database triggers         |

All public tables have primary keys, timestamps where relevant, foreign keys, indexes for filters/policies, explicit grants, and RLS. Private helper and trigger functions live in the unexposed `private` schema with pinned search paths.

## Migration workflow

```bash
pnpm exec supabase migration new descriptive_name
# edit the generated file
pnpm db:reset
pnpm db:types
pnpm db:test
pnpm exec supabase db advisors --local --type all --level warn --fail-on error
pnpm exec supabase migration list --local
```

Never edit a migration already applied to a shared/hosted environment; add a new migration. Regenerate and commit database types after every schema change.

## Optional tenancy

Tenancy is available but not forced:

- Single-company apps use `organization_id = null`, global profile roles, and no organization UI.
- Tenant-owned rows must use a non-null `organization_id`, resolve `requireOrganizationContext()`, pass that ID to `requirePermission()`, and include equivalent RLS.
- Organization members receive a role in `organization_memberships`. Global admins may operate across organizations; global manager/staff roles do not grant access to organization-owned rows.
- Organization-owned files use `organizations/<organization-id>/...`. Personal files use `users/<user-id>/...`.
- The template intentionally includes no switcher. Add one only when the product requires users to move between organizations.

When a feature is always tenant-owned, make `organization_id not null`; do not copy the Customers nullable column mechanically.

## Seed data

`supabase/seed.sql` creates deterministic local auth users, profiles/roles, one example organization/memberships, and three unscoped Customers. It contains no production credentials or customer data. Resetting the database recreates it safely.

## Auditing

`private.audit_row_change()` is the reusable trigger mechanism. Organizations, Customers, file metadata, membership changes, and profile role changes are audited. Organization identifiers are retained on historical events after organization deletion so audit scope is not lost. Add a trigger for each meaningful state-changing table. Direct `audit_events` writes are not granted to authenticated clients, and the table is immutable through the Data API.

Avoid putting secrets, credentials, or unnecessarily sensitive payloads into audited rows. For sensitive exports/approvals, use a constrained database operation or purpose-built trigger rather than logging a UI click.
