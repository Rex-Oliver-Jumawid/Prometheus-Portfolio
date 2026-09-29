# Feature specification template

Copy this into `docs/features/<feature>.md`. Resolve access and data ownership decisions before implementation. Keep each specification focused on a deliverable workflow.

## Outcome

- User and business problem:
- Success criteria:
- Included behavior:
- Excluded behavior:

## Workflow

Describe the normal sequence, state transitions, failure paths, and corrections. Include duplicate submissions, concurrent changes, and irreversible actions when relevant.

## Data

| Field or relationship | Type and constraints | Validation/default | Ownership                        |
| --------------------- | -------------------- | ------------------ | -------------------------------- |
| TODO                  | TODO                 | TODO               | Global / organization / personal |

Define uniqueness, deletion behavior, retention, timezone/currency rules, and whether a multi-row operation must be atomic. Use a database transaction/RPC for atomic business changes; do not copy sequential CRUD calls for a financial or stock transaction.

## Permissions and audit

| Operation                           | Allowed roles | Scope | Audit event  |
| ----------------------------------- | ------------- | ----- | ------------ |
| Read                                | TODO          | TODO  | Usually none |
| Create/update/delete/approve/export | TODO          | TODO  | TODO         |

Use the same permission definitions in TypeScript and SQL. Specify forbidden behavior as well as allowed behavior.

## Acceptance and verification

- Given … when … then …
- Given an unauthorized user … then …
- Given invalid input or a failed dependency … then …
- Required validation/domain tests:
- Required RLS allow/deny tests:
- Critical manual or explicitly requested browser journey:
- Affected routes to revalidate:
- Migration, rollout, recovery, and operational notes:

Implementation reference: `src/features/customers` and [creating-a-feature.md](creating-a-feature.md). Complete `pnpm verify`; run database checks for migrations. Record actual results, not just commands to run.
