# .vibe Legacy Module Rewrite PRD
**Product Requirements Document for Memory, Search, and Diary System Integration**

## Context & Current State

You are continuing work on the `.vibe` project - a **Deno-based TypeScript system** that creates a unified standard for AI coding assistant configuration. This is a **functional programming codebase** using **Effect-TS** patterns.

### What Has Been Accomplished ✅
- **Core infrastructure working**: Daemon, MCP server fully functional
- **All CLI commands clean**: 8/8 commands rewritten with modern Effect-TS patterns and passing tests
- **TypeScript errors reduced**: 125+ → 75 errors (40% improvement)
- **Clean architecture established**: Functional programming with Effect-TS, no custom classes
- **Test coverage**: Comprehensive E2E tests for CLI commands

### Current Problem 🔴
**62% of remaining 75 TypeScript errors are in 3 legacy modules** that use old patterns:
- `memory/index.ts` (28 errors) - Memory management system
- `search/index.ts` (15 errors) - Semantic search functionality  
- `diary/index.ts` (9 errors) - Decision diary system
- `discovery/registries/index.ts` (2 errors) - **DELETE THIS** (old discovery code)

These modules are **critical to the .vibe architecture** but are **not integrated or used** due to legacy code issues.

## Mission: Complete Legacy Module Rewrite

**Strategy**: "Test first, then rewrite from scratch" - **NO STITCHING LEGACY CODE**

### Core Requirements

1. **Functional Programming Only**: No custom classes, use pure functions with Effect-TS
2. **Effect-TS for Everything**: All async operations, file I/O, and error handling
3. **Zod v4 Schemas**: Use `/v4` import syntax and `z.output` types
4. **Test-Driven Development**: Write comprehensive tests first, then implement
5. **Integration Required**: These modules must be actively used by CLI commands and daemon

## Module 1: Memory System Rewrite

### Purpose
Store and retrieve conversational memory with semantic search capabilities for AI assistant context.

### Requirements
1. **Store memory entries** with metadata (type, source, importance, tags)
2. **Semantic search** through stored memories
3. **Memory types**: conversation, decision, pattern, preference, knowledge, context
4. **Integration points**:
   - CLI `vibe memory search <query>` command
   - CLI `vibe memory add <content>` command  
   - CLI `vibe export` includes memory data
   - Daemon API endpoints for memory operations
   - MCP server exposes memory as resources

### Schema Design (Zod v4)
```typescript
export const MemorySchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1),
  type: z.enum(['conversation', 'decision', 'pattern', 'preference', 'knowledge', 'context']),
  source: z.object({
    tool: z.enum(['cursor', 'windsurf', 'claude', 'copilot', 'codeium', 'cody', 'tabnine']).optional(),
    sessionId: z.string().optional(),
    timestamp: z.string().datetime(),
    location: z.string().optional()
  }),
  metadata: z.object({
    id: z.string().uuid(),
    tags: z.array(z.string()),
    importance: z.enum(['low', 'medium', 'high']),
    created: z.string().datetime(),
    lastAccessed: z.string().datetime(),
    accessCount: z.number().default(0),
    context: z.object({
      projectPath: z.string(),
      relatedFiles: z.array(z.string()),
      associatedRules: z.array(z.string())
    })
  }),
  searchable: z.object({
    keywords: z.array(z.string()),
    concepts: z.array(z.string()),
    summary: z.string()
  })
})

export const MemorySearchQuery = z.object({
  query: z.string(),
  tags: z.array(z.string()).optional(),
  type: z.enum(['conversation', 'decision', 'pattern', 'preference', 'knowledge', 'context']).optional(),
  importance: z.enum(['low', 'medium', 'high']).optional(),
  dateRange: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional()
  }).optional(),
  limit: z.number().default(10),
  offset: z.number().default(0),
  threshold: z.number().min(0).max(1).default(0.1)
})
```

### API Design (Effect-TS)
```typescript
// Core functions - all return Effect types
export const storeMemory: (vibePath: string, content: string, metadata: MemoryMetadata) => Effect.Effect<MemoryId, VibeError, never>
export const searchMemory: (vibePath: string, query: MemorySearchQuery) => Effect.Effect<Memory[], VibeError, never>
export const getMemory: (vibePath: string, id: string) => Effect.Effect<Memory | null, VibeError, never>
export const deleteMemory: (vibePath: string, id: string) => Effect.Effect<boolean, VibeError, never>
export const updateMemoryAccess: (vibePath: string, id: string) => Effect.Effect<void, VibeError, never>
```

