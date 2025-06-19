# .vibe Project Instructions

## 🚨 **CRITICAL: READ AGENTS.md FIRST**

Before any work, you MUST:

1. Read `AGENTS.md` completely
2. Enter planning mode
3. Ask: "What user flow should we implement first?"
4. Follow the requirements gathering protocol
5. Never code without explicit approval of implementation plan

## **Project Context**

This is a local-first, autonomous AI development environment built with Effect-TS and functional programming principles. Quality and architectural consistency are paramount.

**Website**: https://dotvibe.dev\
**Repository**: https://github.com/vhybzOS/.vibe

**Key Technologies**: Deno, Effect-TS, TypeScript, Zod, functional programming patterns

**Development Philosophy**: Test-driven, Effect-TS composition, tagged union errors, service-oriented architecture

## **Critical Technical Requirements - Effect-TS Patterns**

### **Correct Effect-TS Import Pattern (CRITICAL)**

Based on official Effect documentation, use this import pattern:

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

### **Effect Function Usage**

- `Effect.succeed(value)` - Create successful effect
- `Effect.fail(error)` - Create failed effect
- `Effect.sync(() => {})` - Synchronous effect
- `Effect.tryPromise({ try, catch })` - Async effect with error handling
- `Effect.flatMap(effect, fn)` - Chain effects sequentially
- `Effect.map(effect, fn)` - Transform effect value
- `Effect.catchAll(effect, fn)` - Handle all errors
- `pipe(effect, ...)` - Compose effects functionally

### **Async/Await vs Effect-TS Guidelines**

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

## **Planning Mode Protocol**

Always start sessions in planning mode. Ask for specific user flow requirements. Present complete implementation plans before coding. Get explicit approval before any file changes.

## **Commit Protocol**

When instructed to commit:

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

# Effect Documentation for LLMs

## Critical Effect.retry() Behavior

- **Correct syntax**: `Effect.retry(effect, { times: n })` NOT `pipe(effect, Effect.retry({ times: n }))`
- `Effect.retry(effect, { times: n })` = 1 initial attempt + n retries
- Total execution count = n + 1
- For retry to work, effects must use `Effect.fail()` not thrown errors
- Use `Effect.async((resume) => resume(Effect.fail(...)))` for testing retries
- Use `Effect.sleep()` for testing timeouts, not raw setTimeout
- Effect.tryPromise catch handlers should return proper Error types, not primitives

## Library Documentation Access

When user asks about a package or you need to use a package in project dependencies:

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

## **Critical Zod Pattern - Always Export Inferred Types**

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

```typescript
// ✅ Correct - Import and use the inferred type
import { type ProjectManifest } from '../schemas/library-cache.ts'

function processManifest(manifest: ProjectManifest) {
  // TypeScript correctly infers manifest.dependencies as Record<string, string>
  Object.entries(manifest.dependencies).forEach(([name, version]) => {
    // version is properly typed as string, not unknown
    console.log(`${name}@${version}`)
  })
}
```

```typescript
// ❌ Wrong - Manual type definitions lose Zod's type safety
export interface ProjectManifest {
  type: 'package.json' | 'deno.json'
  path: string
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
}
```

**Why This Matters:**

- **Type Safety**: Zod inference ensures runtime validation matches TypeScript types
- **Maintenance**: Single source of truth - change schema, types update automatically
- **Correctness**: Manual types can drift from actual schemas, causing `unknown` type issues
- **Beautiful Code**: `Object.entries(manifest.dependencies).forEach(([name, version])` works correctly with proper inference

**Key Rule**: If you have a Zod schema, ALWAYS export the inferred type and use it everywhere.
