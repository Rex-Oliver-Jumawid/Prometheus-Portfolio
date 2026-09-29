# Frontend

The application shell uses calm neutral surfaces, one primary accent, compact readable tables, and minimal chrome. Product pages prioritize orientation, status, and action over marketing copy.

- Prefer Server Components and keep Client Components at interaction boundaries.
- Use `PageHeader`, shared loading/empty/error states, and `ConfirmationDialog` before creating variants.
- Use `AppDataTable` for normal business lists; keep feature-specific columns, search, filters, and row actions inside the feature.
- Use React Hook Form, the feature Zod schema, labels, inline field errors, and `FormMessage` for interactive forms.
- Reuse `src/components/ui` primitives and CSS tokens; do not fork component patterns per feature.
- Preserve semantic headings, keyboard access, visible focus, target size, contrast, responsive tables, and reduced-motion behavior.
- Keep cards only where a bounded interactive object needs one. Prefer sections, dividers, and clear workspace hierarchy.

Do not add a global state library for local forms/tables. Use local state, URL state, and Server Component data first.

The template's shadcn baseline is preset `b27GcrRo`. Keep that preset when recreating the UI configuration; changing it is a design-system decision that should be reviewed explicitly.
