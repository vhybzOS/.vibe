# Development Protocols

Reference manual for all development workflows and coding standards. This file
is the single source of truth for protocols, referenced by other OS files.

## Workflow Protocols

### Planning Mode Protocol

**NEVER start coding without clear requirements. Follow this sequence:**

1. **Enter Planning Mode** - Explicitly state you're in planning mode
2. **Ask for User Flow** - "What specific user flow should we implement first?"
3. **Gather Complete Requirements** - Get full scope, acceptance criteria, edge
   cases
4. **Present Implementation Plan** - Show approach, file structure, test
   strategy
5. **Get Approval** - Wait for explicit approval before any coding
6. **Exit Planning Mode** - Only then begin implementation

**User Flow Examples to Ask About:**

- "Should we implement the core API foundation first?"
- "Which feature flow: user authentication or data management?"
- "What's the priority: database setup or business logic?"
- "Do you want CLI commands or web interface first?"

### Thread Management Protocol

**When to Open a Thread:**

- **User Request**: Explicit request to handle a sub-task or architectural
  concern
- **Architectural Discovery**: Current work reveals larger design issues that
  need addressing
- **Quality Gate Failures**: Testing/verification uncovers fundamental problems
  requiring redesign
- **Scope Creep**: Requirements expand beyond current implementation boundaries
- **Dependency Blocking**: Current work blocked by missing infrastructure or
  design decisions

**Thread Template:**

```markdown
### **Thread**: [Name]

**Trigger**: [What caused this thread to open] **Scope**: [What this thread
covers]\
**Exit Criteria**: [How we know it's complete] [Indented task list with status
tracking]
```

**Status Emojis:**

- 🚧 **Active** - Currently being worked on
- ✅ **Complete** - Finished and verified
- ⭕ **Pending** - Planned but not started
- ❌ **Blocked** - Cannot proceed due to dependencies

**Thread Indentation Example:**

```markdown
**Main Plan:**

- ✅ Step 1: **Requirements** - Complete
- ✅ Step 2: **Planning** - Complete
- 🚧 Step 3: **Implementation** - Fix core architecture
  - [THREAD] ✅ **Step 1: Write Tests** - Define new interfaces
    - Test data validation service
    - Test API endpoint patterns
    - Demonstrate current broken behavior
  - ⭕ **Step 2: Write Minimal Code** - Create foundation
    - Create validation interfaces
    - Create basic API service
    - Update main application for new patterns
  - ⭕ **Step 3-8: [Continue thread cycle...]**
- ⭕ Step 4: **Runtime Verification** - Test main feature
```

**Critical Thread Focus Rule:**

- **ONLY run and fix tests directly related to the thread's implementation and
  exit criteria**
- **DO NOT get distracted by unrelated test failures from main plan**
- **Thread success = exit criteria met, regardless of other test failures**

### 8-Step Implementation Cycle

**The Proven Development Flow:**

1. **Write Tests First** - Define expected behavior from requirements
2. **Write Minimal Code** - Make tests pass with simplest implementation
3. **Extend Code Incrementally** - Add functionality piece by piece
4. **Runtime Verification** - Run tests for specific file just edited
5. **Test Evolution** - Update tests if architectural understanding evolved
6. **Re-verify Runtime** - Ensure updated tests pass
7. **Quality Gates** - Pass type check and lint
8. **Loop** - Repeat for next increment

### Requirements Gathering Protocol

**Documentation Template:** For each user flow, document:

- **User Story**: As a [user], I want [goal] so that [benefit]
- **Acceptance Criteria**: Specific testable outcomes
- **Technical Approach**: Architecture, files, patterns to use
- **Testing Strategy**: What tests prove it works
- **Definition of Done**: How to verify completion

### Commit Protocol

**When instructed to commit:**

1. **Always** run `deno task fmt` first
2. **Run** `git status`, analyse if files listed need to be added to
   `.gitignore` and do if so, then `git add .`
3. **Don't** follow pre-configured flow of checking past commits etc.
4. **Grab** as much useful descriptive info as you can from interactions since
   last commit
5. **Evaluate version impact** and update deno.json if warranted:
   - **patch** (0.2.1): Bug fixes, docs, minor improvements, small features
   - **minor** (0.3.0): New features, significant enhancements, API additions
   - **major** (1.0.0): Breaking changes, major architectural shifts
   - **Be frugal** - effort should earn version bumps, not every commit!
6. **Make the commit message engaging and fun** - start with conventional commit
   tag if applicable (e.g. `feat:`, `fix:`, `chore:`), then emojis are good,
   corporate wording is boring, yet maximum information capture for highly
   technical (but cool) audience
7. **Craft** the best summary from recent work
8. **Execute** `git commit -m` in one shot with comprehensive message

**Commit Message Template:**

