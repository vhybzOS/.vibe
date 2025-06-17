# 🧪 .vibe Test Suite

Comprehensive test suite ensuring .vibe components work correctly and don't break during development.

## 🎯 Test Structure

```
tests/
├── integration.test.ts       # End-to-end integration tests
├── unit/
│   ├── schemas.test.ts      # Schema validation tests
│   └── core.test.ts         # Core module unit tests
├── e2e/
│   ├── cli.test.ts          # CLI command tests
│   └── daemon.test.ts       # Daemon lifecycle tests
├── performance/
│   └── benchmark.test.ts    # Performance benchmarks
└── README.md               # This file
```

## 🚀 Running Tests

### Quick Test (Essential Only)

```bash
# Run core functionality tests
deno test tests/integration.test.ts --allow-all

# Check schema validation
deno test tests/unit/schemas.test.ts --allow-all
```

### Full Test Suite

```bash
# Run all tests
deno test --allow-all

# Run with coverage
deno test --allow-all --coverage=coverage

# Run specific test file
deno test tests/unit/core.test.ts --allow-all

# Run tests matching pattern
deno test --allow-all --filter="Schema"
```

### Performance Benchmarks

```bash
# Run performance tests
deno test tests/performance/benchmark.test.ts --allow-all

# Run with detailed output
deno test tests/performance/benchmark.test.ts --allow-all -- --verbose
```

## 📋 Test Categories

### 🔧 Integration Tests (`integration.test.ts`)

**Purpose**: Verify complete workflows and component interactions

**What it tests**:

- ✅ Schema validation with real data
- 🔍 AI tool detection across different project types
- 💾 Rule saving/loading with file system
- 🔄 Tool configuration synchronization
- 🧠 Memory storage and search functionality
- 📖 Decision capture and diary operations
- 📦 Dependency discovery from manifests
- ⚡ Effect-TS integration and error handling

**When to run**: Before commits, after major changes

### 🧩 Unit Tests (`unit/`)

**Purpose**: Test individual components in isolation

#### Schema Tests (`schemas.test.ts`)

- ✅ Valid data acceptance
- ❌ Invalid data rejection
- 🔧 Default value application
- 🔗 Type consistency across schemas
- 📊 Zod v4 `z.output` type handling

#### Core Tests (`core.test.ts`)

- 🔍 Tool detection logic
- 👀 File watcher configuration
- ⚡ Effect composition patterns
- 🛠️ Utility function behavior

**When to run**: During development, for TDD

### 🖥️ E2E Tests (`e2e/`)

**Purpose**: Test user-facing interfaces and real-world scenarios

#### CLI Tests (`cli.test.ts`)

- 📋 Command help and usage
- 🔧 Project initialization
- 📊 Status reporting
- 🔄 Configuration synchronization
- 🎯 Rule generation
- 📦 AgentFile export
- 🚨 Error handling and edge cases

#### Daemon Tests (`daemon.test.ts`)

- 🚀 Daemon startup and lifecycle
- 📡 MCP server integration
- 👀 File watching and auto-discovery
- 💚 Health monitoring
- 🌐 Cross-platform compatibility
- 🛑 Graceful shutdown

**When to run**: Before releases, for user acceptance

### ⚡ Performance Tests (`performance/`)

**Purpose**: Ensure acceptable performance and catch regressions

**What it measures**:

- 🔍 Tool detection speed (< 100ms average)
- 📋 Schema validation (< 1ms per validation)
- 💾 File system operations efficiency
- 🧠 Memory usage and leak detection
- ⚡ Effect composition performance

**When to run**: Before releases, when optimizing

## 🎮 Test Utilities

### Test Data Setup

Tests automatically create temporary directories and test files:

```typescript
// Integration tests create:
/tmp/vibe-test-project/
├── .vibe/
│   ├── rules/
│   ├── memory/
│   └── diary/
├── .cursorrules
└── package.json
```

### Cleanup

All tests clean up after themselves:

- Temporary directories removed
- Test processes terminated
- PID files cleaned up

### Environment Isolation

- Tests run in isolated temp directories
- No interference with actual .vibe installations
- Mock external dependencies where needed

## 🚨 Test Requirements

### Permissions

Tests require full Deno permissions (`--allow-all`) for:

- File system access (creating test projects)
- Network access (MCP server testing)
- Process spawning (daemon testing)
- Environment variables (cross-platform testing)

### System Dependencies

- **Deno** runtime (latest stable)
- **File system** write access to `/tmp` or equivalent
- **Network** access for localhost testing
- **Process** control for daemon lifecycle testing

## 🔍 Writing New Tests

### Test Naming Convention

```typescript
describe('🔧 Component Name', () => {
  it('✅ should do expected behavior', () => {
    // Test implementation
  })

  it('❌ should handle error cases', () => {
    // Error handling test
  })
})
```

### Test Structure

1. **Setup** - Create test data/environment
2. **Execute** - Run the operation being tested
3. **Assert** - Verify expected outcomes
4. **Cleanup** - Remove test artifacts

### Common Patterns

```typescript
// Effect testing
const result = await Effect.runPromise(myEffect)
assert(result.success, 'Operation should succeed')

// Schema testing
const parseResult = MySchema.safeParse(testData)
assert(parseResult.success, 'Schema should validate')

// File system testing
const tempDir = await Deno.makeTempDir()
try {
  // Test operations
} finally {
  await Deno.remove(tempDir, { recursive: true })
}
```

## 📊 Coverage Goals

- **Integration Tests**: 100% of critical workflows
- **Unit Tests**: 90%+ of public API surface
- **E2E Tests**: 100% of CLI commands and daemon features
- **Performance Tests**: All performance-critical operations

## 🚀 CI Integration

Tests are designed to run in CI environments:

- No interactive prompts
- Deterministic outcomes
- Reasonable execution time (< 5 minutes total)
- Clear pass/fail indicators
- Detailed error reporting

## 🐛 Debugging Failed Tests

### Common Issues

1. **Permission errors**: Ensure `--allow-all` flag
2. **Timeout issues**: Check if daemon processes are hanging
3. **File system errors**: Verify temp directory permissions
4. **Network issues**: Check if ports are available

### Debug Commands

```bash
# Run single test with verbose output
deno test tests/integration.test.ts --allow-all -- --verbose

# Run with debugging
deno test --inspect-brk tests/unit/core.test.ts --allow-all

# Check test coverage
deno test --allow-all --coverage=coverage
deno coverage coverage --lcov > coverage.lcov
```

## 🎯 Quality Gates

**Before committing code**:

- ✅ All integration tests pass
- ✅ New functionality has tests
- ✅ No performance regressions

**Before releasing**:

- ✅ Full test suite passes
- ✅ Performance benchmarks within limits
- ✅ E2E tests validate user workflows
- ✅ Cross-platform compatibility verified

---

_Tests are the safety net that lets us move fast without breaking things! 🛡️_
