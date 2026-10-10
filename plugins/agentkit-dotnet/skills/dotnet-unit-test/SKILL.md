---
name: dotnet-unit-test
description: "Add or change a .NET unit test using the organization's xUnit + Moq conventions: one test class per method under test, Moq mocks as readonly fields, Fact vs. Theory, Arrange/Act/Assert, guard-path tests, fluent test-data builders, and FluentValidation.TestHelper for validators. Use whenever adding or changing behavior in a .NET project that needs unit-test coverage. The repository's own AGENTS.md and test skills add project-specific rules (test project layout, builder locations, guard library)."
---
<!-- GENERATED from wrak.agentkit@v1.0.0 (src/dotnet/skills/dotnet-unit-test/SKILL.md). Do not edit; change the source in wrak.agentkit and re-sync. -->

# Add a .NET Unit Test

Read the repository's testing rules first: the testing section of `AGENTS.md`, the guide it links
to, and any repository skill for unit tests. They decide which project a test goes in, where
test-data builders live, and which guard-clause and random-data libraries the code uses. The
conventions below apply wherever the repository doesn't say otherwise.

Unit tests isolate the code under test: every dependency that touches the file system, network,
database, clock or other process state is replaced with a test double. A test that needs the real
dependency is an integration test and belongs in the repository's integration-test project.

## Steps

1. **One test class per method under test**, named `<ClassUnderTest>_<MethodName>.cs` (for
   example `CreateOrderHandler_Handle.cs`, `OrderValidator_Constructor.cs`), placed in a folder
   and namespace that mirror the code under test. Don't create one large
   `<ClassUnderTest>Tests.cs` file covering every method.
2. **Mock dependencies with Moq**, held as `readonly` fields initialized inline, and construct the
   subject in the test class's constructor:
   ```csharp
   private readonly Mock<IOrderRepository> _repository = new();
   private readonly CreateOrderHandler _handler;

   public CreateOrderHandler_Handle() => _handler = new(_repository.Object);
   ```
3. **Use `[Fact]` for a single case and `[Theory]` with `[InlineData]` (or `[MemberData]`) for
   parameterized cases.** Don't write several near-duplicate `[Fact]` methods that differ only in
   input values.
4. **Follow Arrange / Act / Assert**, with comments for anything non-trivial. Assert the visible
   outcome (the return value, the resulting state). Verify important side-effect calls explicitly
   with `_mock.Verify(..., Times.Once)`, but don't let a `Verify` replace asserting the result.
5. **Always test the guard path** of a public method that validates its arguments:
   `await Assert.ThrowsAsync<ArgumentNullException>(() => _handler.Handle(null!, CancellationToken.None));`
   Use the exception type the repository's guard convention actually throws.
6. **Pass a `CancellationToken`** through every async call under test. Where cancellation behavior
   matters, add a test that a cancelled token is honored.
7. **Build structured test models with test-data builders**, not inline object initializers, once
   a model has any real structure. A builder exposes fluent `With<Property>(...)` setters and a
   convenience method that fills every field with valid random data. If no builder exists yet for
   the model, add one in the location the repository uses for builders.
8. **Validator tests** (when the repository uses FluentValidation) use
   `FluentValidation.TestHelper`: `var result = await _validator.TestValidateAsync(model);` then
   `result.ShouldHaveValidationErrorFor(x => x.Field).WithErrorMessage(...)` or
   `result.ShouldNotHaveAnyValidationErrors()`. Write one test per rule, plus a smoke test that a
   child validator is actually invoked where one is used. For rules on collection items, reference
   the indexed property by string: `$"{nameof(Model.Items)}[0].{nameof(Item.Field)}"`.
9. **Run the narrowest test command** while iterating (for example
   `dotnet test <TestProject> --filter "FullyQualifiedName~CreateOrderHandler_Handle"`), then the
   repository's full Build & Test ladder before review.
