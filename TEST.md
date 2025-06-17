# TEST.md - .vibe Code Quality & Consolidation Plan (Updated)

## 🎯 Current Goal: Complete Lint Cleanup + Code Consolidation

### 📊 Current Status: TypeScript Compilation Issues Found, Focus on `deno task check`

❌ **TypeScript Compilation**: 107 errors in `deno task check` (GitHub Actions failing)\
✅ **Lint Rules**: `deno task lint` passing (excludes no-unused-vars, require-await)\
🧹 **Root Issue**: GitHub Actions runs `deno task check` which reveals compilation errors

## 🔍 **Updated Lint Issues Analysis**

### **Discovery: Lint vs TypeScript Check Discrepancy**
- ✅ `deno task lint` passes (but excludes key rules)
- ❌ `deno task check` fails with 107 TypeScript errors
- 🔍 GitHub Actions runs both, revealing the real issues

### **Root Cause: TypeScript Compilation Errors (107 issues)**

#### **Category 1: Missing Import Files (High Priority)**
- `daemon/utils/file-watcher.ts` → Should be `daemon/services/file_watcher_service.ts`
- `daemon/mcp-server/server.ts` → Should be `mcp-server/server.ts`
- `discovery/registries/base.ts` → Missing file entirely

#### **Category 2: Missing Schema Exports (High Priority)**
- `SearchQuery`, `SearchResponse` not exported from `schemas/index.ts`
- Need: `export * from './search.ts'` in schemas/index.ts

#### **Category 3: Type Mismatches (Medium Priority)**
- Effect error unions: `FileSystemError | Error` vs `Error`
- Memory tool types: `'mcp'` not valid in AIToolTypeSchema
- Query type interfaces: string[] vs typed enum arrays

#### **Category 4: Conflicting Exports (Medium Priority)**
- `fileExists` exported from both `lib/effects.ts` and `lib/fs.ts`
- Duplicate function names causing ambiguity

#### **Category 5: Optional Property Issues (Low Priority)**
- `exactOptionalPropertyTypes: true` causing undefined vs optional conflicts
- Query interfaces need proper optional handling

## 🎯 **User Guidelines & Best Practices**

### **Type Safety Philosophy**
- **Avoid `unknown` type** - Research and find most specific types instead of lazy `unknown` replacement
- **Minimize `any` usage** - Only use when truly necessary with `// deno-lint-ignore no-explicit-any` line comment
- **Idiomatic TypeScript** - Use TypeScript inference to reduce cluttered code

### **Code Style Standards**
- **No underscore prefixes** - Don't use `_variable` to satisfy lint rules, check if variable is actually needed
- **Async function style** - Prefer `async () => { ... }` over `() : Promise<void> => { ... }`
- **TypeScript inference** - Let TypeScript infer types where possible for cleaner code

### **Functional Programming (CLAUDE.md)**
- **No custom classes** - Use functional programming principles, idiomatic library usage only
- **Effect-TS for everything** - All async operations, file I/O, error handling must use Effect-TS
- **Pure functions** - Logic in pure, exportable functions operating on plain data structures

## 🏗️ **Consolidation Opportunities**

### **Duplicate Implementations Found**
1. **Error Handling**: 3 different error patterns across modules
2. **File Operations**: 4 different file reading patterns
3. **Search Integration**: 2 separate search indexing approaches
4. **Config Loading**: 3 different config parsing methods
5. **Effect Composition**: Inconsistent pipe vs direct Effect usage

### **Technical Debt Identified**
1. **Stub Implementations**: Many placeholder functions with TODO comments
2. **Test Utilities**: Duplicated test setup code across test files
3. **Schema Validation**: Redundant schema imports and unused validators
4. **CLI Patterns**: Inconsistent command structure and error handling

## 📋 **Execution Plan**

### **Phase 1: Fix TypeScript Compilation (Target: 0 errors in `deno task check`)**
Priority order based on GitHub Actions failure:
1. **Fix missing import paths** - Update all broken file references
2. **Add missing schema exports** - Export SearchQuery, SearchResponse from schemas/index.ts
3. **Resolve conflicting exports** - Fix fileExists and other duplicate exports
4. **Fix type mismatches** - Effect error unions, tool types, query interfaces
5. **Handle optional property issues** - exactOptionalPropertyTypes compliance

