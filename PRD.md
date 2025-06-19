# .vibe - Universal Developer Tool Orchestrator

## Product Vision

Transform every dependency in your project into instantly-available tools across all AI environments. Solve IDE fragmentation by making your entire development toolkit accessible in Cursor, ChatGPT, Claude, and any MCP-compatible AI.

## The "Vibe Coding" Philosophy

Based on our blog article "Vibe code in production and don't listen to haters!", .vibe enables a new development paradigm:

- **Passion Coding**: The 5% of elegant, creative code you love to write
- **Vibe Coding**: The 95% where you become a demanding architect, setting vision while AI handles implementation
- **Corporate Jujitsu**: Using TDD, documentation standards, and other "corporate BS" as tools to control AI agents

**Key Promise**: Developers become "Karens" who define the architectural vision while robots handle the boring implementation work.

## Core Problem & Solution

**Problem**: AI IDE fragmentation traps project knowledge in specific tools, forcing constant context switching.

**Solution**: "Empowering coach lurking in the shadows" - minimal-touch automation that:

1. **Observes** project dependencies automatically
2. **Extracts** developer tools from each library
3. **Exposes** tools universally via MCP protocol
4. **Enables** seamless AI assistance across all environments

## Current Implementation: Library Documentation Fetcher

### Blog Article Commitments

Our blog article makes specific promises about current functionality:

- 🚧 `vibe code hono` - Shows up-to-date library documentation (IMPLEMENTATION COMPLETE - Testing Phase)
- 🚧 `vibe code hono --list` - Lists available capability patterns (Future Phase 2)
- 🚧 `vibe code hono middleware` - Shows capability-specific docs (Future Phase 2)
- 🚧 `vibe code --map zod zod/v4` - Version-specific AI context mapping (Future Phase 2)

**Current Status**: Phase 1 implementation complete with comprehensive tests. In Step 4-5 of 8-step development cycle (Runtime Verification & Test Evolution).

### Phase 1: Simple Documentation Fetcher (Current Priority)

**What We're Building Now:**

```bash
vibe code hono              # Fetches https://hono.dev/llms.txt → prints to stdout
vibe code effect            # Fetches https://effect.website/llms.txt → prints to stdout  
vibe code zod               # Fetches https://zod.dev/llms.txt → prints to stdout
```

**Core Workflow:**

1. Parse `package.json`/`deno.json` for dependencies
2. Query package registry (npm/JSR) to get homepage URL
3. Extract apex domain and fetch `{domain}/llms.txt`
4. Cache in `.vibe/libraries/docs/{package}/README.md`
5. Print cached content on subsequent calls

**Storage Structure (Designed for Future Expansion):**

```
.vibe/
├── libraries/
│   ├── index.toml                    # package → version + domain mapping
│   └── docs/
│       ├── hono/
│       │   ├── README.md             # Current: Main llms.txt content
│       │   ├── route.md              # Future: Routing capability docs
│       │   └── middleware.md         # Future: Middleware capability docs
│       └── effect/
│           ├── README.md             # Current: Main llms.txt content
│           ├── pipe.md               # Future: Pipe capability docs
│           └── error.md              # Future: Error handling docs
```

### Technical Implementation Status

**✅ COMPLETED: Effect-TS Architecture**

```typescript
const vibeCodeCommand = (packageName: string) =>
  pipe(
    findProjectRoot(Deno.cwd()), // ✅ Implemented
    Effect.flatMap((projectPath) =>
      pipe(
        validatePackageInProject(packageName, projectPath), // ✅ Implemented
        Effect.flatMap((dependency) =>
          pipe(
            getCachedLibraryDocs(projectPath, packageName), // ✅ Implemented
            Effect.catchAll(() => fetchAndCacheLibraryDocs(projectPath, packageName, dependency.version) // ✅ Implemented
            ),
          )
        ),
      )
    ),
  )
```

**✅ COMPLETED: Core Services**

- `schemas/library-cache.ts` - Zod v4 schemas, TOML structure, helper functions
- `services/registry-client.ts` - npm/JSR HTTP client with automatic fallback
- `services/package-detector.ts` - package.json/deno.json parsing with dependency extraction
- `services/library-cache.ts` - TOML index management + markdown file caching
- `commands/vibe-code.ts` - Main command implementation with proper error handling

**🚧 IN PROGRESS: Test Suite (Step 4-5 of 8-Step Cycle)**

- ✅ Unit tests: library-cache.test.ts (11/11 passing)
- ✅ Unit tests: package-spec-parser.test.ts (7/7 passing - NEW: comprehensive parser tests)
- ✅ Unit tests: package-detector.test.ts (12/12 passing - FIXED: structured parsing)
- 🚧 Unit tests: registry-client.test.ts (fixing legacy extractPackageName test expectations)
- ✅ Integration tests: vibe-code.test.ts (written, needs verification)
- ✅ User tests: library-documentation.test.ts (written, needs verification)

**🔧 COMPLETED: Package Parsing Architecture Fix**

- ✅ Created `parsePackageSpec()` function for structured parsing of `npm:hono@^4.0.0` → `{registry: 'npm', name: 'hono', version: '^4.0.0'}`
- ✅ Updated package-detector to use clean structured data flow
- ✅ Fixed test expectations to match corrected implementation behavior
- ✅ Maintained backward compatibility with `extractPackageName()` function

**✅ PHASE 1 COMPLETE - READY FOR PHASE 2**

**🎉 Core Functionality Success:**

- ✅ `vibe code effect` works perfectly (133 lines of Effect documentation)
- ✅ Documentation fetching and caching system functional
- ✅ End-to-end workflow: package.json parsing → npm API → llms.txt fetching → local caching
- ✅ Storage architecture complete (`.vibe/libraries/index.toml` + per-package docs)

