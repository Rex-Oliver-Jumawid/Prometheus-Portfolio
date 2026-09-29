# Template project checklist

Use this once after generating a repository from the template.

## Rename and configure

- [ ] Create and clone a new repository from the template; install pinned dependencies.
- [ ] Run initializer preview/apply before manually renaming anything; review its diff.
- [ ] Review runtime name, description, logo mark, and support address in `src/config/app.ts`.
- [ ] Replace README product summary without deleting relevant setup instructions.
- [ ] Start local Supabase and set its Publishable key in `.env.local`; keep it uncommitted.
- [ ] Run `pnpm template:doctor` and resolve failures.
- [ ] Confirm no real client data, production credentials, or unrelated project material exists in git.
- [ ] Complete `docs/business-context.md` and the first feature specification.

## Local foundation

- [ ] `pnpm install --frozen-lockfile` succeeds from a clean clone.
- [ ] `pnpm db:start` and `pnpm db:reset` succeed.
- [ ] `pnpm db:types` produces no unexplained diff.
- [ ] `pnpm db:test` passes.
- [ ] Demo admin can sign in and reach the protected dashboard.
- [ ] Customer create/edit/delete, file upload/delete, and audit creation work.
- [ ] Staff cannot mutate Customers through UI, Server Actions, or RLS.

## Product decisions

- [ ] Decide whether organizations are required. Do not add a switcher for a single-company app.
- [ ] Define the first product feature and its permissions before adding its migration.
- [ ] Decide user invitation/signup policy and production SMTP provider.
- [ ] Decide retention expectations for files and audit data.

## Hosted release

- [ ] Apply migrations to a new Supabase project; never apply the local seed.
- [ ] Set exact Auth Site/redirect URLs and Vercel public environment values.
- [ ] Bootstrap the first production admin without committing credentials.
- [ ] Confirm hosted public signup is disabled through a direct Auth API rejection test.
- [ ] Complete ownership, billing, onboarding/offboarding, and restoration evidence in `docs/operations.md`.
- [ ] Register this client and its starting template version in the private company patch register.
- [ ] Run CI, database advisors, and the deployment release gate.
- [ ] Update `TEMPLATE_VERSION` only when publishing a new reusable template baseline.
