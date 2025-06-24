# Axior OS v2 - Complete System Redesign

**Vision**: Transform from static protocols to dynamic, agent-refactorable intelligence amplification system.

## 🎯 Core Philosophy

**Agent-Centric Design**: Algorithms are executable pseudo-code files that agents can modify and evolve.
**SurrealDB-Powered**: Replace TOML indexing with queryable database for context, MRI, and session management.
**Template-Driven**: Framework-aware project initialization via surgical copying.

## 🏗️ Architecture Overview

### Process Pipeline

```
User Prompt → Specs Stage (subagent) → Development Stage (subagent) → Completion
     ↑                    ↓                        ↓                      ↓
Context DB ←── Smart Resumption ←── 9-Step Cycle ←── Low-Level Algorithm
```

### File Structure (Destination Project)

```
PROJECT/
├── .vibe/
│   ├── algorithms/          # Executable pseudo-code (agent-modifiable)
│   │   ├── main.md         # Entry point algorithm
│   │   ├── specs-stage.md  # Specification generation
│   │   ├── dev-9step.md    # Enhanced development cycle
│   │   └── session-mgmt.md # Context resumption logic
│   ├── specs/              # Generated specifications with shebang grammars
│   ├── grammars/           # Standard tree-sitter projects (shell scripts + CLI)
│   ├── archive/            # Completed work storage
│   ├── code.db             # SurrealDB database
│   └── config.json         # Configuration
└── [existing project structure]
```

## 🌳 KISS Tree-sitter Integration

**Revolutionary Simplicity**: Use tree-sitter CLI tools directly with minimal shell script redirects. Zero custom integration code.

### Grammar Project Structure

```
.vibe/grammars/
├── pseudo-typescript/           # Standard tree-sitter project
│   ├── grammar.js              # JavaScript DSL grammar definition
│   ├── package.json            # Standard tree-sitter package.json
│   ├── src/                   # Generated C parser (tree-sitter generate)
│   ├── test/corpus/           # Test files for tree-sitter test
│   └── parse                  # Shell script: tree-sitter parse "$1" --quiet
├── specs/                     # Specification file grammar
│   ├── grammar.js             # Grammar for spec files with shebang
│   ├── package.json           # Standard tree-sitter package
│   ├── src/                  # Generated parser
│   ├── test/corpus/          # Grammar tests
│   └── parse                 # Shell script redirect
└── build-all.sh              # Run tree-sitter generate for all grammars
```

### Ultra-Simple Architecture

```
Algorithm file → parse (shell script) → tree-sitter parse --quiet → JSON → SurrealDB indexing
```

**Key Benefits**:
- **Zero custom tree-sitter code** - Use CLI tools as intended
- **Standard development workflow** - `tree-sitter init/generate/test`
- **Tiny shell scripts** - ~20 bytes vs 100MB compiled binaries
- **Battle-tested parsing** - Production-ready tree-sitter CLI
- **Auto JSON output** - No custom formatting needed

### Shell Script Implementation

```bash
#!/bin/bash
# parse executable - redirects to tree-sitter CLI
cd "$(dirname "$0")"
tree-sitter parse "$1" --quiet
```

**That's it!** Tree-sitter CLI handles all parsing, JSON formatting, and error handling.

## 🧠 Boot Sequence (Ultra-Minimal AGENTS.md)

```markdown
# AGENTS.md - Axior OS Kernel

**Axior OS**: Algorithmic eXecution & Iterative Observation Refinement

## 🧠 Boot Sequence

1. `vibe index` - Initialize SurrealDB, parse codebase
2. `vibe session load` - Restore or create session state
3. Execute `.vibe/algorithms/main.md` - Run current algorithm

## 🔄 Operating Philosophy

Agent-refactorable algorithms stored in `.vibe/algorithms/`
Context managed via SurrealDB queries\
Subagents spawn with selective context resumption
```

## 🛠️ Command Interface

