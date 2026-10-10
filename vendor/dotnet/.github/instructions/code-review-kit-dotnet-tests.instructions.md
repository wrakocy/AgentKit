---
description: Organization-wide PR review rules for .NET test code — xUnit, Moq, test-data builders and FluentValidation.TestHelper conventions. Covers the shape of tests being added; code-review-kit-general.instructions.md covers whether a PR needed a test at all. Repository-specific test rule files take precedence where they conflict.
applyTo: "**/*Test*/**/*.cs,**/*Tests.cs,**/*Test.cs"
---
<!-- GENERATED from wrak.agentkit@v1.0.0 (src/dotnet/instructions/code-review-kit-dotnet-tests.instructions.md). Do not edit; change the source in wrak.agentkit and re-sync. -->

# Code Review Standards: .NET Tests

Severity tags `[Required]` and `[Suggested]` have the meaning defined in
`code-review-kit-general.instructions.md`. This file covers the shape of tests already being
added. Whether the PR needed a test, and unit-vs-integration placement, are covered in that
general file. The conventions here are the ones in the kit's `dotnet-unit-test` skill.

## Unit test structure

- **[Required]** Flag a test file covering more than one method under test (for example, a
  consolidated `<Class>Tests.cs`) instead of one file per method, named
  `<ClassUnderTest>_<MethodName>.cs`.
- **[Required]** Flag a new public method that guards its arguments with no test asserting the
  guard throws (`Assert.ThrowsAsync<ArgumentNullException>(...)` or the equivalent for the
  repository's guard convention).
- **[Suggested]** Flag Moq mocks declared as anything other than `readonly` fields initialized
  inline, or a subject constructed outside the test class's constructor, when the repository's
  other tests follow that pattern.
- **[Suggested]** Flag several near-duplicate `[Fact]` methods that should be one
  `[Theory]`/`[InlineData]`, or a `[Theory]` with a single case that should be a `[Fact]`.
- **[Suggested]** Flag a test whose only assertion is a `Verify(...)` on a mock when the method
  under test also returns a result or changes visible state that the test could assert.

## Test data

- **[Required]** Flag a test building a structured model through an inline object initializer
  with several properties set, instead of through a test-data builder, once that model has real
  structure. If no builder exists yet for the model, flag the missing builder; adding the builder
  is the fix, not keeping the initializer.

## Validators (FluentValidation)

- **[Required]** Flag a validator test that doesn't use `FluentValidation.TestHelper`
  (`TestValidateAsync`, `ShouldHaveValidationErrorFor`, `ShouldNotHaveAnyValidationErrors`), and a
  new validator rule with no corresponding test (one `[Fact]` or `[Theory]` per rule, plus a smoke
  test that a child validator is actually invoked where one is used).

## Component tests (bUnit)

- **[Suggested]** Flag a component test that asserts on implementation details (private fields,
  exact markup of unrelated regions) instead of rendered output and behavior a user would see.