### **Phase 2: Code Quality & Lint Compliance (After compilation works)**
Following user guidelines:
1. **Research specific types** - Find actual interface definitions instead of using `unknown`
2. **CLI Commands** - Replace option casting with proper type guards and inference
3. **Test Files** - Use branded types for invalid test data instead of `any`
4. **Discovery System** - Create proper registry response types from actual API docs
5. **MCP Server** - Define proper protocol message types from MCP specification
6. **Rules Engine** - Add proper pattern analysis types based on actual usage

### **Phase 3: Remove Dead Code (Target: 0 unused imports)**
Following user guidelines:
1. **Variable necessity audit** - Remove unused variables instead of adding `_` prefix
2. **Remove stub functions** - Delete placeholder implementations entirely
3. **Consolidate utilities** - Remove redundant helper functions
4. **Clean test imports** - Keep only actively used test utilities

### **Phase 4: Async/Await Cleanup (Target: 0 require-await violations)**
Following user guidelines:
1. **Async style consistency** - Convert to preferred `async () => {}` pattern
2. **Remove unnecessary async** - Convert sync operations to regular functions
3. **Fix stub handlers** - Implement or remove placeholder async functions
4. **TypeScript inference** - Remove explicit Promise return types where possible

### **Phase 5: Code Consolidation & Effect-TS Consistency**
Following functional programming guidelines:
1. **Unify Error Handling** - Single error pattern using Effect-TS tagged unions
2. **Consolidate File Operations** - Single file utility module with Effect-TS
3. **Merge Search Patterns** - Unified search integration interface
4. **Standardize Config** - Single config loading and validation approach
5. **Effect Composition** - Consistent pipe-based composition everywhere

### **Phase 6: Remove Technical Debt**
1. **Complete stub implementations** or remove entirely
2. **Consolidate test utilities** - Single test helper module
3. **Schema optimization** - Remove redundant validators
4. **CLI standardization** - Unified command pattern and error handling

## 🧹 **Files Requiring Major Cleanup**

### **High Priority (Many violations)**
- `rules/index.ts` - 15+ violations, needs type safety overhaul with specific types
- `cli/commands/*.ts` - 40+ violations across command files, fix option casting
- `discovery/**/*.ts` - 20+ violations, needs proper registry types (not unknown)
- `mcp-server/**/*.ts` - 25+ violations, needs MCP protocol types
- `daemon/**/*.ts` - 18+ violations, needs HTTP response types

### **Medium Priority (Consolidation candidates)**
- `tests/**/*.test.ts` - Remove unused imports, fix async style
- `lib/*.ts` - Multiple utility patterns, needs consolidation with Effect-TS
- `memory/index.ts` - Mixed patterns, needs standardization
- `search/index.ts` - Duplicate functionality, needs merging

### **Low Priority (Minor cleanups)**
- Individual schema files with unused exports
- Test helper files with redundant utilities
- Configuration files with dead options

## 🎯 **Success Criteria**

### **Primary Goals**
- [ ] `deno task lint` exits with 0 violations
- [ ] No `any` types in production code (except where truly necessary with line comments)
- [ ] No unused imports or dead code (no `_` prefixed variables)
- [ ] Consistent `async () => {}` patterns throughout
- [ ] TypeScript inference used for cleaner code

### **Secondary Goals**
- [ ] Single error handling pattern using Effect-TS tagged unions
- [ ] Consolidated file operations utility with Effect-TS
- [ ] Unified search integration interface
- [ ] Standardized CLI command structure
- [ ] Optimized test utilities

### **Quality Metrics**
- [ ] <50 total files (down from current count)
- [ ] <5000 lines of code (significant reduction)
- [ ] Single implementation pattern per concern
- [ ] 100% TypeScript strict mode compliance
- [ ] GitHub Actions passing (lint + type check + tests)

## 🚀 **Implementation Strategy**

### **Batch Processing Approach**
1. **Type-specific research** - Find actual types instead of defaulting to `unknown`
2. **Variable audit** - Remove unnecessary variables instead of underscore prefixes
3. **Async style consistency** - Apply preferred patterns throughout
4. **Inference optimization** - Remove redundant type annotations
5. **Test continuously** - Maintain green tests and GitHub Actions