### Core Commands

- `vibe init` - Copy template structure to project
- `vibe index` - Parse codebase with tree-sitter into SurrealDB, warm up system
- `vibe query <query>` - **Revolutionary context management**: Get precise 10-line code snippets instead of full files
- `vibe session load/save` - Smart context management
- `vibe stage start/end <name>` - MRI boundary tracking

### Revolutionary `vibe query` Examples

```bash
# Natural language queries
vibe query "async functions in auth module"
vibe query "error handling patterns" 
vibe query "React components with useState hooks"
vibe query "function definitions that return promises"

# Tree-sitter syntax queries  
vibe query "(function_declaration name: (identifier) @name)"
vibe query "(method_definition key: (property_identifier) @method)"
```

**Context Revolution**: Instead of loading entire 1000-line files, agents get exactly the 10 relevant lines they need!

### SurrealDB Integration

**KISS Tree-sitter CLI integration** with standard JSON parsing and intelligent pattern extraction:

```sql
-- Code patterns indexed by tree-sitter during development
CREATE code_node CONTENT {
  file_path: "src/auth.ts",
  node_type: "function_declaration", 
  name: "authenticate",
  line_range: [42, 58],
  code_snippet: "async function authenticate(credentials) { ... }",
  ast_context: {...},
  patterns: ["async", "authentication", "error_handling"],
  complexity_score: 0.7
}

-- Revolutionary context queries - get precise snippets, not full files
SELECT code_snippet, line_range FROM code_node 
WHERE patterns CONTAINS "async" AND file_path LIKE "%auth%" 
LIMIT 5;

-- Session state with tree-sitter integration
CREATE session:current CONTENT {
  stage: "development", 
  step: 6,
  focus_stack: ["test_completion", "error_handling"],
  context_budget: {used: 15000, limit: 200000}, // Dramatically reduced!
  indexed_files: 247,
  total_patterns: 3891
}
```

**Context Efficiency**: 10 relevant lines instead of 1000-line files = 100x context compression!

## 📋 Process Stages

### 1. Specs Stage

**Trigger**: User prompt with no active session
**Agent**: Specs-agent (expanded context)
**Output**:

- `.vibe/specs/feature.md` (with shebang grammar)
- High-level algorithm in pseudo-code
  **Context**: Full codebase access via SurrealDB queries

### 2. Development Stage

**Trigger**: Approved specs
**Agent**: Coder-agent (context-managed with tree-sitter)
**Process**: Enhanced 9-step cycle with intelligent code analysis

1. Write tests first
2. Prototype in workspace
3. **Tree-sitter indexing**: Parse implemented code into SurrealDB patterns
4. Implement incrementally using `vibe query` for precise context
5. Verify runtime
6. Evolve tests
7. Quality gates + validation
8. Loop or complete
9. **NEW**: Generate low-level algorithm from implemented code + indexed patterns

**Revolutionary Context Management**:

- `vibe query "similar error handling"` → get 10 relevant lines, not full files
- Real-time AST indexing during implementation
- Context budget reduced from 200K to 15K tokens

### 3. Context Resumption Algorithm

```pseudo
INPUT: interrupted_session, target_step
step_requirements = query_step_dependencies(target_step)

# Revolutionary: Get precise code snippets, not full files
relevant_patterns = vibe query step_requirements.patterns --limit 10
relevant_functions = vibe query step_requirements.functions --limit 5  
current_context = vibe query "recent implementations" --session current

minimal_context = combine(relevant_patterns, relevant_functions, current_context)
# Result: 15 lines of precise code instead of 15,000 lines of full files

new_agent = spawn_agent(minimal_context) 
EXECUTE continue_from_step(target_step)
```

**Context Efficiency**: Tree-sitter + SurrealDB enables 1000x more precise context loading

## 🗂️ Template System

### Structure