### File Structure
```
memory/
├── index.ts           # Main exports and orchestration
├── storage.ts         # File system operations (JSON storage)
├── search.ts          # Memory search logic
├── indexing.ts        # Search index management
└── __tests__/
    ├── memory.test.ts         # Unit tests
    ├── integration.test.ts    # Integration tests
    └── performance.test.ts    # Performance benchmarks
```

### Tests Required
1. **Unit tests**: Each function with edge cases, error handling
2. **Integration tests**: Full memory lifecycle, search accuracy
3. **Performance tests**: Large memory sets, search speed
4. **CLI integration tests**: Memory commands work end-to-end

## Module 2: Search System Rewrite

### Purpose
Unified semantic search across all .vibe data (memory, diary, rules, dependencies).

### Requirements
1. **Multi-document search** across memory, diary entries, rules
2. **Semantic similarity** using embeddings (if available) or keyword matching
3. **Filters**: by document type, date range, tags, importance
4. **Performance**: Sub-100ms search on 10k+ documents
5. **Integration points**:
   - Memory system uses search for queries
   - Diary system uses search for entry discovery
   - CLI `vibe search <query>` global search command
   - MCP server search endpoints

### Schema Design (Zod v4)
```typescript
export const SearchDocumentSchema = z.object({
  id: z.string().uuid(),
  doc_type: z.enum(['memory', 'diary', 'rule', 'dependency']),
  timestamp: z.number(), // Unix timestamp for sorting
  content: z.string(),
  tags: z.array(z.string()),
  metadata: z.object({
    project_path: z.string(),
    source: z.string(),
    priority: z.enum(['low', 'medium', 'high']),
    category: z.string(),
    title: z.string().optional()
  })
})

export const SearchQuerySchema = z.object({
  term: z.string().min(1),
  filters: z.object({
    doc_type: z.enum(['memory', 'diary', 'rule', 'dependency']).optional(),
    tags: z.array(z.string()).optional(),
    date_range: z.object({
      start: z.number().optional(),
      end: z.number().optional()
    }).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    category: z.string().optional()
  }).optional(),
  mode: z.enum(['keyword', 'semantic', 'hybrid']).default('hybrid'),
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0)
})

export const SearchResultSchema = z.object({
  document: SearchDocumentSchema,
  score: z.number().min(0).max(1),
  highlights: z.array(z.string()).optional()
})
```

### API Design (Effect-TS)
```typescript
// Core search functions
export const initializeSearch: (projectPath: string) => Effect.Effect<void, VibeError, never>
export const insertDocument: (document: SearchDocument) => Effect.Effect<void, VibeError, never>
export const updateDocument: (id: string, document: SearchDocument) => Effect.Effect<void, VibeError, never>
export const deleteDocument: (id: string) => Effect.Effect<boolean, VibeError, never>
export const searchDocuments: (query: SearchQuery) => Effect.Effect<SearchResponse, VibeError, never>
export const rebuildIndex: (projectPath: string) => Effect.Effect<void, VibeError, never>
```

### File Structure
```
search/
├── index.ts           # Main exports and orchestration
├── engine.ts          # Core search algorithms
├── indexing.ts        # Document indexing
├── embeddings.ts      # Semantic embeddings (optional)
├── storage.ts         # Search index persistence
└── __tests__/
    ├── search.test.ts         # Unit tests
    ├── performance.test.ts    # Search speed benchmarks
    └── integration.test.ts    # Full search integration
```

### Implementation Strategy
1. **Start with keyword search**: TF-IDF scoring, exact matching
2. **Add semantic search**: If embedding libraries available
3. **Hybrid mode**: Combine keyword + semantic scores
4. **Performance optimization**: Inverted index, caching

## Module 3: Diary System Rewrite

### Purpose
Capture and search architectural decisions, development patterns, and project evolution.

### Requirements
1. **Auto-capture decisions** from AI conversations via MCP server
2. **Manual entry creation** via CLI commands
3. **Structured entries** with categories, tags, impact assessment
4. **Time-based browsing** of project evolution
5. **Integration points**:
   - CLI `vibe diary add <title> <content>` command
   - CLI `vibe diary search <query>` command
   - CLI `vibe diary timeline` command
   - MCP server auto-captures decisions
   - Export includes diary data

