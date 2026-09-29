# Adopting reusable modules

This template works independently. It includes Customers as the canonical CRUD reference; additional business modules belong in the consuming application only when its requirements call for them. `pnpm template:init` initializes a new project and does not install modules.

## Adopt a module

Use a reviewed, pinned release from your module library. Follow that release's installation and compatibility guide; an installer, if supplied, belongs to the module library and is not a template dependency.

1. Read the application's business context and feature specification. Confirm the module's data ownership, permissions, dependencies, and compatibility with this template version.
2. Start from a clean working branch. Preview changes and resolve route, permission, table, and file conflicts before applying them.
3. Adopt the source under `src/features/<feature>`, keeping routes focused on composition. Use the existing authorization, validation, UI, and audit patterns.
4. Create any required migration through the Supabase CLI. Preserve existing migration history and regenerate database types after applying schema changes locally.
5. Record the module name, source release/commit, installation date, and local adaptations in the application repository.
6. Run relevant application checks and database authorization tests. Verify the feature's acceptance criteria before deployment.

Each application owns its adopted source and its own database. Do not import runtime code from a sibling application or copy real records, uploaded files, credentials, or client-specific rules into a reusable module.

## Apply later fixes

Source copies do not update automatically. Compare upstream changes against the recorded source release and local modifications, then port the fix in a focused change. Preserve custom fields and workflows, add new migrations where needed, and record verification and the applied commit. Use the patch tracking process in [template maintenance](template-maintenance.md).

## Extract a module

Extract from a working feature when there is a concrete second use. Include its source, schema changes, permissions, dependencies, tests, synthetic fixtures, installation/removal instructions, and known limits. Verify adoption in a separate application before calling the release supported. Keep client-specific behavior in the client project until common requirements justify reuse.

Remove an adopted module only after reviewing dependent routes, data, foreign keys, files, and audit retention. Removing source alone does not authorize deleting application data.
