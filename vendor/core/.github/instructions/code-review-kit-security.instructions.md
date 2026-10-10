---
description: Organization-wide PR review rules for security-sensitive changes (authentication, authorization, identity/claims, secrets, sensitive data, externally supplied input, file upload, cryptography, endpoint exposure). Language-agnostic. Applies only when a change touches one of these boundaries; most changes will not. Stack-specific and repository-specific security rule files sit beside this one.
applyTo: "**"
---
<!-- GENERATED from wrak.agentkit@v1.0.0 (src/core/instructions/code-review-kit-security.instructions.md). Do not edit; change the source in wrak.agentkit and re-sync. -->

# Code Review Standards: Security (Organization-Wide)

Severity tags `[Required]` and `[Suggested]` have the meaning defined in
`code-review-kit-general.instructions.md`. Apply these rules only when the diff actually touches a
security-sensitive concern. Don't force-fit them onto an ordinary CRUD change that crosses no such
boundary. This file is the generic checklist for the security reviewer. Stack-specific
(`code-review-kit-<stack>-security`) and repository-specific
(`code-review-*security*.instructions.md`) files add the concrete forms of these rules, and the
repository-specific file wins where they conflict.

## Authentication and authorization

- **[Required]** Flag a new endpoint, page, route, message handler or application operation that
  exposes data or performs a state change and isn't gated the same way comparable existing ones
  are (the same authorization attribute, policy, or role/claim check through the repository's
  established helper).
- **[Required]** Flag an authorization decision made only in the UI (hiding or disabling a
  control) with no corresponding server-side check in the code that performs the action. A hidden
  button is not an authorization boundary.
- **[Required]** Flag any code path that could make a development-only authentication bypass
  (a fake or test authentication handler, an "auto-login" switch) reachable outside the
  development environment. Its registration must stay conditioned on the environment.

## Identity and claims

- **[Required]** Flag a claim or identity attribute read with no handling for its absence, when
  the result feeds an authorization decision or a data query.
- **[Required]** Flag code that derives "who is this request for" from client-supplied input
  (a query parameter, hidden form field, request body, header the client controls) instead of the
  authenticated principal.

## Secrets and sensitive configuration

- **[Required]** Flag any secret, connection string, API key, token or credential committed as a
  literal in source or in a configuration file checked into the repository. Secrets belong in a
  secret store, the environment, or local-only developer secrets.
- **[Required]** Flag a fallback default for a secret-bearing configuration value that would
  silently work outside development, masking a missing secret binding instead of failing fast.
- **[Suggested]** Flag a secret or token value included in a log statement or exception message
  that could reach a log sink or telemetry.

## Sensitive data

- **[Suggested]** Flag personal or other sensitive data that is logged at a level enabled in
  production, added to an API response or data-transfer type beyond what the consuming feature
  needs, or cached longer than the feature requires.

## Externally supplied input

- **[Required]** Flag a database query, shell command, file path, LDAP/XPath expression or similar
  built by string concatenation or interpolation from external input instead of parameters or a
  safe API.
- **[Required]** Flag deserialization of untrusted content into polymorphic or unconstrained types
  (type-name handling, unrestricted object graphs) instead of a constrained, known type.
- **[Required]** Flag reliance on client-side or validation-library-only checks for something
  that needs a server-side guard against a malicious, not just careless, caller. The typical case
  is an identifier used to fetch or change another user's record without a server-side ownership
  or authorization check.
- **[Suggested]** Flag an outbound request to a URL or host taken from external input without an
  allowlist or equivalent constraint (server-side request forgery).

## File upload

- **[Required]** Flag upload handling that trusts the client-supplied file name, extension or
  content type to decide what the file is, instead of validating actual content and size
  server-side, or that writes an uploaded file to a path built from unsanitized input (path
  traversal).

## Cryptography

- **[Required]** Flag hand-rolled cryptography, a weak or deprecated algorithm or mode, a
  hardcoded key or IV, or a non-cryptographic random source used for security tokens, where the
  platform or a vetted library already provides a safe path.

## Endpoint exposure and security-sensitive configuration

- **[Required]** Flag a new public endpoint, or a changed CORS, cookie, session, CSRF/antiforgery
  or data-protection setting, that widens the attack surface (a permissive cross-origin policy, a
  session cookie without HttpOnly/Secure/appropriate SameSite, disabled request-forgery protection)
  without a stated reason.
- **[Suggested]** Flag an error path that returns a stack trace or other internal detail to the
  client outside development; check that detailed-error settings are gated by environment.