### Schema Design (Zod v4)
```typescript
export const DiaryEntrySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  content: z.string().min(1),
  category: z.enum(['decision', 'pattern', 'learning', 'milestone', 'issue', 'insight']),
  metadata: z.object({
    created: z.string().datetime(),
    updated: z.string().datetime(),
    author: z.string().default('system'),
    source: z.enum(['manual', 'auto-captured', 'imported']),
    tags: z.array(z.string()),
    importance: z.enum(['low', 'medium', 'high']),
    context: z.object({
      projectPath: z.string(),
      relatedFiles: z.array(z.string()),
      conversation: z.object({
        sessionId: z.string(),
        tool: z.string(),
        timestamp: z.string().datetime()
      }).optional()
    })
  }),
  impact: z.object({
    scope: z.enum(['local', 'module', 'project', 'architecture']),
    confidence: z.number().min(0).max(1),
    rationale: z.string(),
    alternatives: z.array(z.string())
  }),
  searchable: z.object({
    keywords: z.array(z.string()),
    summary: z.string(),
    concepts: z.array(z.string())
  })
})
```

### API Design (Effect-TS)
```typescript
// Core diary functions
export const createEntry: (vibePath: string, entry: DiaryEntryInput) => Effect.Effect<DiaryEntry, VibeError, never>
export const searchDiary: (vibePath: string, query: DiarySearchQuery) => Effect.Effect<DiaryEntry[], VibeError, never>
export const getTimeline: (vibePath: string, dateRange?: DateRange) => Effect.Effect<DiaryEntry[], VibeError, never>
export const updateEntry: (vibePath: string, id: string, updates: Partial<DiaryEntry>) => Effect.Effect<DiaryEntry, VibeError, never>
export const deleteEntry: (vibePath: string, id: string) => Effect.Effect<boolean, VibeError, never>
export const autoCapture: (vibePath: string, conversation: ConversationData) => Effect.Effect<DiaryEntry | null, VibeError, never>
```

### File Structure
```
diary/
├── index.ts           # Main exports and orchestration
├── entries.ts         # Entry CRUD operations
├── auto-capture.ts    # Automatic decision detection
├── timeline.ts        # Time-based operations
├── markdown.ts        # DIARY.txt file management
└── __tests__/
    ├── diary.test.ts          # Unit tests
    ├── auto-capture.test.ts   # Auto-capture logic tests
    └── integration.test.ts    # Full diary integration
```

## Module 4: CLI Integration Commands

### New CLI Commands Required
```bash
# Memory commands
vibe memory add "<content>" --type=decision --tags=auth,security
vibe memory search "authentication patterns" --limit=5
vibe memory list --type=decision --importance=high

# Search commands  
vibe search "error handling" --type=memory,diary --limit=10
vibe search "Effect-TS patterns" --since="1 week ago"

# Diary commands
vibe diary add "Switched to Effect-TS" "Decided to use Effect-TS for all async operations because..."
vibe diary search "Effect-TS" --category=decision
vibe diary timeline --since="1 month ago"
vibe diary export --format=markdown

# Integration commands (enhanced)
vibe export --include=memory,diary,rules  # Include all data
vibe status --verbose  # Show memory/diary/search stats
```

### CLI Command Implementation
Add these to `cli/commands/`:
- `memory.ts` - Memory management commands
- `search.ts` - Global search commands  
- `diary.ts` - Diary management commands

Update existing commands:
- `export.ts` - Include memory/diary data
- `status.ts` - Show memory/diary/search statistics

## Module 5: Daemon & MCP Integration

### Daemon API Endpoints
```typescript
// Add to daemon HTTP server
GET  /api/memory/search?q=<query>&limit=10
POST /api/memory          # Create memory entry
GET  /api/memory/:id
DELETE /api/memory/:id

GET  /api/search?q=<query>&type=memory,diary&limit=10
POST /api/search/reindex  # Rebuild search index

GET  /api/diary/timeline?since=<date>
POST /api/diary           # Create diary entry
GET  /api/diary/:id
POST /api/diary/capture   # Auto-capture from conversation
```

### MCP Server Resources
```typescript
// Add to MCP server
vibe://memory/recent     - Recent memory entries
vibe://diary/timeline    - Recent diary entries  
vibe://search/index      - Search index status
```

### MCP Server Tools
```typescript
// Add to MCP server tools
search-memory      - Search through stored memories
add-memory         - Store new memory entry
search-diary       - Search diary entries
add-diary-entry    - Create diary entry
global-search      - Search across all .vibe data
```

## Implementation Plan

### Phase 1: Foundation (Day 1)
1. **Delete old discovery code**: Remove `discovery/registries/index.ts`
2. **Write comprehensive tests** for all 3 modules (TDD approach)
3. **Define schemas** in `schemas/` with Zod v4
4. **Set up file structure** for all 3 modules

### Phase 2: Core Implementation (Day 2)
1. **Implement Search system** (foundation for others)
2. **Implement Memory system** (uses Search)
3. **Implement Diary system** (uses Search)
4. **Run tests continuously** - make them pass

