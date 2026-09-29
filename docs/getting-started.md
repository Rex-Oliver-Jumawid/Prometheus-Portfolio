# Getting started

## 1. Create a repository and install dependencies

Use GitHub's **Use this template → Create a new repository**, then clone your new repository. Only `app-template` is needed; sibling pilot applications and the module library are separate projects. Install Node.js 24, Corepack, and a Docker-compatible runtime.

```bash
corepack enable
pnpm install --frozen-lockfile
```

## 2. Initialize the fresh copy

Run before manually renaming the package or project:

```bash
pnpm template:init --name "Acme Inventory" --slug acme-inventory --support-email support@acme.example --port-base 59420
# Review the preview, then apply:
pnpm template:init --name "Acme Inventory" --slug acme-inventory --support-email support@acme.example --port-base 59420 --apply
```

Initialization configures `package.json`, `supabase/config.toml`, `src/config/app.ts`, the README title, and `.env.example`. It creates `.env.local` if missing and records the starting template version in `template-project.json`. It rejects already-initialized/renamed projects and preserves existing `.env.local`; review its URL and key if one already exists. Review the Git diff and complete `docs/business-context.md` and the README product summary.

Choose a distinct block of 100 local Supabase ports per simultaneously running project. Initialization checks availability and does not create hosted resources. For template maintenance or trying the unchanged baseline, skip initialization and create `.env.local` from `.env.example` only if it does not already exist.

## 3. Start Supabase and configure the key

```bash
pnpm db:start
pnpm db:reset
```

Copy the project's **Publishable key** from startup output (or `pnpm exec supabase status`) into `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. Do not copy a secret/service-role key. Keep `.env.local` uncommitted. The empty key in `.env.example` is intentional; copied keys from another project will not work.

`db:reset` rebuilds this local project's database and loads synthetic users/data from `supabase/seed.sql`. Do not run the seed against a hosted project. When changing the schema, run `pnpm db:types` and commit the generated types with the migration.

```bash
pnpm template:doctor
```

Local service ports are relative to the chosen base:

| Service | Template default | Example base 59420 |
| ------- | ---------------- | ------------------ |
| API     | 59321            | 59421              |
| Studio  | 59323            | 59423              |
| Mailpit | 59324            | 59424              |

Use `http://127.0.0.1:<port>`. The Next.js app defaults to port 3000 independently of this base. To run another app concurrently, use `pnpm dev --port 3100`, set `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3100`, and update the Auth Site URL and callback allowlist in `supabase/config.toml` before starting Supabase. Browser tests currently target port 3000; adjust `playwright.config.ts` if using another app port.

## 4. Run and sign in

```bash
pnpm dev
```

Open `http://127.0.0.1:3000`. Use `admin@example.test` / `Starter123!` to exercise every capability. The manager account can maintain Customers; the staff account can read Customers but cannot mutate them. Mailpit captures local password-recovery email.

## 5. Exercise the reference flow

1. Open Customers.
2. Search, filter, sort, and paginate seeded records.
3. Add, edit, and delete a record as admin or manager.
4. Sign in as staff and confirm mutation controls are absent; RLS and Server Actions independently reject direct mutation attempts.
5. Open Profile settings, update the display name, upload an allowed file, download it through a short-lived signed URL, and delete it.
6. Inspect `audit_events` in local Studio to see meaningful database changes.

## 6. Begin product work

Read [creating-a-feature.md](creating-a-feature.md) and copy the Customers structure, not its business vocabulary. Decide whether the product needs organizations before adding `organization_id` to new tables. Single-company applications should keep rows unscoped and omit organization UI.

## Troubleshooting

- If a configured port is occupied, change the configured port family in `supabase/config.toml` and update `.env.local`.
- If generated types are stale, run `pnpm db:reset` followed by `pnpm db:types`.
- If recovery mail does not arrive, open Mailpit locally. Hosted projects need production SMTP.
- If a protected page returns to login, verify all three public environment values and the Supabase Auth redirect allowlist.
