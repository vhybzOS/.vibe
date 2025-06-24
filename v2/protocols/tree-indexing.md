#!/grammars/pseudo-kernel parse

# Tree-Indexing Protocol - Real-Time AST Indexing

## Purpose

Real-time code indexing using direct tree-sitter CLI and SurrealDB CLI. Index prototype code into queryable patterns as we write it, enabling precise context retrieval.

## Algorithm

```pseudo
fn tree_indexing_protocol(workspace_path: string, indexing_mode: "incremental" | "full") -> IndexingResult {
  // Step 1: Get current indexing state from SurrealDB
  let state_query = "SELECT * FROM indexing_state ORDER BY updated DESC LIMIT 1";
  let current_state = execute_cli(`echo '${state_query}' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty`);
  
  // Step 2: Determine files to index based on mode
  let files_to_index = match indexing_mode {
    "incremental" => {
      let last_indexed = current_state.records[0]?.last_indexed || "1970-01-01";
      
      // Find changed files using system tools
      let changed_files = execute_cli(`find ${workspace_path} -name "*.ts" -o -name "*.js" -o -name "*.md" -newer ${last_indexed}`);
      changed_files.split('\n').filter(f => f.length > 0)
    },
    
    "full" => {
      let all_files = execute_cli(`find ${workspace_path} -name "*.ts" -o -name "*.js" -o -name "*.md"`);
      all_files.split('\n').filter(f => f.length > 0)
    }
  };
  
  let indexed_patterns = [];
  let total_nodes = 0;
  
  // Step 3: Process each file with tree-sitter
  for file_path in files_to_index {
    // Parse file with appropriate grammar
    let grammar_dir = determine_grammar(file_path);
    let parse_result = execute_cli(`cd ${grammar_dir} && tree-sitter parse ${file_path} --quiet`);
    
    if parse_result.error {
      continue; // Skip unparseable files
    }
    
    // Extract meaningful nodes using tree-sitter query
    let query_result = execute_cli(`tree-sitter query ${grammar_dir} queries/extract-patterns.scm ${file_path}`);
    let extracted_nodes = parse_query_result(query_result);
    
    // Step 4: Store each pattern in SurrealDB
    for node in extracted_nodes {
      let code_snippet = extract_code_snippet(file_path, node.range);
      let complexity = calculate_complexity(node);
      let patterns = extract_patterns(node, code_snippet);
      
      let create_query = `CREATE code_node CONTENT {
        file_path: "${file_path}",
        node_type: "${node.type}",
        name: "${node.name || 'anonymous'}",
        line_range: [${node.range.start.row}, ${node.range.end.row}],
        code_snippet: ${JSON.stringify(code_snippet)},
        patterns: ${JSON.stringify(patterns)},
        complexity_score: ${complexity},
        indexed_at: time::now(),
        session_id: "${get_current_session()}"
      }`;
      
      execute_cli(`echo '${create_query}' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty`);
      
      indexed_patterns.push({
        file: file_path,
        type: node.type,
        name: node.name,
        patterns: patterns
      });
      
      total_nodes += 1;
    }
  }
  
  // Step 5: Update indexing state
  let update_state = `UPDATE indexing_state:current SET {
    last_indexed: time::now(),
    files_processed: ${files_to_index.length},
    nodes_indexed: ${total_nodes},
    indexing_mode: "${indexing_mode}"
  }`;
  
  execute_cli(`echo '${update_state}' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty`);
  
  // Step 6: Track context budget impact
  execute_cli(`vibe stage start indexing_${indexing_mode}`);
  let context_efficiency = calculate_context_efficiency(indexed_patterns);
  execute_cli(`vibe stage end indexing_${indexing_mode}`);
  
  IndexingResult {
    files_processed: files_to_index.length,
    patterns_found: total_nodes,
    indexed_patterns: indexed_patterns,
    context_efficiency: context_efficiency,
    ready_for_query: true
  }
}

fn determine_grammar(file_path: string) -> string {
  match file_path {
    path if path.ends_with(".md") && path.contains("algorithms") => ".vibe/grammars/pseudo-kernel",
    path if path.ends_with(".md") && path.contains("specs") => ".vibe/grammars/specs", 
    path if path.ends_with(".ts") || path.ends_with(".js") => ".vibe/grammars/pseudo-typescript",
    _ => ".vibe/grammars/pseudo-typescript" // default
  }
}

fn extract_patterns(node: ASTNode, code_snippet: string) -> Array<string> {
  let patterns = [];
  
  // Semantic patterns
  if code_snippet.contains("async") { patterns.push("async"); }
  if code_snippet.contains("await") { patterns.push("await"); }
  if code_snippet.contains("Promise") { patterns.push("promise"); }
  if code_snippet.contains("Error") { patterns.push("error_handling"); }
  if code_snippet.contains("test") || code_snippet.contains("expect") { patterns.push("testing"); }
  
  // Structural patterns
  patterns.push(node.type); // function_declaration, class_declaration, etc.
  
  // Domain patterns (heuristic)
  if code_snippet.contains("auth") { patterns.push("authentication"); }
  if code_snippet.contains("db") || code_snippet.contains("query") { patterns.push("database"); }
  if code_snippet.contains("api") || code_snippet.contains("endpoint") { patterns.push("api"); }
  
  patterns
}

fn calculate_context_efficiency(indexed_patterns: Array<IndexedPattern>) -> ContextEfficiency {
  let total_code_lines = indexed_patterns.map(p => p.line_count).sum();
  let queryable_snippets = indexed_patterns.length;
  let average_snippet_size = total_code_lines / queryable_snippets;
  
  ContextEfficiency {
    total_lines_indexed: total_code_lines,
    queryable_snippets: queryable_snippets,
    average_snippet_size: average_snippet_size,
    compression_ratio: average_snippet_size / 1000.0, // vs loading full files
    estimated_token_savings: calculate_token_savings(total_code_lines, queryable_snippets)
  }
}
```

