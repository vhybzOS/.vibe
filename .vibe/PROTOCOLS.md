# .vibe Development Protocols

Reference manual for all development workflows and coding standards. This file is the single source of truth for protocols, referenced by other OS files.

## Workflow Protocols

### Planning Mode Protocol

**NEVER start coding without clear requirements. Follow this sequence:**

1. **Enter Planning Mode** - Explicitly state you're in planning mode
2. **Ask for User Flow** - "What specific user flow should we implement first?"
3. **Gather Complete Requirements** - Get full scope, acceptance criteria, edge cases
4. **Present Implementation Plan** - Show approach, file structure, test strategy
5. **Get Approval** - Wait for explicit approval before any coding
6. **Exit Planning Mode** - Only then begin implementation

**User Flow Examples to Ask About:**

- "Should we implement the basic CLI foundation (init, status) first?"
- "Which discovery flow: autonomous dependency detection or manual rule sync?"
- "What's the priority: local memory storage or MCP integration?"
- "Do you want daemon startup or CLI-only operations first?"

### Flush Protocol

**Purpose**: Archive completed work from PRD.md to appropriate locations after 8-step cycle completion.

**Trigger**: Agent determines feature is COMPLETE and PRODUCTION READY based on all quality gates passing and user acceptance.

**Process**:

1. **Extract Completed Work from PRD.md**
   - Identify completed thread/feature section
   - Capture implementation details, architecture decisions, file changes
   - Note user-facing benefits and technical achievements

2. **Update FEATURES.md** (Architecture Reference)
   ```markdown
   ## [YYYY-MM-DD] Feature Name

   **Overview**: Brief architectural description of what was built

   **Files Created/Modified**:

   - `path/to/file.ts:line-range` - What this file does in the system
   - `path/to/config.json:lines` - Configuration changes made

   **Architecture Decisions**:

   - Key patterns used (Effect-TS, functional composition, etc.)
   - Why specific approaches were chosen
   - Trade-offs made and benefits gained

   **Entry Points**:

   - CLI commands added/modified
   - APIs exposed
   - User workflows enabled

   **Success**: Concrete evidence of completion (test results, production usage)
   ```

3. **Update CHANGELOG.md** (User-Facing Changes)
   - Only if feature provides user-facing value
   - Skip if purely internal/technical improvements
   ```markdown
   ### ✨ New Features

   - **Feature Name**: User benefit description
     - `command example` - What this enables
     - Specific capabilities unlocked
   ```

4. **Clean PRD.md**
   - Remove completed sections entirely
   - Preserve project vision and planned features
   - Ensure total length stays under 150 lines
   - Move any follow-up work to "Planned Features" section

5. **Update TESTS.md** (if needed)
   - Move test strategy from "Active" to "Past" section
   - Update current testing focus if changed

**Exit Criteria**:

- All completed work archived appropriately
- PRD.md under 150 lines and contains only active/planned work
- FEATURES.md updated with technical reference
- CHANGELOG.md updated with user value (if applicable)

**Template for New Active Work in PRD.md**:

```markdown
## Active Task and Thread(s)

### [Feature Name] - [Status]

**User Story**: As a [user], I want [goal] so that [benefit]

**Acceptance Criteria**:

- [ ] Specific testable outcome 1
- [ ] Specific testable outcome 2

**Implementation Thread**:

- 🚧 Step 1: Write Tests First
- ⭕ Step 2: Write Minimal Code
- ⭕ Steps 3-8: [Continue 8-step cycle]

**Exit Criteria**: [How we know it's complete]
```

### PRD Management Protocol

**When user defines new work not previously discussed:**

1. **Create Active Task Section** in PRD.md using template above
2. **Move existing planned work** to "Planned Features" section if needed
3. **Keep PRD.md focused** - only one major active task at a time
4. **Use threading** for complex work requiring multiple 8-step cycles

**Template for Moving to Planned Features**:

```markdown
## Planned Features

### Phase X: [Feature Category]

- **[Feature Name]**: Brief description
  - Key capabilities to implement
  - User benefits expected
  - Dependencies or prerequisites
```

### Thread Management Protocol

**When to Open a Thread:**

- **User Request**: Explicit request to handle a sub-task or architectural concern
- **Architectural Discovery**: Current work reveals larger design issues that need addressing
- **Quality Gate Failures**: Testing/verification uncovers fundamental problems requiring redesign
- **Scope Creep**: Requirements expand beyond current implementation boundaries
- **Dependency Blocking**: Current work blocked by missing infrastructure or design decisions

**Thread Template:**

