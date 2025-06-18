# User Tests - End-to-End Workflow Validation

## 🎯 Purpose

User tests simulate **complete real-world workflows** from a developer's perspective. These tests validate that .vibe works seamlessly across different project types, platforms, and development scenarios.

**Key Principles:**

- **User-facing behavior**: Test what users actually experience, not implementation details
- **Real project structures**: Use authentic package.json, deno.json, and project files
- **Cross-platform validation**: Ensure identical behavior on Windows, macOS, and Linux
- **Complete workflows**: Test full user journeys from start to finish

## 📁 Test Categories (Aligned with Roadmap)

### ✅ Implemented Features

#### `project-setup.test.ts`

**Roadmap Item**: "Project Setup - `vibe init` creates .vibe structure, detects dependencies"

**What to test:**

- `vibe init` in empty directories
- `vibe init` in existing Node.js/Deno projects
- .vibe directory structure creation and validation
- Configuration file generation with correct metadata
- Force flag behavior for existing .vibe directories
- Cross-platform path handling and structure consistency

**Real scenarios:**

- New developer cloning a repo and running `vibe init`
- Converting existing projects to use .vibe
- Team member working on Windows while others use macOS/Linux

#### `dependency-discovery.test.ts`

**Roadmap Item**: "Dependency Discovery - Automatic detection from package.json/deno.json"

**What to test:**

- package.json dependency detection (regular, dev, peer)
- deno.json import detection (JSR, npm, std libraries)
- Mixed dependency scenarios (package.json + deno.json)
- Dependency metadata accuracy (name, version, type)
- tools/detected.json structure and content validation

**Real scenarios:**

- Full-stack project with both Node.js backend and Deno frontend
- Migration from npm to Deno dependencies
- Complex dependency trees with scoped packages

### ⏳ Work In Progress

#### `dependency-docs.test.ts`

**Roadmap Item**: "Dependency Docs - `vibe code <dependency>` (WIP)"

**What to test when implemented:**

- `vibe code <dep-name>` returns fresh documentation
- HTTP fetching and local storage of llms.txt files
- Documentation format options (JSON, markdown)
- Caching behavior and update mechanisms
- Error handling for missing dependencies

### ❌ Future Features

#### `ai-context-files.test.ts`

**Roadmap Item**: "AI Context Files - Generate Cursor/Windsurf/Claude files"

**What to test when implemented:**

- IDE-specific file generation (.cursor/rules/*.mdc, etc.)
- Template rendering with project-specific data
- File content accuracy and format compliance
- Gitignore management for IDE files

#### `auto-sync-rules.test.ts`

**Roadmap Item**: "Auto-Sync Rules - Edit .vibe/rules/*.md → auto-regenerate all IDE files"

**What to test when implemented:**

- File watcher detecting .vibe/rules/ changes
- Automatic regeneration of all IDE files
- Rule conflict resolution and priority handling
- Performance with large rule sets

#### `universal-ai-access.test.ts`

**Roadmap Item**: "Universal AI Access - Same project tools work in Cursor, ChatGPT, Claude Desktop"

**What to test when implemented:**

- MCP server startup and tool registration
- Tool discovery across different AI environments
- Cross-platform MCP compatibility
- Tool persistence and availability

## 🛠️ Test Utilities

### Shared Utilities (`user-test-utils.ts`)

Common functions used across all user tests:

```typescript
// Project simulation
createProjectDir(): Promise<string>
cleanupProjectDir(path: string): Promise<void>
createRealisticProject(type: 'node' | 'deno' | 'mixed'): Promise<string>

// Command execution  
runVibeCommand(projectPath: string, args: string[]): Promise<CommandResult>
waitForFileChange(path: string, timeout?: number): Promise<void>

// Validation helpers
validateVibeStructure(vibePath: string): Promise<void>
validateCrossPlatformBehavior(testFn: Function): Promise<void>
assertConfigQuality(config: any): void
```

## 📋 Writing Guidelines

### 1. **Test Real User Journeys**

```typescript
it('should support typical full-stack developer workflow', async () => {
  // 1. Developer clones repo
  const projectPath = await createRealisticProject('mixed')

  // 2. Runs vibe init
  const result = await runVibeCommand(projectPath, ['init'])

  // 3. Validates complete setup
  await validateVibeStructure(resolve(projectPath, '.vibe'))

  // 4. Tests follow-up commands work correctly
  // ... continue realistic workflow
})
```

### 2. **Use Realistic Project Data**

- **Real package.json**: Include actual dependencies like express, react, zod
- **Real deno.json**: Use authentic JSR imports and task definitions
- **Real file structures**: Create src/, tests/, docs/ directories like actual projects

### 3. **Test Cross-Platform Scenarios**

```typescript
it('should work identically on Windows and Unix systems', async () => {
  await validateCrossPlatformBehavior(async () => {
    // Test logic that should work on all platforms
    const result = await runVibeCommand(projectPath, ['init'])
    return validateVibeStructure(result.vibePath)
  })
})
```

### 4. **Validate Complete Output Quality**

- **File structure**: Verify all expected directories and files exist
- **Content accuracy**: Check JSON schema compliance and data correctness
- **User messages**: Validate CLI output is helpful and informative
- **Error handling**: Test failure scenarios with clear error messages

### 5. **Test Documentation Coverage**

Every user test file MUST include header comments with `@tests` annotations:

```typescript
/**
 * Project Setup User Tests
 *
 * Validates complete vibe init workflows across project types and platforms
 *
 * @tests commands/init.ts (Complete user workflow validation)
 * @tests ure/lib/fs.ts (File system operations in real scenarios)
 * @tests ure/schemas/project-config.ts (Config validation with real data)
 */
```

## 🔍 Test Categories vs Unit/Integration Tests

| Test Type       | Focus                 | Scope                  | Examples                                         |
| --------------- | --------------------- | ---------------------- | ------------------------------------------------ |
| **Unit**        | Individual functions  | Single function/method | `parsePackageJson()`, `createConfig()`           |
| **Integration** | Component interaction | Service + dependency   | `ConfigService` + `FileSystem`                   |
| **User**        | Complete workflows    | End-to-end experience  | `vibe init` → validate structure → test commands |

**User tests are the highest level** - they validate that the complete user experience works as intended, while unit and integration tests validate the underlying implementation details.

## 🚀 Getting Started

1. **For new roadmap features**: Create a new test file matching the roadmap item name
2. **For existing features**: Add tests to the appropriate category file
3. **Always start with realistic scenarios**: Think "what would a real developer do?"
4. **Test across platforms**: Ensure Windows, macOS, and Linux compatibility
5. **Validate complete quality**: Structure, content, user experience, and error handling

**Remember**: User tests are your final validation that .vibe actually delivers on its promises to real developers in real scenarios! 🎯
