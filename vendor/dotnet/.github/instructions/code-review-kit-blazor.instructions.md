---
description: Organization-wide PR review rules for Blazor components and pages — code-behind vs. markup, component lifecycle and disposal, loading/empty/error states, validation presentation, accessibility, responsive layout, and component test coverage. Repository-specific Web/UI rule files (which name the repository's base component, shared components and state patterns) take precedence where they conflict.
applyTo: "**/*.razor,**/*.razor.cs,**/*.razor.css"
---
<!-- GENERATED from wrak.agentkit@v1.2.0 (src/dotnet/instructions/code-review-kit-blazor.instructions.md). Do not edit; change the source in wrak.agentkit and re-sync. -->

# Code Review Standards: Blazor

Severity tags `[Required]` and `[Suggested]` have the meaning defined in
`code-review-kit-general.instructions.md`. For every "compare with comparable pages" rule below,
check the nearest existing page or component of the same kind (a search page, a detail page, a
shared widget) before flagging. The point is consistency with what the repository already does,
not an abstract ideal.

## Component structure

- **[Suggested]** Flag non-trivial logic (more than parameter passthrough or a one-line computed
  value) in a `.razor` file's `@code { }` block instead of a paired `<Name>.razor.cs` code-behind,
  when sibling components in the same area use the code-behind pairing.
- **[Required]** Flag non-trivial conditional or computed logic written inline in markup
  (multi-condition boolean expressions, cross-field comparisons, formatting or derivation beyond
  simple display binding) when a code-behind class exists. Expose it as a `protected` property or
  method on the code-behind instead.
- **[Required]** Flag a component that bypasses the repository's designated application-layer
  entry point (as described in `AGENTS.md`) to reach a data store, external API client or
  infrastructure service directly.

## Lifecycle, threading and disposal

- **[Required]** Flag a component that subscribes to an event, timer, observable or
  `NavigationManager.LocationChanged` without unsubscribing in `Dispose`/`DisposeAsync`
  (implementing `IDisposable`/`IAsyncDisposable`).
- **[Required]** Flag UI state updated from a non-render context (a timer callback, an event from
  a singleton service, a background task) without `InvokeAsync(...)` around the state change and
  `StateHasChanged()`.
- **[Suggested]** Flag JavaScript interop in `OnInitialized{Async}` or during prerendering instead
  of `OnAfterRender{Async}(firstRender: true)`.

## User-facing behavior and accessibility

These rules are what the code reviewer's UI section applies to Blazor code.

- **[Required]** Flag a page or component that performs an async call to the backing store or an
  external service without visible loading feedback, when comparable pages show it (a spinner,
  progress indicator or disabled state).
- **[Required]** Flag a form whose validation errors aren't surfaced to the user (no
  `<ValidationMessage>`/`<ValidationSummary>` or the repository's validator integration on an
  `EditForm`). A rule that exists but is never shown gives the user no protection.
- **[Required]** Flag a page with no handling for an empty result set (rendering nothing instead
  of an explicit "no results" state) or for a failed call (swallowed instead of a user-visible
  notification), when comparable pages handle these states.
- **[Required]** Flag a non-decorative image or icon-only interactive control with no accessible
  name (`alt`, `aria-label`, or the UI library's equivalent parameter), and a custom interactive
  element (a `<div>` or `<span>` with `@onclick`) that isn't keyboard-operable when a native button
  or the UI library's button would have worked.
- **[Suggested]** Flag a layout that hard-codes fixed pixel widths or otherwise won't reflow at a
  narrow viewport, when comparable pages use the UI library's responsive grid or breakpoints.
- **[Suggested]** Flag custom text/background color combinations that look low-contrast, and a
  dialog that doesn't return focus sensibly when it closes.
- **[Suggested]** When the PR or task links a design artifact, flag visible divergence from it
  (spacing, a missing hover/disabled/empty state). The reviewer should be given the artifact
  rather than asked to infer it.
- **[Suggested]** Flag a new component that duplicates an existing shared component's
  responsibility (a loading indicator, page header, alert, lookup select) instead of reusing it.

## Component test coverage

- **[Suggested]** Flag a new or meaningfully changed component with non-trivial behavior
  (conditional rendering branches, an event handler containing logic, a display value derived
  from more than one input) that has no accompanying test, when comparable components have either
  a bUnit test or a plain test of the code-behind logic. Either form satisfies this rule; follow
  the repository's established pattern for similar components.
