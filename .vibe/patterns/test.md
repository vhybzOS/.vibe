# Test Organization Patterns

## Test Structure Algorithm

```pseudo
INPUT: implementation_file, test_requirements
test_categories = classify_tests(test_requirements)
FOR category IN [unit, integration, user] DO
  test_file = create_test_file(category, implementation_file)
  test_cases = generate_test_cases(category, requirements)
  link_annotation = create_tested_by_annotation(test_file)
END
OUTPUT: comprehensive_test_suite, linked_annotations
```

## File Header Template

```typescript
/**
 * [Component Name] Implementation
 *
 * [Brief description]
 *
 * @tested_by tests/unit/[name].test.ts (unit test coverage)
 * @tested_by tests/integration/[name].test.ts (integration coverage)
 * @tested_by tests/user/[name].test.ts (user workflow coverage)
 */
```

## Test Organization

```
tests/
├── unit/           # Pure functions, isolated logic
├── integration/    # Component interaction
├── user/           # Complete workflows  
└── utils.ts        # Shared test utilities
```

## Test Pattern

```typescript
Deno.test('[Component] should [expected behavior]', async () => {
  // Arrange
  const input = createTestInput()

  // Act
  const result = await runTestSubject(input)

  // Assert
  assertEquals(result, expectedOutput)
})
```

## Context Links

- [@tested_by annotations] - implementation linking
- [test utilities] - shared helpers
- [Effect test helpers] - async testing patterns
