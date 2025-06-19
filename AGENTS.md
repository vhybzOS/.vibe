# AGENTS.md - Development Guidelines for .vibe Project

## 🎯 **CORE MISSION**

Build a local-first, autonomous AI development environment using functional programming principles, Effect-TS composition, and test-driven development. Every line of code should be a joy to read, maintain, and extend.

## 📋 **DEVELOPMENT FLOW THAT WORKS**

### **Requirements Gathering Protocol**

**NEVER start coding without clear requirements. Follow this sequence:**

1. **Enter Planning Mode** - Explicitly state you're in planning mode
2. **Ask for User Flow** - "What specific user flow should we implement first?"
3. **Gather Complete Requirements** - Get full scope, acceptance criteria, edge cases
4. **Present Implementation Plan** - Show approach, file structure, test strategy
5. **Get Approval** - Wait for explicit approval before any coding
6. **Exit Planning Mode** - Only then begin implementation

### **User Flow Examples to Ask About**

- "Should we implement the basic CLI foundation (init, status) first?"
- "Which discovery flow: autonomous dependency detection or manual rule sync?"
- "What's the priority: local memory storage or MCP integration?"
- "Do you want daemon startup or CLI-only operations first?"

### **The Proven 8-Step Implementation Cycle**

1. **Write Tests First** - Define expected behavior from requirements
2. **Write Minimal Code** - Make tests pass with simplest implementation
3. **Extend Code Incrementally** - Add functionality piece by piece
4. **Runtime Verification** - Run tests for specific file just edited
5. **Test Evolution** - Update tests if architectural understanding evolved
6. **Re-verify Runtime** - Ensure updated tests pass
7. **Quality Gates** - Pass type check and lint
8. **Loop** - Repeat for next increment

### **Critical Principle: Runtime Safety ≠ TypeScript Safety**

Always verify changes work at runtime. TypeScript can pass while runtime breaks.

## 🏗️ **ARCHITECTURAL PRINCIPLES**

### **Effect-TS Excellence**

- **All async operations use Effect-TS** (no raw async/await in business logic)
- **Consistent `pipe()` composition** for readable, linear flow
- **Tagged union errors** with specific context (`FileSystemError`, `ParseError`, etc.)
- **Composable error handling** using `Effect.catchTag` and `Effect.catchAll`

### **Functional Programming Purity**

- **No custom classes** for business logic - use pure functions on plain data
- **Immutable transformations** - never mutate input data
- **Single responsibility** - each function has one clear purpose
- **Higher-order abstractions** - extract common patterns into reusable functions

### **Code Organization Philosophy**

- **Single source of truth** - eliminate all duplication through abstraction
- **Service-oriented architecture** - stateless services with clear dependencies
- **Thin entry points** - CLI/API are just routing layers that delegate to services

## 🧪 **TEST-DRIVEN DEVELOPMENT STRATEGY**

### **Test-Implementation Linking (CRITICAL)**

Every implementation file MUST include test file references in header comments:

```typescript
/**
 * Init Command Implementation
 *
 * Creates .vibe directory structure and initializes project configuration
 *
 * @tested_by tests/unit/init-command.test.ts (Core functionality, dependency detection, error handling)
 * @tested_by tests/integration/cli-integration.test.ts (CLI integration, schema validation)
 * @tested_by tests/user/real-world-workflow.test.ts (Complete user workflows, both Deno and Node.js)
 */
```

**Benefits:**

- **Instant test discovery** - know exactly which tests cover this code
- **Test gap identification** - easily spot untested functionality
- **Refactoring confidence** - know which tests to run when changing code
- **Code review efficiency** - reviewers can immediately find relevant tests

### **Before Modifying Any File**

1. **Check header comments** - find linked test files from `@tested_by` annotations
2. **Read the entire test** - understand expected behavior
3. **Plan changes** that align with test expectations
4. **Consider test updates** if architectural understanding evolved

### **After Modifying Any File**

1. **Run linked tests** - use `@tested_by` paths to run specific tests
2. **Verify tests pass** - fix immediately if broken
3. **Update test if needed** - reflect new architectural understanding
4. **Update `@tested_by` comments** - if you add/remove/move tests
5. **Re-run tests** - ensure everything passes before continuing

### **Creating New Files Protocol**