**✅ Technical Debt Resolution Completed:**

- ✅ All TypeScript compilation errors resolved
- ✅ Test suite: 100% passing (210 tests, 0 failures)
- ✅ Quality gates: All passing ([quality gate checklist](PROTOCOLS.md#quality-gates))
- ✅ Windows compatibility: Cross-platform filesystem handling fixed
- ✅ Test utilities: Unified into single shared `tests/utils.ts`

**🏁 Phase 1 Exit Criteria Status:**

- ✅ **Primary Goal**: `vibe code <package>` works for project dependencies
- ✅ **Core Value**: Fresh, authoritative documentation printed to stdout
- ✅ **Performance**: Intelligent caching for fast subsequent access
- ✅ **Architecture**: Foundation ready for Phase 2 capability extraction
- ✅ **Quality**: All tests passing, production-ready code

**📋 Current Implementation Status:**

Phase 1 implementation is **COMPLETE** and **PRODUCTION READY**. All [quality gates](PROTOCOLS.md#quality-gates) passing.

**🎯 Next Phase Planning:**

Ready to begin Phase 2 planning. Use [planning mode protocol](PROTOCOLS.md#planning-mode-protocol) and [requirements gathering protocol](PROTOCOLS.md#requirements-gathering-protocol) for next feature selection.

For complex Phase 2 work, use [thread template](PROTOCOLS.md#thread-management-protocol):

### **Thread Template Reference** {#thread-template}

For future complex implementations, copy this template from [PROTOCOLS.md](PROTOCOLS.md#thread-management-protocol):

```markdown
### **Thread**: [Name]

**Trigger**: [What caused this thread to open]
**Scope**: [What this thread covers]\
**Exit Criteria**: [How we know it's complete]
[Indented task list with status tracking using status emojis]
```

**Thread Management**: Follow [thread management protocol](PROTOCOLS.md#thread-management-protocol) with [status emojis](PROTOCOLS.md#thread-management-protocol) for progress tracking.

### Legacy Code Integration Strategy

**Merge Strategy (Critical - Don't Overwrite):**

- Check if target files exist before copying from legacy
- Merge functionality rather than overwrite existing implementations
- Use legacy as reference for patterns when conflicts exist

**Direct Integration Candidates:**

- `legacy/lib/{effects,errors,fs}.ts` → `src/lib/` (merge if exists)

**Adaptation Candidates:**

- `legacy/discovery/manifests/*` → `src/services/registry-client.ts` (adapt patterns)
- `legacy/schemas/dependency-doc.ts` → `src/schemas/library-cache.ts` (adapt schemas)

### CLAUDE.md Integration

Add new section instructing AI agents:

```markdown
## Library Documentation Access

When user asks about a package or you need to use a package in project dependencies:

1. **Always run** `vibe code <package>` first to get current documentation
2. **Use the output** as authoritative documentation for that library
3. **Examples**: User asks about Hono routing → Run `vibe code hono` first
```

### Immediate Benefits

- **Self-dogfooding**: Use immediately in .vibe development workflow
- **Fresh documentation**: Current llms.txt content vs. stale LLM training data
- **Foundation**: Storage and caching infrastructure for future capability extraction
- **Battle-tested patterns**: Reuse proven Effect-TS utilities from legacy codebase

## Future Roadmap

### Phase 2: Enhanced Command Interface

**Delivering Blog Article Promises:**

- `vibe code hono --list` - List available capability patterns
- `vibe code hono middleware` - Show capability-specific documentation
- `vibe code --map zod zod/v4` - Version-specific AI context mapping

**Technical Requirements:**

- LLM-powered capability extraction from documentation
- Enhanced TOML index with capability tracking
- Pattern storage in capability-specific .md files

### Phase 3: Automatic Intelligence & File Watching

- Monitor `package.json`/`deno.json` for changes
- Automatic documentation fetching for new dependencies
- Version change detection and cache updates
- Background capability extraction with confidence scoring

### Phase 4: Universal Access via MCP Integration

- Dynamic MCP tool generation from cached capabilities
- Same functionality in ChatGPT, Claude Desktop, Cursor
- Cross-platform integration with consistent interface
- Repository intelligence for clone-and-go tool availability

### Phase 5: Advanced Features & Quality of Life

- Enhanced CLI commands (`vibe status`, `vibe sync`, `vibe extract`)
- Performance optimization and cache validation
- Migration tools and developer experience improvements

## Architecture Overview

### Project Structure After Implementation

```
user-project/
├── .vibe/
│   ├── config.json                # Project configuration
│   ├── libraries/                 # NEW: Library documentation cache
│   │   ├── index.toml            # Fast lookup: package → version + domain
│   │   └── docs/{package}/       # Per-package documentation folders
│   ├── rules/                    # EXISTING: Rule definitions
│   └── generated/                # EXISTING: Generated file tracking
├── package.json / deno.json      # Dependencies we'll scan
├── AGENTS.md                     # EXISTING: Generated by URE
└── CLAUDE.md                     # EXISTING: Will be enhanced
```

### Technical Constraints

- **Deno-native**: No Node.js dependencies, use @std/toml for parsing
- **Effect-TS**: Functional composition, type-safe errors throughout
- **File-Based**: Local storage, no cloud dependencies
- **Merge-Safe**: Never overwrite existing implementations

## Success Definition

**Phase 1 Success**: A developer can run `vibe code <package>` for any dependency in their project and get fresh, authoritative documentation printed to stdout, with intelligent caching for fast subsequent access.

**Long-term Success**: A developer can `vibe init` in any project and have their entire development toolkit available across all AI environments with zero maintenance overhead.
