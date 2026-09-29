# Security

- Treat every `NEXT_PUBLIC_*` value as public. The template needs no secret/service-role key.
- Validate URL parameters, form values, files, and external data with Zod at the server boundary.
- Verify identity with Supabase `getClaims()` or `getUser()`, never an unverified cookie session.
- Authorize protected operations with `requirePermission()` and enforce the same boundary with grants/RLS.
- Never authorize from `raw_user_meta_data`; profile and membership roles are database-controlled.
- Keep security-definer functions in the unexposed `private` schema with an empty search path and minimal execute grants.
- Use the private Storage bucket, allowlisted MIME types/size, scoped paths, and short-lived signed URLs.
- Keep direct audit writes disabled; audit meaningful database changes through triggers.
- Preserve Next Origin checks, safe redirect allowlisting, framing/sniffing/referrer/permissions headers, and normal JSX escaping.
- Return useful safe errors without exposing SQL details, identifiers, secrets, or stack traces.

Production requires TLS, exact Auth redirect URLs, reliable SMTP, abuse-appropriate rate limits, dependency alerts, least-privilege operator access, and reviewed backup/retention settings. Add a nonce-based Content Security Policy only after required scripts and integrations are known; do not ship an `unsafe-inline` shortcut.
