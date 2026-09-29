# Git workflow

```text
main
  ↑ Pull Request
short-lived feature branch
```

Branch from an up-to-date `main`. Use descriptive names:

- `feat/customer-management`
- `fix/login-redirect`
- `chore/update-dependencies`
- `refactor/auth-service`

Use conventional-style commits written as imperatives:

- `feat: add customer management`
- `fix: prevent duplicate invoices`
- `chore: update dependencies`

Open a focused pull request, explain the behavior and verification, and request review. CI must pass. Prefer squash merging so `main` stays easy to read, then delete the merged branch.