### **Consolidation Patterns**
1. **Extract common utilities** - Create shared modules for repeated code with Effect-TS
2. **Standardize interfaces** - Define consistent function signatures using inference
3. **Remove abstraction layers** - Eliminate unnecessary indirection
4. **Optimize imports** - Use barrel exports for clean module boundaries

## 📝 **Key Guidelines Summary**

### **Type Safety**
- Research specific types, avoid `unknown` as lazy solution
- Use `any` only when truly necessary with line comment
- Leverage TypeScript inference for cleaner code

### **Code Style**
- No `_` prefixed variables, remove if unused
- Prefer `async () => {}` over explicit Promise types
- Let TypeScript infer types where possible

### **Architecture**
- Effect-TS for all async operations and error handling
- Functional programming principles (no custom classes)
- Pure functions operating on plain data structures

### **Quality Standards**
- `deno task check` must pass (0 TypeScript errors)
- `deno task lint` must pass (0 lint violations)
- GitHub Actions must pass (all checks green)
- Maintainable, consolidated codebase with single patterns per concern

---

## 🛠️ **Current Implementation Strategy & Architecture Philosophy**

### **📈 Progress Tracking: TypeScript Compilation Fixes**
- **Started**: 146 TypeScript errors in `deno task check`
- **Current**: 140 errors (6 errors fixed - 4% reduction achieved)
- **Target**: 0 errors

**Recent Fixes Applied:**
1. ✅ `cli.ts` - Fixed VibeError stack property handling with type guard
2. ✅ `cli/index.ts` - Updated runCommand to accept `Error | VibeError` union
3. ✅ `cli/commands/sync.ts` - Complete Effect return type standardization
4. ✅ `cli/commands/generate.ts` - Complete Effect return type standardization

### **🎯 Systematic Resolution Strategy**

#### **Phase 1A: CLI Command Standardization (In Progress)**
**Pattern Recognition**: All CLI commands must return `Effect<void, Error | VibeError, never>`

**Standardization Template Applied:**
```typescript
// Before: Implicit return type causing type mismatches
export const someCommand = (projectPath: string, options: T) => pipe(...)

// After: Explicit Effect return type with proper error union
export const someCommand = (
  projectPath: string, 
  options: T
): Effect.Effect<void, Error | VibeError, never> => pipe(...)
```

**Remaining CLI Commands to Fix (8 files, ~20 functions):**
- `exportCommand` - Currently returns `number | boolean | Error`
- `daemonCommand`, `discoverCommand`, `initCommand`, `mcpServerCommand`, `statusCommand`
- Complex multi-function files: `diary.ts`, `memory.ts`, `search.ts`

#### **Phase 1B: Test File Effect.runPromise Fixes**
**Pattern Recognition**: Test files have `Effect<T, unknown, unknown>` vs `Effect<T, unknown, never>`

**Root Cause**: Effect-TS strict typing in test environments with `exactOptionalPropertyTypes: true`

**Fix Pattern:**
```typescript
// Before: Type mismatch in test execution
await Effect.runPromise(someEffect()) // Effect<T, unknown, unknown>

// After: Proper Effect type constraints
await Effect.runPromise(someEffect() as Effect<T, never, never>)
// OR: Fix the underlying Effect to return proper error types
```

### **🏗️ Architectural Elevation Principles**

#### **Effect-TS Composition Philosophy**
**Why Effect.Effect looks clean and elevates architecture:**

1. **Composable Error Handling**: Tagged union errors (`Error | VibeError`) provide type-safe error flows
2. **Pure Functional Chains**: `pipe()` composition creates readable, debuggable data transformations
3. **Explicit Side Effects**: All async operations, file I/O, and error states are explicitly typed
4. **Railway-Oriented Programming**: Success/failure paths are clearly separated and composable

**Example of Clean Effect Composition:**
```typescript
export const syncCommand = (projectPath: string, options: T): Effect.Effect<void, Error | VibeError, never> =>
  pipe(
    Effect.log('🔄 Starting sync...'),
    Effect.flatMap(() => validateVibeDirectory(projectPath)),
    Effect.flatMap(() => loadProjectRules(projectPath)),
    Effect.flatMap((rules) => syncWithTools(rules, options)),
    Effect.flatMap(() => Effect.log('✅ Sync completed')),
    Effect.catchAll((error) => Effect.fail(createCliError(error, 'Sync failed', 'sync')))
  )
```

