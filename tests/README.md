# Vibe Test Suite

## 🧪 Test Organization

The test suite is organized into three categories:

- **`unit/`** - Fast, isolated tests for individual functions and modules
- **`integration/`** - Tests for component interaction and service integration
- **`user/`** - End-to-end workflow tests simulating real user scenarios

## 🔧 Test Utilities

### Shared Test Helpers (`utils.ts`)

All tests should use the shared utilities from `utils.ts` for consistent behavior:

```typescript
import {
  cleanupTestProject,
  createTestProject,
  ensureDirTest,
  findProjectRoot,
  safeGetCwd,
  withDirectory,
} from '../utils.ts'
```

### Key Utilities

#### `createTestProject(testName, files, options)`

Creates a temporary test project with specified manifest files.

**Options:**

- `testCategory`: `'unit' | 'integration' | 'user'` - determines subdirectory
- `isolateDirectory`: `boolean` - use `/tmp` for complete isolation

**Example:**

```typescript
const testDir = await createTestProject('my-test', {
  'package.json': { name: 'test-project', dependencies: { hono: '^4.0.0' } },
  'deno.json': { imports: { effect: 'npm:effect@^3.0.0' } },
}, { testCategory: 'unit' })
```

#### `withDirectory(dir, fn)`

Safely executes a function in a different directory with automatic restoration.

**Example:**

```typescript
await withDirectory(testDir, async () => {
  const result = await Effect.runPromise(someCommand())
  assertEquals(result, expectedValue)
})
```

#### `safeGetCwd(fallbackUrl?)`

Gets current working directory with graceful fallback if directory doesn't exist.

#### `findProjectRoot(startPath?)`

Finds project root by looking for `deno.json`, with robust error handling.

## 🏗️ Directory Management Best Practices

### Problem: Working Directory Instability

Tests can fail when:

- Previous tests delete the current working directory
- Tests run in different orders
- Directory changes cascade between tests

### Solution: Robust Directory Handling

**❌ Fragile Pattern:**

```typescript
// Don't do this - will fail if cwd is deleted
let projectRoot = Deno.cwd()
```

**✅ Robust Pattern:**

```typescript
// Use shared utilities that handle missing directories
const projectRoot = await findProjectRoot()
const originalCwd = safeGetCwd()
```

### Test Structure Template

```typescript
import { cleanupTestProject, createTestProject, withDirectory } from '../utils.ts'

Deno.test('Feature Tests', async (t) => {
  await t.step('should do something', async () => {
    const testDir = await createTestProject('feature-test', {
      'package.json': { name: 'test', dependencies: { pkg: '^1.0.0' } },
    })

    try {
      await withDirectory(testDir, async () => {
        // Test logic here - directory will be restored automatically
        const result = await Effect.runPromise(featureFunction())
        assertEquals(result, expected)
      })
    } finally {
      await cleanupTestProject(testDir)
    }
  })
})
```

## 🎯 Test Isolation Principles

### 1. Independent Directory Management

- Each test creates its own temporary directory
- Use `withDirectory()` for safe directory changes
- Always clean up test directories in `finally` blocks

### 2. Graceful Error Handling

- Tests should not fail due to missing working directories
- Use `safeGetCwd()` instead of `Deno.cwd()` directly
- Handle directory deletion gracefully

### 3. Predictable Test Environment

- Tests should work regardless of execution order
- No shared state between tests
- Clean slate for each test scenario

## 🚨 Common Pitfalls

### Directory Not Found Errors

**Symptom:** `NotFound: No such file or directory (os error 2)` on `Deno.cwd()`
**Solution:** Use `safeGetCwd()` or `findProjectRoot()` from test utilities

### Test Isolation Failures

**Symptom:** Tests pass individually but fail when run together
**Solution:** Use `withDirectory()` and proper cleanup in `finally` blocks

### Path Resolution Issues

**Symptom:** Tests can't find project files or create temporary directories
**Solution:** Use `findProjectRoot()` to establish stable base directory

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
