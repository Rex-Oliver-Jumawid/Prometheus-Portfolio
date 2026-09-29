# Maintaining the delivery factory

The template supplies common foundations. Each client repository remains independently customized and deployed. Do not merge the template wholesale into a customized application.

For where reusable modules live, how to extract a CRM feature, how another project adopts it, and when to use packages or an installer, see [Building and using our reusable software factory](reusable-modules.md).

## Release a template baseline

1. Keep the Customers reference, documentation, permissions, and tests consistent.
2. Describe fixes, behavior changes, migrations, manual hosted settings, and compatibility in `CHANGELOG.md`.
3. Validate a fresh copy: frozen dependency install, initializer preview/apply, doctor, local Supabase startup/reset, generated types, database tests/advisors, and `pnpm verify`. Run the release journeys in the operations runbook; browser automation requires an explicit decision.
4. Only after that evidence passes, update `TEMPLATE_VERSION`, commit the release, and tag `template-vX.Y.Z`. Do not tag an unverified baseline.
5. Record the source release in each new client's `template-project.json`. This records its starting point, not all later fixes.

## Distribute fixes

Maintain one private company register outside client repositories. Suggested columns:

| Client/repository | Starting template version | Deployed commit | Owner | Required patch | Due date | Applied commit/date | Verification |
| ----------------- | ------------------------- | --------------- | ----- | -------------- | -------- | ------------------- | ------------ |
| Example only      | 1.0.0                     | TODO            | TODO  | TODO           | TODO     | TODO                | TODO         |

For each important fix, identify affected clients and assign an owner. Review the patch against each client's modifications; port or cherry-pick it in a focused PR, preserve existing migration history, run relevant checks, and record deployment evidence. Security/reliability fixes receive priority. Never update the recorded starting version to imply unapplied fixes are installed.

## Learn from client work

Use the internal CRM as the first pilot. Track time to first local login, time to first accepted feature, setup problems, defects, and support effort. Review friction after each delivery.

Extract a reusable module when real projects show stable common behavior. Keep client-specific workflows in client features until then. A module should eventually include migrations, permissions, reference UI, tests, adoption/removal instructions, and known limits. Avoid generating stock, money, or approval transactions from simple CRUD patterns without their domain rules.