```markdown
### **Thread**: [Name]

**Trigger**: [What caused this thread to open]
**Scope**: [What this thread covers]
**Exit Criteria**: [How we know it's complete]
[Indented task list with status tracking]
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
    - Test RuntimeDetector service
    - Test strategy pattern interfaces
    - Demonstrate current broken behavior
  - ⭕ **Step 2: Write Minimal Code** - Create strategy foundation
    - Create PackageExtractorStrategy interface
    - Create basic RuntimeDetector service
    - Update extractAllDependencies for strategy pattern
  - ⭕ **Step 3-8: [Continue thread cycle...]**
- ⭕ Step 4: **Runtime Verification** - Test main feature
```

**Critical Thread Focus Rule:**

- **ONLY run and fix tests directly related to the thread's implementation and exit criteria**
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
8. **Loop** - Repeat for next increment OR invoke Flush Protocol if complete

### Requirements Gathering Protocol

**Documentation Template:**
For each user flow, document:

- **User Story**: As a [user], I want [goal] so that [benefit]
- **Acceptance Criteria**: Specific testable outcomes
- **Technical Approach**: Architecture, files, patterns to use
- **Testing Strategy**: What tests prove it works
- **Definition of Done**: How to verify completion

### Commit Protocol

**When instructed to commit:**

1. **Always** run `deno task fmt` first
2. **Run** `git status`, analyse if files listed need to be added to `.gitignore` and do if so, then `git add .`
3. **Don't** follow pre-configured flow of checking past commits etc.
4. **Grab** as much useful descriptive info as you can from interactions since last commit
5. **Evaluate version impact** and update deno.json if warranted:
   - **patch** (0.2.1): Bug fixes, docs, minor improvements, small features
   - **minor** (0.3.0): New features, significant enhancements, API additions
   - **major** (1.0.0): Breaking changes, major architectural shifts
   - **Be frugal** - effort should earn version bumps, not every commit!
6. **Make the commit message engaging and fun** - start with conventional commit tag if applicable (e.g. `feat:`, `fix:`, `chore:`), then emojis are good, corporate wording is boring, yet maximum information capture for highly technical (but cool) audience
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
2. **Document discoveries** - note architectural insights or pattern improvements
3. **Identify next priority** - set clear starting point for next session
4. **Commit working state** - ensure all changes are saved and documented
5. **Run final quality gates** - leave codebase in clean state

**Session Handoff Template:**

```markdown
## Session Summary

**Completed**: [List of completed tasks]
**Discoveries**: [Key insights or pattern improvements]
**Next Priority**: [Clear starting point for next session]
**State**: [Current implementation state and quality gate status]
```

### CI Protocol

**Triggered by:** User queries like "check CI", "GitHub errored", "workflow failed", etc.

**Purpose:** Diagnose and report CI/CD workflow failures systematically

**Step 1: Check Recent Workflow Runs**

```bash
# Get last 5 workflow runs with status
curl -s "https://api.github.com/repos/vhybzOS/.vibe/actions/runs?per_page=5" | \
  grep -E '(status|conclusion|head_sha|run_number|created_at)' | head -20
```

**Note:** Workflows typically take about 2 minutes to complete. If status shows "queued" or "in_progress", wait 2 minutes before checking again.

**Step 2: Identify Failed Workflows**

```bash
# Get workflow names and details
curl -s "https://api.github.com/repos/vhybzOS/.vibe/actions/runs?per_page=2" | \
  grep -A5 -B5 '"name"'
```

**Step 3: Analyze Specific Failure**

If a workflow failed (conclusion: "failure"):

1. Note the workflow run ID from the API response
2. Use WebFetch to examine the workflow run page:
   ```
   https://github.com/vhybzOS/.vibe/actions/runs/{RUN_ID}
   ```
3. Look for:
   - Red error indicators
   - Failed job names
   - Exit codes
   - Specific error messages

**Step 4: Common CI Failure Patterns**

- **Exit code 1**: General failure - check specific job logs
- **Formatting issues**: Run `deno task fmt` before committing
- **Type errors**: Run `deno task check` locally
- **Lint violations**: Run `deno task lint` locally
- **Test failures**: Check which test suite failed
- **Cache miss**: Verify cache keys align between jobs

**Step 5: Report Findings**

Provide:

1. Which workflow failed
2. Specific job that failed
3. Root cause (if identifiable)
4. Suggested fix

### Release Protocol

**Triggered by:** Version bump in deno.json (automatic check after push)

**Purpose:** Ensure successful release creation and asset uploads

**Step 1: Invoke CI Protocol**

First, run the CI Protocol to check if the Build and Release workflow succeeded. Remember to wait about 2 minutes for workflows to complete if they show as "in_progress".

**Step 2: Check Version Change Detection**

```bash
# Verify version was detected
curl -s "https://api.github.com/repos/vhybzOS/.vibe/actions/runs?per_page=1" | \
  grep -B5 -A5 "check-version"
```

