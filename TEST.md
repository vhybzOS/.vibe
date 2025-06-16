# LINT.md - .vibe Code Quality & Consolidation Plan

## 🎯 Current Goal: Achieve Green `deno task lint` + Codebase Consolidation

### 📊 Current Status: 156 Linting Issues Across 62 Files

✅ **TypeScript Compilation**: 0 errors (149/156 tests passing)  
❌ **Code Quality**: 156 linting violations need fixing  
🧹 **Technical Debt**: Multiple implementation patterns, unused imports, dead code

## 🔍 **Lint Issues Analysis**

### **Critical Issues (Must Fix)**
1. **156 no-explicit-any violations** - Replace `any` with proper types
2. **42 no-unused-vars violations** - Remove unused imports/variables  
3. **18 require-await violations** - Remove unnecessary async keywords
4. **Dead code patterns** - Stub implementations, placeholder functions

### **Issue Categories Breakdown**

#### **Category 1: Type Safety (156 any violations)**
- `cli/commands/*.ts` - Using `any` for option casting
- `tests/**/*.test.ts` - Using `any` for invalid test data
- `rules/index.ts` - Pattern analysis using `any`
- `mcp-server/**/*.ts` - MCP protocol handling with `any`
- `discovery/**/*.ts` - Registry parsing with `any`
- `daemon/**/*.ts` - HTTP response handling with `any`

#### **Category 2: Dead Code (42 unused imports)**
- Schema imports in test files that aren't used
- Utility functions imported but not called
- Type imports for documentation only
- Effect utilities imported but using direct calls

#### **Category 3: Async Hygiene (18 require-await)**
- Stub functions marked async but not implemented
- Functions that should be sync but marked async
- Handler functions with no async operations

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

### **Phase 1: Fix Type Safety (Target: 0 any violations)**
1. **CLI Commands** - Replace option casting with proper type guards
2. **Test Files** - Use branded types for invalid test data instead of `any`
3. **Discovery System** - Create proper registry response types
4. **MCP Server** - Define proper protocol message types
5. **Rules Engine** - Add proper pattern analysis types

### **Phase 2: Remove Dead Code (Target: 0 unused imports)**
1. **Audit unused imports** - Remove all unused schema/type imports
2. **Remove stub functions** - Delete placeholder implementations
3. **Consolidate utilities** - Remove redundant helper functions
4. **Clean test imports** - Keep only actively used test utilities

### **Phase 3: Async/Await Cleanup (Target: 0 require-await violations)**
1. **Remove unnecessary async** - Convert sync operations to regular functions
2. **Fix stub handlers** - Implement or remove placeholder async functions
3. **Consistent patterns** - Use Effect-TS or native async consistently

### **Phase 4: Code Consolidation**
1. **Unify Error Handling** - Single error pattern using Effect-TS
2. **Consolidate File Operations** - Single file utility module
3. **Merge Search Patterns** - Unified search integration interface
4. **Standardize Config** - Single config loading and validation approach
5. **Effect Composition** - Consistent pipe-based composition everywhere

### **Phase 5: Remove Technical Debt**
1. **Complete stub implementations** or remove entirely
2. **Consolidate test utilities** - Single test helper module
3. **Schema optimization** - Remove redundant validators
4. **CLI standardization** - Unified command pattern and error handling

## 🧹 **Files Requiring Major Cleanup**

### **High Priority (Many violations)**
- `rules/index.ts` - 15+ violations, needs type safety overhaul
- `cli/commands/*.ts` - 40+ violations across command files
- `discovery/**/*.ts` - 20+ violations, needs proper registry types
- `mcp-server/**/*.ts` - 25+ violations, needs protocol types
- `daemon/**/*.ts` - 18+ violations, needs HTTP response types

### **Medium Priority (Consolidation candidates)**
- `tests/**/*.test.ts` - Redundant imports, needs cleanup
- `lib/*.ts` - Multiple utility patterns, needs consolidation
- `memory/index.ts` - Mixed patterns, needs standardization
- `search/index.ts` - Duplicate functionality, needs merging

### **Low Priority (Minor cleanups)**
- Individual schema files with unused exports
- Test helper files with redundant utilities
- Configuration files with dead options

## 🎯 **Success Criteria**

### **Primary Goals**
- [ ] `deno task lint` exits with 0 violations
- [ ] No `any` types in production code
- [ ] No unused imports or dead code
- [ ] Consistent async/await patterns

### **Secondary Goals**  
- [ ] Single error handling pattern across codebase
- [ ] Consolidated file operations utility
- [ ] Unified search integration interface
- [ ] Standardized CLI command structure
- [ ] Optimized test utilities

### **Quality Metrics**
- [ ] <50 total files (down from 62)
- [ ] <5000 lines of code (significant reduction)
- [ ] Single implementation pattern per concern
- [ ] 100% TypeScript strict mode compliance

## 🚀 **Implementation Strategy**

### **Batch Processing Approach**
1. **Fix by file type** - All CLI commands, then all tests, etc.
2. **Type-first** - Fix type safety before removing code
3. **Consolidate incrementally** - Merge similar functions as we go
4. **Test continuously** - Maintain green tests throughout

### **Consolidation Patterns**
1. **Extract common utilities** - Create shared modules for repeated code
2. **Standardize interfaces** - Define consistent function signatures
3. **Remove abstraction layers** - Eliminate unnecessary indirection
4. **Optimize imports** - Use barrel exports for clean module boundaries

## 📝 **Notes**

- **Breaking changes acceptable** - Internal refactoring, no external API impact
- **Aggressive consolidation** - Prefer fewer, more focused modules
- **Type safety paramount** - No exceptions for `any` usage
- **Effect-TS consistency** - Use Effect patterns everywhere or nowhere
- **Documentation debt** - Remove TODO comments and placeholder docs