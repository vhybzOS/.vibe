# AGENTS.md - Development Guidelines for .vibe Project

## 🎯 **CORE MISSION**

Build a local-first, autonomous AI development environment using functional programming principles, Effect-TS composition, and test-driven development. Every line of code should be a joy to read, maintain, and extend.

## 📋 **DEVELOPMENT FLOW THAT WORKS**

### **Session Startup Protocol**

1. **Read AGENTS.md** (this file) completely
2. **Read PRD.md** to understand current project status and priorities
3. **Fetch [coding guidelines](PROTOCOLS.md#coding-protocols)** before writing any code
4. **Follow [planning mode protocol](PROTOCOLS.md#planning-mode-protocol)** - Don't code yet
5. **Ask: "What user flow should we implement first?"**
6. **Use [requirements gathering protocol](PROTOCOLS.md#requirements-gathering-protocol)** to get complete scope
7. **Present implementation plan using [requirements template](PROTOCOLS.md#requirements-gathering-protocol)**
8. **Get approval, then exit planning mode**

### **Implementation Workflow**

1. **Follow [8-step implementation cycle](PROTOCOLS.md#8-step-implementation-cycle)** religiously
2. **Use [TDD protocol](PROTOCOLS.md#test-driven-development)** for all new code
3. **Apply [Effect-TS patterns](PROTOCOLS.md#effect-ts-patterns)** consistently
4. **Check [quality gates](PROTOCOLS.md#quality-gates)** at each step
5. **For complex work, use [thread management protocol](PROTOCOLS.md#thread-management-protocol)**

### **Critical Implementation Principles**

- **Runtime Safety ≠ TypeScript Safety** - Always verify changes work at runtime
- **Test First** - Write tests before implementation using [TDD protocol](PROTOCOLS.md#test-driven-development)
- **Quality Gates** - Never skip [quality gate checklist](PROTOCOLS.md#quality-gates)
- **Effect-TS Excellence** - Use [Effect-TS patterns](PROTOCOLS.md#effect-ts-patterns) for all business logic

## 🏗️ **ARCHITECTURAL PRINCIPLES**

### **Effect-TS Excellence**

- **All async operations use Effect-TS** (no raw async/await in business logic)
- **Consistent `pipe()` composition** for readable, linear flow
- **Tagged union errors** with specific context (`FileSystemError`, `ParseError`, etc.)
- **Composable error handling** using `Effect.catchTag` and `Effect.catchAll`

_See [Effect-TS patterns](PROTOCOLS.md#effect-ts-patterns) for detailed implementation guidance._

### **Functional Programming Purity**

- **No custom classes** for business logic - use pure functions on plain data
- **Immutable transformations** - never mutate input data
- **Single responsibility** - each function has one clear purpose
- **Higher-order abstractions** - extract common patterns into reusable functions

### **Code Organization Philosophy**

- **Single source of truth** - eliminate all duplication through abstraction
- **Service-oriented architecture** - stateless services with clear dependencies
- **Thin entry points** - CLI/API are just routing layers that delegate to services

_See [code style standards](PROTOCOLS.md#code-style-standards) for detailed guidelines._

## 🧪 **TEST-DRIVEN DEVELOPMENT STRATEGY**

### **Test-Implementation Linking**

Every implementation file MUST include test file references in header comments.

_Use [file header template](PROTOCOLS.md#file-header-templates) and follow [TDD protocol](PROTOCOLS.md#test-driven-development) for complete guidance._

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

### **Test Refactoring from First Principles**

When encountering multiple test failures, follow systematic approach:

1. **Categorize Failures by Root Cause**
2. **Distinguish Implementation Issues vs Test Issues**
3. **Update Tests to Match Improved Behavior**
4. **Create Robust Test Helpers**
5. **Test First Principles Analysis**

**Critical Rule**: When core functionality works correctly in manual testing, failing unit tests usually indicate outdated test expectations, not broken implementation.

_See [TDD protocol](PROTOCOLS.md#test-driven-development) for complete test management guidance._

## 📚 **LEGACY CODE REFERENCE GUIDELINES**

### **When and How to Use Legacy Code**

- **Only if it provides clear benefit** - don't copy for the sake of copying
- **Legacy patterns over legacy implementation** - understand the approach, write fresh code
- **Modular extraction** - take small, focused pieces, not large files

### **Legacy Architecture Reference**

- **`legacy/v0.2/`**: Architecture patterns (REFERENCE ONLY - does not compile)
- **`legacy/` (main)**: Battle-tested, working business logic and schemas

### **Critical Technical Requirements**

- **ONLY Zod v4**: Use `zod/v4` import and `z.output<>` types
- **Effect-TS**: All async operations use [Effect-TS patterns](PROTOCOLS.md#effect-ts-patterns)
- **Tagged Union Errors**: Use proven [error handling patterns](PROTOCOLS.md#error-handling-patterns)

## 🔧 **OS FILE MANAGEMENT**

### **When to Update Each OS File**

**PRD.md** - Update when:

- Starting new features or major changes
- Implementation status changes
- Roadmap priorities shift
- Use [thread template](PROTOCOLS.md#thread-management-protocol) for complex work tracking

**TESTS.md** - Update when:

- Entering testing phases
- Test strategy evolves
- Major issues discovered
- Reference [TDD protocol](PROTOCOLS.md#test-driven-development) and [quality gates](PROTOCOLS.md#quality-gates)

**PROTOCOLS.md** - Update when:

- New development patterns established
- Library usage patterns locked in
- Architectural decisions made
- Workflow improvements discovered

**AGENTS.md** (this file) - Update when:

- Development protocol evolution
- New workflow patterns discovered
- OS file relationship changes

### **Threading for Complex Work**

For complex implementations or architectural changes:

1. **Open thread** using [thread template](PROTOCOLS.md#thread-management-protocol)
2. **Track progress** with [status emojis](PROTOCOLS.md#thread-management-protocol)
3. **Follow thread indentation** pattern from [thread management protocol](PROTOCOLS.md#thread-management-protocol)
4. **Close thread** when exit criteria met

### **Between Features Protocol**

- **Always return to planning mode** after completing a feature
- **Use [planning mode protocol](PROTOCOLS.md#planning-mode-protocol)** for next steps
- **Ask for next user flow** rather than assuming priorities
- **Present options** based on current foundation
- **Get explicit direction** before proceeding

### **Commit When Ready**

When instructed to commit:

1. **Follow [commit protocol](PROTOCOLS.md#commit-protocol)** exactly
2. **Use [commit message template](PROTOCOLS.md#commit-protocol)** for consistency
3. **Run [quality gate checklist](PROTOCOLS.md#quality-gates)** first

### **Session Handoff**

At end of session:

1. **Follow [session handoff protocol](PROTOCOLS.md#session-handoff-protocol)**
2. **Use [session handoff template](PROTOCOLS.md#session-handoff-protocol)**
3. **Ensure next session has clear starting point**

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

---

**Remember: Consistency over cleverness. Predictability over performance. Quality over quantity.**

_For detailed protocol implementations, see [PROTOCOLS.md](PROTOCOLS.md)_