1. **Write tests first** - create test file before implementation
2. **Add `@tested_by` header** - link to test file(s) in implementation
3. **Keep bidirectional references** - implementation links to tests, tests reference implementation
4. **Use test categories appropriately**:
   - **Unit tests** (`tests/unit/`) - individual functions, pure logic
   - **Integration tests** (`tests/integration/`) - component interaction
   - **User tests** (`tests/user/`) - complete workflows, CLI behavior

### **Test Organization & Discovery**

```bash
# Quick test discovery for any file
grep -r "@tested_by" . --include="*.ts" | grep filename.ts

# See all test coverage at a glance
grep -r "@tested_by" . --include="*.ts" --color=always

# Run tests for specific implementation
deno task test:unit                    # Fast feedback for development
deno task test:integration            # Component interaction verification  
deno task test:user                   # Complete workflow validation

# Check test coverage with our smart script
deno task coverage
```

### **Quality Gates (Never Skip)**

- **Type Check**: `deno task check` → 0 errors
- **Lint Check**: `deno task lint` → 0 violations
- **Runtime Tests**: All relevant tests passing
- **Test Coverage**: Every file has `@tested_by` annotations

### **Test Refactoring from First Principles**

When encountering multiple test failures after code changes, follow this systematic approach:

**1. Categorize Failures by Root Cause**