**Step 3: Verify Release Creation**

```bash
# Check latest release
curl -s "https://api.github.com/repos/vhybzOS/.vibe/releases/latest" | \
  grep -E '(tag_name|name|created_at|assets)' | head -20

# Check recent releases
curl -s "https://api.github.com/repos/vhybzOS/.vibe/releases?per_page=5" | \
  grep -E '(tag_name|created_at)' | head -20
```

**Step 4: Validate Release Assets**

Expected assets for each release:

- `install-dotvibe` (Unix installer)
- `install-dotvibe.exe` (Windows installer)
- `vibe-{VERSION}-linux-x86_64` (Linux binary)
- `vibe-{VERSION}-macos-x86_64` (macOS binary)
- `vibe-{VERSION}-windows-x86_64.exe` (Windows binary)

**Step 5: Common Release Failures**

- **No release created**: Version change not detected
- **Missing assets**: Cache path mismatches between jobs
- **Partial assets**: Build job failed for specific platform
- **Wrong version**: Version in deno.json doesn't match tag

**Release Preparation Checklist:**

1. **Format code**: `deno task fmt`
2. **Update CHANGELOG.md** - Add new version section BEFORE version bump
   - Follow exact format: `## [X.Y.Z] - YYYY-MM-DD`
   - Extract highlights from recent commits and FEATURES.md completed features
   - Use template structure below for consistency
3. **Version Bump** - Update deno.json version according to semver rules
4. **Commit and Push** - Triggers automatic release workflow
5. **Monitor Release** - Use this protocol to verify success

**CHANGELOG.md Entry Template:**

```markdown
## [X.Y.Z] - YYYY-MM-DD

### 🎯 Highlights

- {Main architectural improvement or feature}
- {Key user-facing enhancement}
- {Critical fix or optimization}

### ✨ New Features

- **{Feature Name}**: {Brief user-facing description}
  - {Specific capability or command example}
  - {Additional benefits}

### 🔧 Technical Improvements

- **{Technical Change}**: {User benefit description}
- **{Performance/Architecture}**: {Impact on users}
- **{Infrastructure}**: {Developer experience improvement}

### 📚 Documentation

- **{Protocol/Guide}**: {What was added/improved}
- {Other documentation updates}
```

**CHANGELOG.md Population Process:**

1. **Review Recent Commits**: Check git log since last release for major changes
2. **Extract from FEATURES.md**: Look for completed features and their user benefits
3. **Transform Technical to User Benefits**: Convert implementation details to user value
4. **Follow Format Exactly**: Use `## [X.Y.Z] - YYYY-MM-DD` for version header
5. **Add to CHANGELOG.md**: Insert new section after `## [Unreleased]` section

**Critical Format Requirements:**

- Version format: `## [0.7.21] - 2025-06-20` (brackets required, ISO date)
- Must be added BEFORE version bump in deno.json
- Must be committed WITH the version bump for release workflow to find it

## Coding Protocols

### Effect-TS Patterns

**Correct Import Pattern:**

```typescript
import { Effect, pipe } from 'effect'

// ✅ Correct - Use Effect namespace for functions
const readFile = (path: string): Effect.Effect<string, FileSystemError> =>
  Effect.tryPromise({
    try: () => Deno.readTextFile(path),
    catch: (e) => createFileSystemError(e, path, 'Failed to read file'),
  })

// ✅ Correct - Composing with pipe
const processFile = (path: string) =>
  pipe(
    readFile(path),
    Effect.flatMap(parseContent),
    Effect.map(transformData),
    Effect.catchAll(handleError),
  )
```

**Effect Function Usage:**

- `Effect.succeed(value)` - Create successful effect
- `Effect.fail(error)` - Create failed effect
- `Effect.sync(() => {})` - Synchronous effect
- `Effect.tryPromise({ try, catch })` - Async effect with error handling
- `Effect.flatMap(effect, fn)` - Chain effects sequentially
- `Effect.map(effect, fn)` - Transform effect value
- `Effect.catchAll(effect, fn)` - Handle all errors
- `pipe(effect, ...)` - Compose effects functionally

**Critical Effect.retry() Behavior:**

- **Correct syntax**: `Effect.retry(effect, { times: n })` NOT `pipe(effect, Effect.retry({ times: n }))`
- `Effect.retry(effect, { times: n })` = 1 initial attempt + n retries
- Total execution count = n + 1
- For retry to work, effects must use `Effect.fail()` not thrown errors
- Use `Effect.async((resume) => resume(Effect.fail(...)))` for testing retries
- Use `Effect.sleep()` for testing timeouts, not raw setTimeout
- Effect.tryPromise catch handlers should return proper Error types, not primitives