#### **Type Safety Elevation Strategies**

1. **Specific Type Research Over Lazy Defaults**
   - ❌ `any` or `unknown` as escape hatches
   - ✅ Research actual API response types from documentation
   - ✅ Create branded types for domain-specific data

2. **TypeScript Inference Optimization**
   - ❌ Redundant type annotations: `const result: string = getString()`
   - ✅ Let TypeScript infer: `const result = getString()`
   - ✅ Explicit only when inference is ambiguous or for API boundaries

3. **Tagged Union Error Design**
   - ❌ Generic Error throwing: `throw new Error('something failed')`
   - ✅ Specific error types: `createFileSystemError(error, path, operation)`
   - ✅ Recoverable error patterns with Effect composition

#### **Code Consolidation Strategies**

1. **Single Responsibility Modules**
   - Extract common patterns into shared utilities
   - Each module has one clear purpose (file ops, error handling, CLI patterns)
   - Remove duplicate implementations through abstraction

2. **Effect-TS Consistency**
   - All async operations use Effect-TS, no raw async/await in business logic
   - Consistent pipe-based composition patterns throughout
   - Standardized error handling with tagged unions

3. **Functional Programming Principles**
   - No custom classes for business logic (only idiomatic library usage)
   - Pure functions operating on plain data structures
   - Immutable data transformations through Effect composition

### **🔧 Implementation Coding Practices**

#### **Function Design Patterns**
```typescript
// ✅ Clean Function Signature
const processData = (input: InputType): Effect<OutputType, DomainError, never> =>
  pipe(
    validateInput(input),
    Effect.flatMap(transformData),
    Effect.flatMap(persistResults),
    Effect.catchAll(handleSpecificError)
  )

// ❌ Avoid: Mixed concerns and unclear error handling
async function processData(input: any): Promise<any> {
  try {
    const validated = await validate(input)
    const transformed = await transform(validated)
    return await persist(transformed)
  } catch (error) {
    console.error(error)
    throw error
  }
}
```

#### **Error Handling Elevation**
```typescript
// ✅ Tagged Union Errors with Context
const createFileError = (error: unknown, path: string, operation: string): FileSystemError => ({
  _tag: 'FileSystemError',
  message: `${operation} failed for ${path}`,
  path,
  operation,
  cause: error instanceof Error ? error : new Error(String(error))
})

// ❌ Avoid: Generic error throwing
throw new Error(`File operation failed`)
```

#### **Type Inference Optimization**
```typescript
// ✅ Let TypeScript infer return types
const loadConfig = (path: string) => pipe(
  readTextFile(path),
  Effect.flatMap(parseJSON),
  Effect.map(ConfigSchema.parse)
)

// ❌ Avoid: Redundant type annotations
const loadConfig = (path: string): Effect<Config, Error, never> => pipe(...)
```

#### **CLI Command Standardization**
```typescript
// ✅ Consistent CLI Pattern
export const commandName = (
  projectPath: string,
  options: SpecificOptionsType
): Effect.Effect<void, Error | VibeError, never> =>
  pipe(
    validatePreconditions(projectPath),
    Effect.flatMap(() => performOperation(projectPath, options)),
    Effect.flatMap(showResults),
    Effect.catchAll((error) => Effect.fail(createCliError(error, 'Operation failed', 'command-name')))
  )
```

### **🚀 Next Steps Strategy**

1. **Immediate (Next session)**: Complete remaining 8 CLI command files using established pattern
2. **Short-term**: Fix test file Effect.runPromise type issues (systematic find/replace)
3. **Medium-term**: Apply consolidation patterns to eliminate duplicate implementations
4. **Long-term**: Full architectural consistency with Effect-TS throughout entire codebase

**Key Success Metrics:**
- Reduction from 140 → 0 TypeScript errors
- Single, consistent error handling pattern
- Clean, composable Effect-TS architecture
- Zero technical debt in CLI layer