```bash
git commit -m "$(cat <<'EOF'
[type]: 🎯 [Short engaging description]

[Detailed technical description with specific changes]
[Context about why this change was needed]
[Impact/benefits of the change]

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### Session Handoff Protocol

**End of Session Checklist:**

1. **Update progress tracking** - record completed tasks and current status
2. **Document discoveries** - note architectural insights or pattern
   improvements
3. **Identify next priority** - set clear starting point for next session
4. **Commit working state** - ensure all changes are saved and documented
5. **Run final quality gates** - leave codebase in clean state

**Session Handoff Template:**

```markdown
## Session Summary

**Completed**: [List of completed tasks] **Discoveries**: [Key insights or
pattern improvements] **Next Priority**: [Clear starting point for next session]
**State**: [Current implementation state and quality gate status]
```

## Coding Protocols

_👋 Customize these sections for your tech stack and preferences_

### TypeScript & Deno Standards

**TypeScript Excellence:**

- **Research specific types** - avoid `unknown` laziness
- **Use `any` sparingly** - only with `// deno-lint-ignore` when necessary
- **Leverage inference** - minimize type annotations
- **No underscore prefixes** - remove unused variables instead

**Deno Best Practices:**

- **Use std library** - Prefer `@std/*` packages for common functionality
- **Explicit permissions** - Use minimal `--allow-*` flags in tasks
- **Import maps** - Use deno.json imports for cleaner code
- **Web standards** - Prefer web APIs over Node.js equivalents

### Error Handling Patterns

**Consistent Error Strategy:**

```typescript
// ✅ Structured error handling
type Result<T, E = Error> = { success: true; data: T } | {
  success: false
  error: E
}

const processData = async (input: unknown): Promise<Result<ProcessedData>> => {
  try {
    const validated = validateInput(input)
    const processed = await transformData(validated)
    return { success: true, data: processed }
  } catch (error) {
    return { success: false, error: error as Error }
  }
}
```

### Test-Driven Development

**Test-Implementation Linking (CRITICAL):**

Every implementation file MUST include test file references in header comments:

```typescript
/**
 * [Component Name] Implementation
 *
 * [Brief description of what this component does]
 *
 * @tested_by tests/unit/[filename].test.ts ([what unit tests cover])
 * @tested_by tests/integration/[filename].test.ts ([what integration tests cover])
 * @tested_by tests/e2e/[filename].test.ts ([what e2e tests cover])
 */
```

**Before Modifying Any File:**

1. **Check header comments** - find linked test files from `@tested_by`
   annotations
2. **Read the entire test** - understand expected behavior
3. **Plan changes** that align with test expectations
4. **Consider test updates** if architectural understanding evolved

**After Modifying Any File:**

1. **Run linked tests** - use `@tested_by` paths to run specific tests
2. **Verify tests pass** - fix immediately if broken
3. **Update test if needed** - reflect new architectural understanding
4. **Update `@tested_by` comments** - if you add/remove/move tests
5. **Re-run tests** - ensure everything passes before continuing

**Test Organization:**

- **Unit tests** (`tests/unit/`) - individual functions, pure logic
- **Integration tests** (`tests/integration/`) - component interaction
- **E2E tests** (`tests/e2e/`) - complete workflows, user scenarios

### Quality Gates

**Never Skip These Checks:**

- **Type Check**: `deno task check` → 0 errors
- **Lint Check**: `deno task lint` → 0 violations
- **Runtime Tests**: All relevant tests passing
- **Test Coverage**: Every file has `@tested_by` annotations

**Quality Gate Checklist:**

```markdown
- [ ] `deno task check` passes (0 TypeScript errors)
- [ ] `deno task lint` passes (0 lint violations)
- [ ] All relevant tests passing
- [ ] `@tested_by` annotations updated
- [ ] Manual verification of core functionality
```

### File Header Templates

**Implementation File Header:**

```typescript
/**
 * [Component Name] Implementation
 *
 * [Brief description of what this component does]
 *
 * @tested_by tests/unit/[filename].test.ts ([what unit tests cover])
 * @tested_by tests/integration/[filename].test.ts ([what integration tests cover])
 * @tested_by tests/e2e/[filename].test.ts ([what e2e tests cover])
 */
```

### Code Style Standards

**Code Organization:**

- **Descriptive naming** - functions and variables self-document their purpose
- **Small, focused functions** - each does one thing well
- **Extract duplication** - common patterns become shared utilities
- **Consistent formatting** - use `deno fmt` religiously

**Project Structure:**

- **Clear separation** - separate concerns into logical modules
- **Dependency direction** - higher-level modules depend on lower-level ones
- **Interface boundaries** - define clear contracts between components
- **Configuration** - externalize settings and environment variables

**Anti-Patterns to Avoid:**

- Skip runtime testing after TypeScript changes
- Advance to next feature without fixing current quality gates
- Create duplicate implementations of the same concept
- Mix business logic with presentation logic
- Ignore error handling in favor of "happy path" coding
