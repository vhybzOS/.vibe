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
    catch: (e) => createFileSystemError(e, path, 'Failed to read file') 
  })

// ✅ Correct - Composing with pipe
const processFile = (path: string) => pipe(
  readFile(path),
  Effect.flatMap(parseContent),
  Effect.map(transformData),
  Effect.catchAll(handleError)
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

## **Planning Mode Protocol**
Always start sessions in planning mode. Ask for specific user flow requirements. Present complete implementation plans before coding. Get explicit approval before any file changes.