### Async/Await Guidelines

**Use Effect-TS patterns for business logic:**

- File system operations, network requests, error handling
- Service-to-service communication
- Complex operation chaining and composition

**Use async/await for simple cases:**

- Test mock functions and utilities
- Simple promise-based operations without complex error handling
- Direct API calls without composition needs

**Code Style Preference:**

- Keep beautiful `async/await` syntax when not using Effect-TS
- We disable the `require-await` lint rule - async syntax is clean and readable
- Don't use ugly `Promise.resolve()` wrappers just to satisfy linters

### Error Handling Patterns

**Tagged Union Error Pattern:**

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

### CLI Command Patterns

**Higher-order Function Wrapper:**

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

### Zod Type Inference

**ALWAYS use Zod type inference for schemas instead of manual TypeScript types:**

```typescript
// ✅ Correct - Define schema and export inferred type
export const ProjectManifestSchema = z.object({
  type: z.enum(['package.json', 'deno.json']),
  path: z.string(),
  dependencies: z.record(z.string(), z.string()),
  devDependencies: z.record(z.string(), z.string()).default({}),
})

export type ProjectManifest = z.infer<typeof ProjectManifestSchema>
```

**Why This Matters:**

- **Type Safety**: Zod inference ensures runtime validation matches TypeScript types
- **Maintenance**: Single source of truth - change schema, types update automatically
- **Correctness**: Manual types can drift from actual schemas, causing `unknown` type issues
- **Beautiful Code**: `Object.entries(manifest.dependencies).forEach(([name, version])` works correctly with proper inference

**Key Rule**: If you have a Zod schema, ALWAYS export the inferred type and use it everywhere.

### Library Documentation Access

**When user asks about a package or you need to use a package in project dependencies:**

1. **Always run** `vibe code <package>` first to get current documentation
2. **Use the output** as authoritative documentation for that library
3. **Examples**:
   - User asks "How do I create a Hono route?" → Run `vibe code hono` first
   - You need to use Zod validation → Run `vibe code zod` for current patterns
   - Any package-specific question → Get fresh docs via `vibe code <package>`

**How to run vibe commands in this project:**

- There is a compiled `vibe` executable in the project root
- Run commands like: `./vibe code effect` (from project root directory)
- Alternative: `deno task vibe code effect` (uses the task runner)

This ensures you have up-to-date documentation instead of potentially stale training data.

### Test-Driven Development

**Test-Implementation Linking (CRITICAL):**

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

**Before Modifying Any File:**

1. **Check header comments** - find linked test files from `@tested_by` annotations
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
- **User tests** (`tests/user/`) - complete workflows, CLI behavior

### CLI Testing Protocol

**Local CLI Testing Pattern:**

When testing CLI commands during development, use the local `./vibe` wrapper script instead of the installed `vibe` command:

```bash
# ✅ Correct - Use local wrapper script
./vibe init                    # Test init command
./vibe init node myproject     # Test template scaffolding
./vibe code hono              # Test library documentation
./vibe --help                 # Test help output

# ❌ Incorrect - Don't use deno task vibe
deno task vibe --help         # This runs CLI through task runner

# ❌ Incorrect - Don't use uninstalled command
vibe init                     # This requires global installation
```

**Local Wrapper Script (`./vibe`):**

The `./vibe` script is a bash wrapper that:

- Preserves working directory context
- Uses `deno run --allow-all` with proper permissions
- Allows testing CLI without installing binary

**Testing CLI Commands in Code:**

```typescript
// Use local CLI path for testing
const cliPath = resolve(await findProjectRoot(), 'cli.ts')
const command = new Deno.Command('deno', {
  args: ['run', '--allow-all', cliPath, ...args],
  cwd: projectPath,
  stdout: 'piped',
  stderr: 'piped',
})
```

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
 * @tested_by tests/user/[filename].test.ts ([what user tests cover])
 */
```

### Code Style Standards

**TypeScript Excellence:**

- **Research specific types** - avoid `unknown` laziness
- **Use `any` sparingly** - only with `// deno-lint-ignore` when necessary
- **Leverage inference** - minimize type annotations
- **No underscore prefixes** - remove unused variables instead

**Code Organization:**

- **Descriptive naming** - functions and variables self-document their purpose
- **Small, focused functions** - each does one thing well
- **Extract duplication** - common patterns become shared utilities
- **Consistent formatting** - use `deno fmt` religiously

**Anti-Patterns to Avoid:**

- Mix `async/await` with Effect-TS in business logic
- Create custom classes for business data (use plain objects + functions)
- Use `unknown` or `any` without specific justification
- Skip runtime testing after TypeScript changes
- Advance to next feature without fixing current quality gates
- Create duplicate implementations of the same concept
