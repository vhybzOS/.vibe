#!/grammars/specs parse

# Vibe Commands Specification - Production CLI Implementation

## Intent

Implement 3 core vibe commands (`init`, `index`, `query`) using our protocol system, following our own 10-step development process to dogfood our context management system.

## Feature Scope

### **vibe init** - Project Initialization
- **Purpose**: Copy complete v2/template into existing project (new semantics: one layer above)
- **Innovation**: No deno.json creation, template copying instead of .vibe subdirectory
- **Integration**: Battle-tested init.ts architecture from root + v2 template system

### **vibe index** - Real-Time Code Indexing  
- **Purpose**: Parse codebase with tree-sitter, store patterns in SurrealDB
- **Innovation**: CLI-native operations, incremental indexing, pattern extraction
- **Integration**: Proven tree-sitter-indexer.ts + protocol-driven architecture

### **vibe query** - Revolutionary Context Management
- **Purpose**: Get precise 10-line code snippets instead of 1000-line files
- **Innovation**: 100x context compression, natural language pattern queries
- **Integration**: Existing query.ts (90% complete) + validated compression metrics

## Inputs

### **Command Line Arguments**:
```bash
# vibe init
vibe init [--force] [--quiet]

# vibe index  
vibe index [--incremental] [--path <directory>] [--language <lang>]

# vibe query
vibe query "<query>" [--limit <n>] [--file <path>] [--type <type>] [--complexity <level>]
```

### **Environment Dependencies**:
- SurrealDB server running on localhost:8000
- Tree-sitter CLI available in PATH
- Deno runtime with Effect-TS support
- v2/template/ directory with complete protocol system

### **Data Sources**:
- Battle-tested code from `/home/keyvan/.vibe/` (root)
- Revolutionary innovations from `/home/keyvan/.vibe/v2/`
- Existing template system with protocols and algorithms

## Outputs

### **vibe init**:
```
project/
├── .vibe/
│   ├── algorithms/         # ← Complete protocol-driven algorithms
│   ├── protocols/          # ← All 5 protocols (specs, tree-indexing, etc.)
│   ├── code.db            # ← SurrealDB database file
│   └── config.json        # ← Project configuration
├── src/                   # ← Existing project structure (untouched)
└── package.json          # ← Existing project files (untouched)
```

### **vibe index**:
```sql
-- SurrealDB code.db populated with:
CREATE code_node CONTENT {
  file_path: "src/auth.ts",
  node_type: "function_declaration", 
  name: "authenticate",
  line_range: [42, 58],
  code_snippet: "async function authenticate...",
  patterns: ["async", "authentication"],
  complexity_score: 0.7,
  indexed_at: "2025-06-24T18:00:00Z"
}
```

### **vibe query**:
```json
{
  "query": "async functions",
  "results": [
    {
      "file_path": "src/auth.ts",
      "name": "authenticate", 
      "node_type": "function_declaration",
      "line_range": [42, 58],
      "code_snippet": "async function authenticate(credentials) { ... }",
      "relevance_score": 0.9,
      "patterns": ["async", "authentication"]
    }
  ],
  "total_results": 1,
  "context_tokens_saved": 9940,
  "execution_time_ms": 45
}
```

## Implementation Strategy

### **Architecture**: Battle-Tested + Revolutionary
- **Reuse**: Effect-TS patterns, error handling, file operations from root
- **Innovate**: Protocol integration, CLI primitives, context compression from v2
- **Dogfood**: Use our own 10-step development process throughout

### **Code Reuse Strategy**:
```typescript
// FROM ROOT: Battle-tested foundation
import { Effect, pipe } from 'effect'
import { readTextFile, writeTextFile, ensureDir } from '../../../lib/fs.ts'
import { createFileSystemError, type VibeError } from '../../../lib/errors.ts'
import { ProjectConfigSchema } from '../../../schemas/config.ts'

// FROM V2: Revolutionary innovations  
import { indexCodebaseWithTreeSitter } from '../lib/tree-sitter-indexer.ts'
import { executeVibeQuery } from '../commands/query.ts'
```

### **Quality Gates**:
1. **Test Coverage**: 100% for all command logic
2. **Integration Testing**: End-to-end with real SurrealDB
3. **Protocol Compliance**: All operations via CLI primitives
4. **Context Compression**: Maintain 99% efficiency
5. **Error Handling**: Complete Effect-TS error management

## Revolutionary Benefits

### **Context Efficiency**: 
- **Before**: Load 1000-line files for 10 relevant lines
- **After**: Load exactly 10 relevant lines via pattern queries
- **Result**: 100x compression, 99% token savings

### **Development Velocity**:
- **Protocol Guidance**: Dynamic access to implementation patterns
- **Real-Time Indexing**: Code patterns available immediately
- **CLI Native**: Zero file manipulation abstractions

### **Intelligence Amplification**:
- **Self-Optimizing**: Track compression metrics in real-time
- **Pattern Learning**: Build pattern recognition database
- **Dogfooding**: Validate our own revolutionary process

## Constraints

### **Technical Constraints**:
- Must use existing battle-tested code extensively
- All database operations via SurrealDB CLI primitives  
- Tree-sitter parsing via shell script integration
- Effect-TS composition throughout

### **Semantic Constraints**:
- **New vibe init**: Copy template to project root (not .vibe subdirectory)
- **No file manipulation**: All operations via CLI commands
- **Protocol compliance**: Follow our own 10-step development process

### **Quality Constraints**:
- Comprehensive test coverage before implementation
- Real-time metrics tracking during development
- Production-ready error handling and validation

## Success Metrics

### **Functional Success**:
- ✅ All 3 commands work end-to-end
- ✅ Template copying preserves complete protocol system
- ✅ Indexing populates SurrealDB with accurate patterns
- ✅ Queries return precise, relevant code snippets

### **Revolutionary Success**:
- ✅ 100x context compression maintained throughout
- ✅ 99% token savings in real development usage
- ✅ Protocol guidance used for implementation decisions
- ✅ Self-dogfooding validates entire approach

### **Production Success**:
- ✅ Battle-tested code reuse percentage > 70%
- ✅ Revolutionary features integration seamless
- ✅ Comprehensive test suite passes
- ✅ Ready for real project usage

**Status**: Specification Complete - Ready for Step 1 (Write Tests First)