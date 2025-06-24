#!/grammars/pseudo-kernel parse

# Tools Protocol - LLM CLI Tool Documentation & Examples

## Purpose

Direct CLI primitive approach: Instead of file manipulation, expose low-level CLI primitives directly to LLMs. This protocol provides on-demand documentation and examples for any tool an LLM needs to use.

## Algorithm

```pseudo
fn tools_protocol(tool_name: string, operation?: string) -> ToolDocumentation {
  let tool_docs = match tool_name {
    "surreal" => get_surrealdb_docs(operation),
    "tree-sitter" => get_treesitter_docs(operation),
    "vibe" => get_vibe_docs(operation),
    _ => get_generic_tool_docs(tool_name)
  };
  
  ToolDocumentation {
    syntax: tool_docs.syntax,
    examples: tool_docs.examples,
    common_patterns: tool_docs.patterns,
    error_handling: tool_docs.errors
  }
}

fn get_surrealdb_docs(operation: string) -> SurrealDocs {
  match operation {
    "create" => {
      syntax: "surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty",
      examples: [
        "echo 'CREATE code_node CONTENT {file_path: \"src/auth.ts\", node_type: \"function\", name: \"authenticate\", code_snippet: \"async function...\"}' | surreal sql ...",
        "echo 'CREATE session:current CONTENT {stage: \"development\", step: 3, context_budget: 15000}' | surreal sql ..."
      ],
      patterns: [
        "Use CONTENT syntax for structured data insertion",
        "Always specify record ID for session management", 
        "Index code patterns with meaningful node_type classifications"
      ]
    },
    
    "query" => {
      syntax: "echo 'SELECT ...' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty",
      examples: [
        "echo 'SELECT code_snippet, line_range FROM code_node WHERE patterns CONTAINS \"async\" LIMIT 5' | surreal sql ...",
        "echo 'SELECT * FROM session WHERE stage = \"development\"' | surreal sql ...",
        "echo 'SELECT * FROM code_node WHERE file_path LIKE \"%auth%\" AND complexity_score > 0.7' | surreal sql ..."
      ],
      patterns: [
        "Use CONTAINS for array pattern matching",
        "LIMIT queries for context efficiency", 
        "Combine WHERE clauses for precise filtering"
      ]
    },
    
    "update" => {
      syntax: "echo 'UPDATE ...' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty",
      examples: [
        "echo 'UPDATE session:current SET step = 4, context_budget.used += 2000' | surreal sql ...",
        "echo 'UPDATE code_node SET complexity_score = 0.8 WHERE name = \"authenticate\"' | surreal sql ..."
      ],
      patterns: [
        "Use record IDs for specific updates",
        "Increment counters with += syntax",
        "Batch updates when possible"
      ]
    },
    
    "delete" => {
      syntax: "echo 'DELETE ...' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty", 
      examples: [
        "echo 'DELETE FROM code_node WHERE file_path LIKE \"%temp%\"' | surreal sql ...",
        "echo 'DELETE session WHERE stage = \"completed\"' | surreal sql ..."
      ],
      patterns: [
        "Use WHERE clauses for safe deletion",
        "Clean up temporary data regularly",
        "Preserve session history for analytics"
      ]
    }
  }
}

fn get_treesitter_docs(operation: string) -> TreeSitterDocs {
  match operation {
    "parse" => {
      syntax: "tree-sitter parse <file> --quiet",
      examples: [
        "tree-sitter parse src/auth.ts --quiet | jq '.children[0].children' # Extract function declarations",
        "cd .vibe/grammars/pseudo-kernel && tree-sitter parse ../../../src/algorithm.md --quiet",
        "tree-sitter parse --help # Show all available options"
      ],
      patterns: [
        "Use --quiet flag to suppress progress output",
        "Pipe to jq for JSON processing",
        "Change directory to grammar location for correct parsing"
      ]
    },
    
    "query" => {
      syntax: "tree-sitter query <grammar-dir> <query-file> <source-file>",
      examples: [
        "tree-sitter query .vibe/grammars/typescript queries/functions.scm src/auth.ts",
        "echo '(function_declaration name: (identifier) @name)' > temp.scm && tree-sitter query .vibe/grammars/typescript temp.scm src/auth.ts"
      ],
      patterns: [
        "Create .scm query files for reusable patterns",
        "Use @capture names for extracting specific nodes",
        "Combine with shell scripting for automation"
      ]
    },
    
    "generate" => {
      syntax: "cd <grammar-dir> && tree-sitter generate",
      examples: [
        "cd .vibe/grammars/pseudo-kernel && tree-sitter generate",
        "cd .vibe/grammars/specs && tree-sitter generate && tree-sitter test"
      ],
      patterns: [
        "Run from grammar directory",
        "Follow with tree-sitter test for validation",
        "Regenerate after grammar.js changes"
      ]
    }
  }
}

fn get_vibe_docs(operation: string) -> VibeDocs {
  match operation {
    "query" => {
      syntax: "vibe query <pattern> [--limit N] [--complexity <level>] [--session <id>]",
      examples: [
        "vibe query \"async functions in auth module\" --limit 5",
        "vibe query \"error handling patterns\" --complexity high",
        "vibe query \"(function_declaration name: (identifier) @name)\" --limit 3",
        "vibe query \"recent implementations\" --session current"
      ],
      patterns: [
        "Use natural language for semantic queries",
        "Use tree-sitter syntax for structural queries", 
        "Limit results for context efficiency",
        "Filter by complexity for relevant patterns"
      ]
    },
    
    "index" => {
      syntax: "vibe index [--incremental] [--path <dir>]",
      examples: [
        "vibe index # Full codebase indexing",
        "vibe index --incremental # Update only changed files",
        "vibe index --path src/auth # Index specific directory"
      ],
      patterns: [
        "Run full index after major changes",
        "Use incremental for real-time development",
        "Target specific paths for focused indexing"
      ]
    },
    
    "session" => {
      syntax: "vibe session <load|save|create> [session-id]",
      examples: [
        "vibe session load # Restore latest session",
        "vibe session save checkpoint_auth_feature",
        "vibe session create dev_session_new_feature"
      ],
      patterns: [
        "Save before major development steps",
        "Use descriptive session IDs",
        "Load for resumption after context limits"
      ]
    },
    
    "stage" => {
      syntax: "vibe stage <start|end> <stage-name>",
      examples: [
        "vibe stage start specs_generation",
        "vibe stage end development_cycle",
        "vibe stage start testing_phase"
      ],
      patterns: [
        "Track MRI boundaries with stages",
        "Use consistent naming conventions",
        "End stages before starting new ones"
      ]
    }
  }
}
```

