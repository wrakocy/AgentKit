---
description: Organization-wide PR review rules for security-sensitive changes in ASP.NET Core applications — authorization attributes and policies, environment-gated development auth, claims, configuration and secrets, EF Core raw SQL, deserialization, IFormFile uploads, cryptography and DataProtection, cookies, CORS, antiforgery, error details, and Microsoft.Identity.Web/OpenID Connect. The .NET forms of the rules in code-review-kit-security.instructions.md. Applies only when a change touches one of these boundaries.
applyTo: "**/*.cs,**/*.razor,**/appsettings*.json,**/*.csproj"
---
<!-- GENERATED from wrak.agentkit@v1.2.0 (src/dotnet/instructions/code-review-kit-dotnet-security.instructions.md). Do not edit; change the source in wrak.agentkit and re-sync. -->

# Code Review Standards: ASP.NET Core Security

Severity tags `[Required]` and `[Suggested]` have the meaning defined in
`code-review-kit-general.instructions.md`. These are the ASP.NET Core forms of the generic rules
in `code-review-kit-security.instructions.md`. Apply them only when the diff touches a security
boundary. The repository's own security rule file names its specific auth wiring and helpers, and
wins where it conflicts with this file.

## Authentication and authorization

- **[Required]** Flag a new controller action, minimal-API endpoint, Razor page, routable
  component (`@page`), SignalR hub or hub method that exposes data or changes state without the
  authorization comparable existing ones use (`[Authorize]` with the same policy or roles,
  `.RequireAuthorization(...)`, or the repository's claim-check helper). Flag a new
  `[AllowAnonymous]` or `.AllowAnonymous()` without a stated reason.
- **[Required]** Flag registration of a development-only authentication handler or scheme that
  isn't conditioned on `IHostEnvironment.IsDevelopment()` (or the repository's equivalent
  environment check).
- **[Required]** Flag an authorization check performed only in Razor markup (`<AuthorizeView>`,
  hiding a button) for an action whose server-side handler doesn't check authorization itself.

## Claims

- **[Required]** Flag `User.FindFirst(...)`/`FindFirstValue(...)` or a claims-helper result used in
  an authorization decision or data query with no handling for a missing claim.
- **[Required]** Flag a user or tenant identifier taken from a route value, query string, form
  field or request body instead of the authenticated `ClaimsPrincipal`.

## Configuration and secrets

- **[Required]** Flag a secret, connection string with credentials, API key or client secret in
  `appsettings*.json`, `launchSettings.json` or source. Local development uses user secrets;
  deployed environments use a secret store or environment configuration.
- **[Required]** Flag a secret-bearing configuration read with a fallback (`?? "..."`,
  `GetValue<string>("Key", "default")`) that would work silently outside development. Prefer
  options validation with `ValidateOnStart()` so a missing secret fails at startup.
- **[Suggested]** Flag a secret, token or full connection string passed to `ILogger`/Serilog or
  included in an exception message.

## Data access and input

- **[Required]** Flag `FromSqlRaw`, `ExecuteSqlRaw` or a raw ADO.NET command whose SQL is built by
  interpolation or concatenation from input. Use `FromSql`/`FromSqlInterpolated`,
  `ExecuteSql`/`ExecuteSqlInterpolated`, or explicit parameters.
- **[Required]** Flag `TypeNameHandling` other than `None` in Newtonsoft.Json settings applied to
  untrusted input, and any use of `BinaryFormatter`, `NetDataContractSerializer` or `SoapFormatter`.
- **[Required]** Flag an entity loaded by an identifier from the request with no ownership or
  authorization check against the current user, when the data is user- or tenant-scoped.

## File upload (`IFormFile`)

- **[Required]** Flag code that trusts `IFormFile.FileName` or `ContentType` to decide what the
  file is, or builds a storage path with `Path.Combine` from the client-supplied file name. Use a
  generated file name and validate content (signature/magic bytes) server-side.
- **[Suggested]** Flag an upload endpoint without an explicit size limit (`RequestSizeLimit`,
  `MultipartBodyLengthLimit`, or a checked `Length`).

## Cryptography and DataProtection

- **[Required]** Flag MD5 or SHA-1 used for a security purpose, DES/TripleDES/RC2, ECB mode, a
  hardcoded key or IV, or `System.Random` used to generate tokens, codes or keys. Use
  `RandomNumberGenerator`, the DataProtection API (`IDataProtector`), or a vetted library.
- **[Suggested]** Flag a change to DataProtection key storage or application name, which can
  invalidate existing cookies and protected payloads or share keys across applications
  unintentionally.

## Cookies, CORS, antiforgery and error details

- **[Required]** Flag an authentication or session cookie configured without `HttpOnly`, with
  `SecurePolicy` weaker than `Always` outside development, or with `SameSite=None` without a stated
  cross-site requirement.
- **[Required]** Flag a CORS policy that combines `AllowAnyOrigin` (or a wildcard origin) with
  `AllowCredentials`, and any new permissive CORS policy without a stated reason.
- **[Required]** Flag disabled antiforgery validation (`[IgnoreAntiforgeryToken]`,
  `.DisableAntiforgery()`) on an endpoint that accepts cookie-authenticated form posts.
- **[Suggested]** Flag `UseDeveloperExceptionPage()`, detailed Blazor circuit errors
  (`CircuitOptions.DetailedErrors`) or `ProblemDetails` exception details that aren't gated to the
  development environment.

## Microsoft.Identity.Web / OpenID Connect (when the application uses it)

- **[Required]** Flag token validation weakened in `TokenValidationParameters` (`ValidateIssuer`,
  `ValidateAudience`, `ValidateLifetime` or `ValidateIssuerSigningKey` set to `false`) or a custom
  issuer validator that accepts any issuer.
- **[Suggested]** Flag broadened requested scopes or app roles, or a change to the
  `OnTokenValidated`/claims-transformation pipeline, without a stated reason; these change what
  every authenticated user can do.
