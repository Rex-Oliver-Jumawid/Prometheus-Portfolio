# Template changelog

## Unreleased

- Clarify fresh-copy setup order and project-specific public keys; keep CI credentials build-only and let static doctor validate an unconfigured example.
- Remove unused direct dependencies, redundant ignore entries, and empty feature/service scaffolding.

- Give browser upload fixtures unique names so interrupted runs do not collide on rerun.

- Keep local email login enabled while the global signup switch blocks registration.
- Make initializer test fixtures independent of the consuming application package name.

- Add preview-first client initialization, local doctor checks, and `pnpm verify`.
- Preserve database types when generation fails and explicitly scope reset to local databases.
- Disable local public signup. Existing hosted projects must disable signup separately in Supabase Auth.
- Reject malformed organization Storage paths. Legacy objects in malformed paths become inaccessible through authenticated policies; operators should review and relocate them through approved Storage operations.
- Limit new attachments to 4 MB across UI, validation, database metadata, and bucket configuration, with a 4.5 MB Server Action envelope. Existing larger attachments remain downloadable. Projects requiring larger files should implement direct-to-Storage uploads with authorized metadata finalization.
- Add setup/authorization/storage regression coverage and operating, feature-specification, business-context, and patch-distribution guides.

Apply the new migration before deploying the file-limit change. Complete the fresh-copy and hosted release gates in `docs/template-maintenance.md` before publishing a version/tag.
