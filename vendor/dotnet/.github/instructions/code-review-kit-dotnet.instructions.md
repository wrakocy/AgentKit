---
description: Organization-wide PR review rules for .NET code (C#) — nullability, async and cancellation, dependency-injection lifetimes, disposal, exceptions and logging. Applies to every C# file. Repository-specific code-review-*.instructions.md files take precedence where they conflict.
applyTo: "**/*.cs,**/*.razor"
---
<!-- GENERATED from wrak.agentkit@v1.2.0 (src/dotnet/instructions/code-review-kit-dotnet.instructions.md). Do not edit; change the source in wrak.agentkit and re-sync. -->

# Code Review Standards: .NET

Severity tags `[Required]` and `[Suggested]` have the meaning defined in
`code-review-kit-general.instructions.md`. Don't flag anything the compiler, the repository's
analyzers or `dotnet format` already enforce (check the project's `.editorconfig` and analyzer
settings before raising a style or nullability warning as a finding).

## Nullability

- **[Suggested]** Flag a null-forgiving operator (`!`) on a value that can actually be null at
  that point, used to silence a warning instead of handling the null.
- **[Suggested]** Flag a public member whose nullability annotation contradicts its behavior (a
  non-nullable return type that can return `null`, or a nullable parameter that is dereferenced
  without a check).

## Async and cancellation

- **[Required]** Flag `async void` anywhere other than an event handler.
- **[Required]** Flag sync-over-async (`.Result`, `.Wait()`, `.GetAwaiter().GetResult()`) on a
  request, UI or message-handling path; it risks thread-pool starvation and deadlocks.
- **[Required]** Flag a method that accepts a `CancellationToken` but doesn't pass it to the
  cancellable async calls it makes (database, HTTP, I/O, other async APIs that take a token).
- **[Suggested]** Flag a new async public operation on a request path that doesn't accept a
  `CancellationToken` when its siblings do.
- **[Suggested]** Flag an un-awaited task (fire-and-forget) with no error handling or explicit
  comment explaining why it's safe.

## Dependency injection

- **[Required]** Flag a captive dependency: a Singleton that takes a Scoped or Transient
  dependency through its constructor (directly or transitively), which silently extends that
  dependency's lifetime.
- **[Required]** Flag an EF Core `DbContext` (or another per-unit-of-work type) registered or held
  as a Singleton.
- **[Suggested]** Flag `new HttpClient()` per call or per instance instead of
  `IHttpClientFactory` or a typed/named client.
- **[Suggested]** Flag a service resolved through `IServiceProvider` (service locator) where
  constructor injection would work.
- **[Required]** In Blazor Server applications, flag a service whose state must be shared across
  circuits (an application-wide cache, for example) registered as anything other than `Singleton`,
  and a service holding per-user or per-circuit state registered as anything other than `Scoped`.
  A Singleton holding user data leaks it across users; a Scoped "shared cache" doesn't share
  anything. (This rule lives here, not in the Blazor file, because registrations are in ordinary
  `.cs` files.)
- **[Required]** In Blazor Server applications, flag a Singleton service holding mutable state
  without thread-safe access; every circuit calls it concurrently.

## Disposal

- **[Suggested]** Flag an `IDisposable` or `IAsyncDisposable` the code creates and owns that isn't
  disposed (`using` / `await using`), and a type that owns disposable fields but doesn't implement
  `IDisposable`/`IAsyncDisposable` itself.

## Exceptions

- **[Required]** Flag `throw ex;` inside a catch block; it resets the stack trace. Use `throw;` or
  wrap the exception as an inner exception.
- **[Suggested]** Flag a catch-all (`catch (Exception)`) that swallows the exception without
  logging, rethrowing or returning a deliberate failure result.

## Logging

- **[Suggested]** Flag string interpolation or concatenation in a log message instead of a message
  template with named placeholders (`_logger.LogInformation("Order {OrderId} created", id)`); it
  defeats structured logging.

## Data access (EF Core)

- **[Suggested]** Flag a query that materializes (`ToList`, `AsEnumerable`) before filtering,
  sorting or paging that could run in the database, and a query issued inside a loop over the
  results of another query (N+1).
- **[Suggested]** Flag a read-only query without `AsNoTracking()` when comparable read paths in the
  repository use it.