### Phase 3: Integration (Day 3)
1. **Add CLI commands** for memory, search, diary
2. **Update daemon** with new API endpoints
3. **Update MCP server** with new resources/tools
4. **Update export/status** commands to include new data

### Phase 4: Validation (Day 4)
1. **E2E integration tests** - full workflow tests
2. **Performance benchmarking** - ensure sub-100ms search
3. **Documentation update** - README and API docs
4. **Clean up remaining TypeScript errors**

## Success Criteria

### Functional Requirements ✅
- [ ] All 3 modules pass comprehensive tests
- [ ] CLI commands work end-to-end (`vibe memory add`, `vibe search`, `vibe diary add`)
- [ ] Daemon API endpoints functional
- [ ] MCP server integration working
- [ ] Search performance <100ms on 1000+ documents
- [ ] Memory/diary data included in exports

### Technical Requirements ✅
- [ ] Zero TypeScript errors in rewritten modules
- [ ] 100% Effect-TS patterns (no async/await mixing)
- [ ] Functional programming only (no custom classes)
- [ ] Zod v4 schemas with proper exports
- [ ] Comprehensive test coverage (>90%)

### Integration Requirements ✅
- [ ] Memory system actively used by CLI and daemon
- [ ] Search system used by memory and diary
- [ ] Diary system captures decisions via MCP
- [ ] All data available via export command
- [ ] Status command shows memory/diary/search stats

## Key Implementation Notes

### Functional Programming Patterns
```typescript
// ✅ CORRECT: Pure functions with Effect-TS
export const storeMemory = (
  vibePath: string,
  content: string,
  metadata: MemoryMetadata
) => pipe(
  Effect.sync(() => createMemoryEntry(content, metadata)),
  Effect.flatMap(memory => saveMemoryToFile(vibePath, memory)),
  Effect.flatMap(() => indexMemoryEntry(vibePath, memory)),
  Effect.map(() => memory.id)
)

// ❌ WRONG: Classes and mixed async/await
export class MemoryManager {
  async storeMemory(content: string) {
    const memory = new Memory(content)
    await this.save(memory)
    return memory.id
  }
}
```

### Error Handling Patterns
```typescript
// ✅ CORRECT: Functional error creation
import { createFileSystemError, createParseError } from '../lib/errors.ts'

Effect.tryPromise({
  try: () => Deno.readTextFile(path),
  catch: (error) => createFileSystemError(error, path, 'Failed to read memory file')
})

// ❌ WRONG: Class-based errors
catch: (error) => new VibeError(error.message, 'FILE_ERROR')
```

### Schema Patterns
```typescript
// ✅ CORRECT: Zod v4 with proper exports
import { z } from 'zod/v4'

export const MemorySchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1)
})

export type Memory = z.output<typeof MemorySchema>

// ❌ WRONG: Old Zod without version
import { z } from 'zod'
export type Memory = z.infer<typeof MemorySchema>
```

## Context for Implementation

### Project Structure Context
- **Runtime**: Deno with native TypeScript
- **Architecture**: Functional programming with Effect-TS
- **Testing**: Deno test with `@std/testing` 
- **File storage**: JSON files in `.vibe/` directory
- **CLI**: Commander.js with Effect-TS integration
- **Daemon**: HTTP server on port 4242
- **MCP**: Model Context Protocol server integration

### Existing Working Systems
- ✅ **Daemon**: HTTP server with secrets API, signal handling
- ✅ **MCP server**: AI tool integration working
- ✅ **CLI commands**: 8/8 commands working with tests
- ✅ **Schemas**: Clean Zod v4 patterns established
- ✅ **Error handling**: Functional error system working

### Code Quality Standards
- **No custom classes** for business logic
- **Effect-TS for all async operations** (no raw async/await)
- **Zod v4 schemas** with `/v4` import and `z.output` types
- **Comprehensive error handling** with functional error creation
- **Test-driven development** with high coverage
- **Performance focus** on search operations

---

## YOUR MISSION

**Rewrite the 3 legacy modules (memory, search, diary) from scratch using TDD methodology.**

1. **Start with comprehensive tests** for each module
2. **Implement using pure functional programming** and Effect-TS patterns
3. **Integrate them into CLI, daemon, and MCP server**
4. **Ensure they're actively used** and provide real value
5. **Achieve zero TypeScript errors** in the rewritten modules

**Success = All 3 modules working, tested, integrated, and actively used by the .vibe system.**

The foundation is solid. The patterns are established. The tests are your guide. 

**Write clean, functional, tested code. Make .vibe complete.**