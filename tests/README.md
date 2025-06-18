# .vibe Test Suite

Comprehensive test coverage organized by test type and scope.

## Test Structure

### 🔬 **Unit Tests** (`tests/unit/`)

Tests individual functions and components in isolation.

- **`init-command.test.ts`** - Core init command functionality
- Focus: Pure function behavior, edge cases, error handling
- Fast execution, no external dependencies

### 🔗 **Integration Tests** (`tests/integration/`)

Tests interaction between components and systems.

- **`cli-integration.test.ts`** - CLI components working together
- Focus: Component interaction, schema validation, file system integration
- Medium execution time, tests real component integration

### 👤 **User Tests** (`tests/user/`)

End-to-end workflow simulations from user perspective.

- **`real-world-workflow.test.ts`** - Complete user workflows
- Focus: Real project structures, CLI executable, complete user experience
- Slower execution, tests actual executable with realistic scenarios

## Running Tests

### Quick Commands

```bash
deno task test              # Run all test suites
deno task test:unit         # Unit tests only  
deno task test:integration  # Integration tests only
deno task test:user         # User workflow tests only
deno task test:verbose      # All tests with verbose output
```

### Test Runner Options

```bash
# Custom test runner with options
deno run --allow-all tests/test-runner.ts -c unit -v    # Verbose unit tests
deno run --allow-all tests/test-runner.ts -f            # Fail fast mode
deno run --allow-all tests/test-runner.ts --help        # Show all options
```

### Legacy Tests

```bash
deno task test:legacy       # Run old monolithic test.ts (deprecated)
```

## Test Categories Explained

### Unit Tests Coverage

- ✅ Directory structure creation
- ✅ Configuration file generation
- ✅ Dependency detection from package.json
- ✅ Error handling (existing directories, force flag)
- ✅ Edge cases (no package.json, invalid JSON)

### Integration Tests Coverage

- ✅ CLI command runner integration
- ✅ Complex project structure handling
- ✅ Schema validation across components
- ✅ File system interaction patterns

### User Tests Coverage

- ✅ **Deno Project Workflow**: Complete initialization of Deno project with deno.json
- ✅ **Node.js Project Workflow**: Full Node.js project with package.json dependencies
- ✅ **Force Reinitalization**: Overwriting existing .vibe with --force flag
- ✅ **CLI Help & Version**: User-facing CLI information
- ✅ **Error Scenarios**: Graceful handling of edge cases

## User Test Scenarios

The user tests simulate real-world workflows:

1. **Create temporary project directory**
2. **Populate with realistic project files** (package.json, deno.json, source code)
3. **Run actual `./vibe` executable**
4. **Verify complete .vibe structure creation**
5. **Validate dependency detection and configuration**
6. **Test CLI flags and options**
7. **Clean up temporary files**

Each test creates isolated temporary directories and tests the complete user experience from start to finish.

## Quality Standards

All tests follow the TDD principles from AGENTS.md:

- ✅ **Test First**: Tests define expected behavior before implementation
- ✅ **Runtime Verification**: Tests run against actual compiled code
- ✅ **Quality Gates**: Type check, lint, and runtime tests all pass
- ✅ **Isolation**: Each test runs in isolated temporary directories
- ✅ **Cleanup**: Automatic cleanup of test artifacts
- ✅ **Real Workflows**: User tests simulate actual usage patterns

## Adding New Tests

### Unit Tests

Add to `tests/unit/` for testing individual functions:

```typescript
describe('New Feature Unit Tests', () => {
  it('should test specific function behavior', async () => {
    // Test isolated function
  })
})
```

### Integration Tests

Add to `tests/integration/` for testing component interaction:

```typescript
describe('Feature Integration Tests', () => {
  it('should test components working together', async () => {
    // Test multiple components interacting
  })
})
```

### User Tests

Add to `tests/user/` for end-to-end workflows:

```typescript
describe('Feature User Workflow', () => {
  it('should test complete user experience', async () => {
    // Create project, run vibe commands, verify results
  })
})
```

## Test Execution Times

- **Unit Tests**: ~100ms (fast feedback loop)
- **Integration Tests**: ~80ms (component interaction)
- **User Tests**: ~1.8s (complete workflows with file I/O)
- **Total Suite**: ~7s (comprehensive coverage)

This tiered approach provides fast feedback for development while ensuring comprehensive real-world testing.