- Schema/API mismatches (e.g., old test mocks don't match new schemas)
- Test isolation issues (e.g., directory changes, shared state)
- Implementation evolution (e.g., registry detection logic improved)
- Test assumptions no longer valid (e.g., error message expectations)

**2. Distinguish Between Implementation Issues vs Test Issues**

- **Implementation bug**: Core functionality broken (fix implementation)
- **Test outdated**: Test expectations don't match improved behavior (update test)
- **Test design flaw**: Test creates artificial constraints (refactor test)

**3. Update Tests to Match Improved Behavior**

- When implementation correctly evolves (e.g., better registry detection), update test expectations
- When error handling improves (e.g., walking up directory tree), adjust test scenarios
- Preserve test intent while adapting to better implementation

**4. Create Robust Test Helpers**

- Replace manual resource management with helper functions
- Add graceful error handling for test utilities
- Ensure test isolation doesn't break when directories are deleted

**5. Test First Principles Analysis**

- Ask: "What is this test actually trying to verify?"
- Ask: "Is the current behavior better than what the test expects?"
- Ask: "Should I fix the code or fix the test?"

**Critical Rule**: When core functionality works correctly in manual testing, failing unit tests usually indicate outdated test expectations, not broken implementation.

## 📚 **LEGACY CODE REFERENCE GUIDELINES**

### **When and How to Use Legacy Code**

- **Only if it provides clear benefit** - don't copy for the sake of copying
- **Legacy patterns over legacy implementation** - understand the approach, write fresh code
- **Modular extraction** - take small, focused pieces, not large files

### **Legacy Architecture Reference**

- **`legacy/v0.2/`**: Contains aspirational architecture style (ARCHITECTURE REFERENCE ONLY - does not compile)
  - Clean functional patterns
  - Effect-TS composition excellence
  - Tagged union error handling
  - Service-oriented design
  - **DO NOT copy-paste code from here** - use for architectural patterns only
- **`legacy/` (main)**: Contains battle-tested, working business logic and schemas
  - Proven patterns from 74% error reduction work
  - Zod schema definitions
  - CLI command patterns
  - File system utilities
  - **USE THIS for copy-paste** - working, tested code

### **Wikipedia-Style Reference Usage**

1. **Identify the pattern/function needed** for current feature
2. **Search legacy folders** for similar implementations
3. **Extract the approach**, not the exact code
4. **Adapt to current modular, small-file architecture**
5. **Test thoroughly** - legacy code may have different assumptions

### **Priority Order for Legacy Reference**

1. **`legacy/v0.2/`** - Clean architecture patterns
2. **`legacy/schemas/`** - Data structure definitions
3. **`legacy/lib/`** - Utility function approaches
4. **`legacy/cli/`** - Command patterns and error handling

### **Critical Technical Requirements**

- **ONLY Zod v4**: We have battle-tested v4 code in legacy - always use `zod/v4` import and `z.output<>` types
- **Effect-TS**: All async operations must use Effect-TS composition patterns - see CLAUDE.md for current patterns
- **Tagged Union Errors**: Use the proven error handling patterns from legacy

## 🔧 **IMPLEMENTATION GUIDELINES**

### **Session Startup Protocol**

1. **Read AGENTS.md** (this file) completely
2. **Review any progress tracking files**
3. **Enter Planning Mode** - Don't code yet
4. **Ask: "What user flow should we implement first?"**
5. **Gather requirements completely**
6. **Present implementation plan**
7. **Get approval, then exit planning mode**

### **Mid-Implementation Checkpoint Protocol**

When implementation becomes complex or before auto-compaction, create detailed checkboxes:

1. **Current 8-Step Position** - Track where we are in the proven cycle:
   - ✅ Step 1: **Write Tests First** - Define expected behavior from requirements
   - ✅ Step 2: **Write Minimal Code** - Make tests pass with simplest implementation
   - ✅ Step 3: **Extend Code Incrementally** - Add functionality piece by piece
   - 🚧 Step 4: **Runtime Verification** - Run tests for specific file just edited
   - ⭕ Step 5: **Test Evolution** - Update tests if architectural understanding evolved
   - ⭕ Step 6: **Re-verify Runtime** - Ensure updated tests pass
   - ⭕ Step 7: **Quality Gates** - Pass type check and lint
   - ⭕ Step 8: **Loop** - Repeat for next increment

2. **Implementation Progress Checkpoint** - List completed (✅) and remaining (🚧, ⭕) items
3. **Architecture For Current Implementation Step** - Describe design to future clone without context:
   - Overall system design and data flow
   - Storage architecture and file structures
   - Service architecture and responsibilities
   - Error handling strategy and patterns
   - Effect-TS composition patterns used
4. **Continue implementation** - Fix remaining type issues and complete quality gates

### **Threading Protocol**

**When to Open a Thread:**

- **User Request**: Explicit request to handle a sub-task or architectural concern
- **Architectural Discovery**: Current work reveals larger design issues that need addressing
- **Quality Gate Failures**: Testing/verification uncovers fundamental problems requiring redesign
- **Scope Creep**: Requirements expand beyond current implementation boundaries
- **Dependency Blocking**: Current work blocked by missing infrastructure or design decisions

**Thread Management:**

- **State Tracking**: Use indented bullet points with status emojis:
  - 🚧 **Active** - Currently being worked on
  - ✅ **Complete** - Finished and verified
  - ⭕ **Pending** - Planned but not started
  - ❌ **Blocked** - Cannot proceed due to dependencies
- **Documentation Template**:
  ```
  ### **Thread**: [Name]
  **Trigger**: [What caused this thread to open]
  **Scope**: [What this thread covers]  
  **Exit Criteria**: [How we know it's complete]
  [Indented task list with status tracking]
  ```

**Thread Indentation Example:**

```markdown
**Main Plan:**

- ✅ Step 1: **Requirements** - Complete
- ✅ Step 2: **Planning** - Complete
- 🚧 Step 3: **Implementation** - Fix core architecture
  - [THREAD] ✅ **Step 1: Write Tests** - Define new interfaces
    - Test RuntimeDetector service
    - Test strategy pattern interfaces
    - Demonstrate current broken behavior
  - ⭕ **Step 2: Write Minimal Code** - Create strategy foundation
    - Create PackageExtractorStrategy interface
    - Create basic RuntimeDetector service
    - Update extractAllDependencies for strategy pattern
  - ⭕ **Step 3-8: [Continue thread cycle...]**
- ⭕ Step 4: **Runtime Verification** - Test main feature
- ⭕ Step 5-8: **[Continue main cycle...]**
```

**Key Principles:**

- Thread steps are indented under the main step that opened them
- Main plan continues at original indentation level
- `[THREAD]` marker identifies thread entry point
- Thread follows full 8-step cycle within the parent step

**Thread Lifecycle:**

1. **Open** - Document trigger, scope, exit criteria
2. **Track** - Use same 8-step cycle with indented status tracking
3. **Close** - Verify exit criteria met, update parent plan
4. **Archive** - Document outcomes and return to main plan

**Critical Thread Focus Rule:**

- **ONLY run and fix tests directly related to the thread's implementation and exit criteria**
- **DO NOT get distracted by unrelated test failures from main plan**
- **Thread success = exit criteria met, regardless of other test failures**
- **Other test failures are separate work items for the main plan**

**Integration Rules:**

- **Threads follow same protocols** - Requirements gathering, 8-step cycle, quality gates
- **One active thread at a time** - Finish current thread before opening new ones
- **Parent plan context** - Always maintain connection to main objective
- **Status propagation** - Thread completion updates parent plan status

### **Between Features Protocol**

- **Always return to planning mode** after completing a feature
- **Ask for next user flow** rather than assuming priorities
- **Present options** based on current foundation
- **Get explicit direction** before proceeding

### **Requirements Documentation Template**

For each user flow, document:

- **User Story**: As a [user], I want [goal] so that [benefit]
- **Acceptance Criteria**: Specific testable outcomes
- **Technical Approach**: Architecture, files, patterns to use
- **Testing Strategy**: What tests prove it works
- **Definition of Done**: How to verify completion

### **Adding New Features**

1. **Requirements gathering** - understand the complete scope
2. **Write tests first** - define the expected API and behavior
3. **Create minimal implementation** - make tests pass
4. **Extend incrementally** - add functionality piece by piece
5. **Runtime verify each step** - run tests after each change

### **Refactoring Existing Code**

1. **Understand current behavior** - read existing tests thoroughly
2. **Plan architectural improvements** - identify patterns to extract
3. **Refactor incrementally** - small changes, frequent verification
4. **Update tests if needed** - reflect improved architecture
5. **Verify quality gates** - type check, lint, tests all pass

### **Error Handling Pattern**

```typescript
// ✅ The .vibe Standard
const processData = (input: InputType): Effect<OutputType, DomainError, never> =>
  pipe(
    validateInput(input),
    Effect.flatMap(transformData),
    Effect.flatMap(persistResults),
    Effect.catchTag('ValidationError', handleValidationError),
    Effect.catchTag('PersistenceError', handlePersistenceError),
  )
```

### **CLI Command Pattern**

```typescript
// ✅ Higher-order function wrapper
export const commandName = withVibeDirectory((vibePath, options) =>
  pipe(
    performOperation(vibePath, options),
    Effect.flatMap(showResults),
    Effect.catchAll((error) => Effect.fail(createCliError(error, 'Operation failed', 'command-name'))),
  )
)
```

## 📊 **QUALITY STANDARDS**

### **TypeScript Excellence**

- **Research specific types** - avoid `unknown` laziness
- **Use `any` sparingly** - only with `// deno-lint-ignore` when necessary
- **Leverage inference** - minimize type annotations
- **No underscore prefixes** - remove unused variables instead

### **Code Style Consistency**

- **Descriptive naming** - functions and variables self-document their purpose
- **Small, focused functions** - each does one thing well
- **Extract duplication** - common patterns become shared utilities
- **Consistent formatting** - use `deno fmt` religiously

### **Documentation Standards**

- **README-driven development** - document intended behavior first
- **Code comments only for "why"** - the code should explain "what"
- **Update docs with code** - never let documentation drift

## 🚨 **ANTI-PATTERNS TO AVOID**

### **Never Do This**

- Mix `async/await` with Effect-TS in business logic
- Create custom classes for business data (use plain objects + functions)
- Use `unknown` or `any` without specific justification
- Skip runtime testing after TypeScript changes
- Advance to next feature without fixing current quality gates
- Create duplicate implementations of the same concept

### **Warning Signs**

- TypeScript passes but runtime tests fail
- Same logic implemented in multiple places
- Complex nested conditionals (extract to pure functions)
- Functions that do multiple unrelated things
- Unclear error messages or error types

## 🎯 **SUCCESS METRICS**

### **Session Goals**

- **Zero TypeScript compilation errors** - `deno task check`
- **Zero lint violations** - `deno task lint`
- **All tests passing** - `deno task test`
- **Features working at runtime** - manual verification
- **Code quality improved** - less duplication, clearer patterns

### **Long-term Goals**

- **Architectural consistency** - single patterns for each concern
- **Development velocity** - new features become mechanical to add
- **Maintainability** - future developers can understand and extend easily
- **Reliability** - runtime behavior matches intended design

## 💡 **SESSION HANDOFF PROTOCOL**

### **End of Session Checklist**

1. **Update progress tracking** - record completed tasks and current status
2. **Document discoveries** - note architectural insights or pattern improvements
3. **Identify next priority** - set clear starting point for next session
4. **Commit working state** - ensure all changes are saved and documented
5. **Run final quality gates** - leave codebase in clean state

### **Next Session Startup**

1. **Read AGENTS.md** - refresh on coding standards and patterns
2. **Review progress tracking** - understand current state and priorities
3. **Run quality checks** - understand current error state
4. **Enter planning mode** - ask for user flow requirements
5. **Get explicit approval** - never assume what to build next

---

**Remember: Consistency over cleverness. Predictability over performance. Quality over quantity.**