```
v2/templates/
├── base/
│   ├── .vibe/
│   │   ├── algorithms/      # Base algorithm templates
│   │   ├── grammars/        # Grammar definitions
│   │   ├── config.json      # Default configuration
│   │   └── code.db          # Empty SurrealDB
│   └── AGENTS.md            # Minimal kernel
└── frameworks/
    ├── deno/                # Deno-specific adaptations
    ├── node/                # Node-specific adaptations
    └── python/              # Future: Python support
```

### Copy Strategy

- `vibe init` detects project type (package.json, deno.json, etc.)
- Copies base template + framework-specific overlays
- Adapts algorithms and grammars to project patterns

## 🧬 Grammar System

### Specification Grammar

```markdown
#!/grammars/specs parse

# Feature: User Authentication

## Intent

AUTHENTICATE user WITH credentials RETURNING session_token

## Inputs

credentials: {username: string, password: string}

## Outputs

SUCCESS: session_token: JWT<UserClaims>
FAILURE: AuthError = InvalidCredentials | AccountLocked

## Examples

authenticate({username: "alice", password: "secret123"}) → "eyJ..."

## Constraints

password.length >= 8
rate_limit(username) < 5_attempts_per_hour

## Invariants

valid_session(token) ⟺ user_exists(decode(token).sub)
```

### Algorithm Grammar (Hybrid Pseudo + Native)

```pseudo
INPUT: credentials: AuthRequest
validation_result = validate_credentials(credentials)
IF validation_result.valid THEN
  user_record = tsNode42  // query_user(credentials.username) 
  session_data = tsNode43 // create_session(user_record)
  RETURN Success(session_data.token)
ELSE
  RETURN Failure(AuthError::InvalidCredentials)
END
```

Where `tsNode42` maps to actual TypeScript: `await db.user.findUnique({where: {username}})`

## 🔍 MRI (Model Retrieval Information)

### Tracking Structure

```sql
CREATE mri_access CONTENT {
  session_id: "dev_session_001",
  stage: "specs",
  timestamp: time::now(),
  file_path: "/src/auth.ts", 
  range: {start: [10, 0], end: [25, 15]},
  query_type: "ast_node_selection",
  relevance_score: 0.94
}
```

### Queryable Audit Trail

- Which files/ranges accessed during each stage
- Context compression ratios achieved
- Performance metrics per session
- Pattern recognition for future optimization

## 🚀 Implementation Plan

### Phase 1: Foundation (v2/ folder)

1. Create SPECS.md (this document) ✓
2. Set up v2/ folder structure
3. Design SurrealDB schema
4. Create base template structure
5. Implement minimal vibe CLI commands

### Phase 2: Core Algorithms

1. Implement specs-stage.md algorithm
2. Implement dev-9step.md algorithm
3. Implement session-mgmt.md algorithm
4. Create grammar parsers (specs + pseudo-code)
5. Test with sample project

### Phase 3: Advanced Features

1. Smart context resumption
2. MRI tracking and analytics
3. Framework-specific templates
4. Performance optimization
5. User testing and feedback

### Phase 4: Migration

1. User testing with v2/ system
2. Performance comparison with v1
3. Migration tooling (v1 → v2)
4. Move v2/ → root, everything else → legacy/

## 🎯 Success Metrics

- **Boot Time**: <50 tokens (vs current 100)
- **Context Efficiency**: >90% compression ratio
- **Resumption Success**: 99% successful context restoration
- **Agent Autonomy**: Algorithms self-modify for project adaptation
- **Development Velocity**: 2x faster spec → working code cycle

## 🔮 Future Vision

- **Visualization Layer**: Three.js animations showing data flow
- **Multi-Language**: Python, Rust, Go template support
- **Collaborative**: Multi-agent coordination for complex features
- **Learning**: System learns and optimizes from usage patterns

---

**Design Philosophy**: Every token serves intelligence. Every component amplifies cognitive capability. Every algorithm is agent-refactorable.