## Usage Pattern

```pseudo
// LLM queries this protocol when needing tool documentation
fn use_tool_example() {
  // Get SurrealDB create documentation
  let create_docs = execute_protocol("tools", "surreal", "create");
  
  // Use the documented syntax
  let command = create_docs.examples[0];
  execute_cli(command);
  
  // Get vibe query documentation  
  let query_docs = execute_protocol("tools", "vibe", "query");
  let patterns = query_docs.patterns;
  
  // Apply patterns for context-efficient queries
  let query_result = execute_cli("vibe query \"async auth functions\" --limit 5");
}
```

## Benefits

- **Zero File Manipulation**: LLMs use CLI tools directly
- **Self-Documenting**: Protocol provides examples on demand
- **Battle-Tested**: Uses standard CLI tools as intended
- **Context Efficient**: Documentation only when needed
- **Consistent**: Standardized patterns across all tools

## Tool Categories

### Database Operations (SurrealDB)
- `surreal sql` - Direct SQL execution with piped queries
- Real-time data operations without file intermediaries
- Queryable code patterns and session state

### Code Analysis (Tree-sitter) 
- `tree-sitter parse` - AST generation with JSON output
- `tree-sitter query` - Pattern matching and extraction
- `tree-sitter generate` - Grammar compilation

### Vibe Commands
- `vibe query` - Revolutionary context retrieval
- `vibe index` - Code pattern indexing
- `vibe session` - State management
- `vibe stage` - MRI boundary tracking

## Context Links

- [SurrealDB CLI Documentation] - Official command reference
- [Tree-sitter CLI Guide] - Standard tree-sitter usage
- [Vibe Commands] - Custom .vibe system commands
- [Protocol System] - How protocols call each other