## CLI Command Patterns

### Tree-sitter Operations
```bash
# Parse file with appropriate grammar
cd .vibe/grammars/pseudo-kernel && tree-sitter parse ../../../src/auth.ts --quiet

# Extract patterns with custom queries
tree-sitter query .vibe/grammars/pseudo-typescript queries/extract-patterns.scm src/auth.ts

# Check grammar health
cd .vibe/grammars/pseudo-typescript && tree-sitter test

# Generate updated parser
cd .vibe/grammars/pseudo-kernel && tree-sitter generate
```

### SurrealDB Operations  
```bash
# Store indexed code pattern
echo 'CREATE code_node CONTENT {file_path: "src/auth.ts", node_type: "function_declaration", name: "authenticate", line_range: [10, 25], code_snippet: "async function authenticate...", patterns: ["async", "authentication"], complexity_score: 0.7}' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty

# Query indexed patterns
echo 'SELECT code_snippet, line_range FROM code_node WHERE patterns CONTAINS "async" AND file_path LIKE "%auth%" LIMIT 5' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty

# Update indexing state
echo 'UPDATE indexing_state:current SET last_indexed = time::now(), nodes_indexed += 47' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty

# Clean old indexing data
echo 'DELETE FROM code_node WHERE indexed_at < time::now() - 7d AND session_id != "current"' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty
```

### Vibe Operations
```bash
# Incremental indexing during development
vibe index --incremental --path src/

# Full project indexing
vibe index --path .

# Track indexing performance
vibe stage start indexing_incremental
vibe stage end indexing_incremental

# Query newly indexed patterns
vibe query "recent async implementations" --session current --limit 3
```

### System Operations
```bash
# Find changed files for incremental indexing
find src/ -name "*.ts" -o -name "*.js" -newer .vibe/last-index

# Extract code snippet from file and line range
sed -n '10,25p' src/auth.ts

# Calculate file complexity metrics
wc -l src/auth.ts | awk '{print $1/100}' # Simple complexity heuristic
```

## Real-Time Integration

```pseudo
// Called during development workflow
fn integrate_with_development() {
  // After writing new code
  execute_cli("vibe index --incremental --path src/auth/");
  
  // Before needing context  
  let context = execute_cli("vibe query 'error handling in auth functions' --limit 3");
  
  // Track indexing impact
  let metrics = execute_cli("echo 'SELECT COUNT() FROM code_node WHERE indexed_at > time::now() - 5m' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty");
}
```

## Benefits

- **Real-Time**: Index code as it's written, not in batch
- **Precise Queries**: 10-line snippets instead of 1000-line files  
- **CLI Native**: Direct tree-sitter and SurrealDB commands
- **Context Efficient**: Dramatic token usage reduction
- **Pattern Aware**: Semantic and structural pattern extraction

## Context Links

- [tools.md] - CLI patterns for tree-sitter and SurrealDB
- [context-query.md] - How to query indexed patterns
- [Tree-sitter Queries] - Custom query files for pattern extraction
- [SurrealDB Schema] - Database structure for indexed code