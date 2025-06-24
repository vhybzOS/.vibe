#!/grammars/pseudo-kernel parse

# Context Query Protocol - Advanced Context Management

## Purpose

Core feature: Use `vibe query` and direct SurrealDB queries to get precise 10-line code snippets instead of loading 1000-line files. Achieve 100x context compression with surgical precision.

## Algorithm

```pseudo
fn context_query_protocol(query_needs: QueryNeeds) -> PreciseContext {
  // Step 1: Analyze query requirements
  let query_analysis = analyze_query_needs(query_needs);
  
  // Step 2: Choose optimal query strategy
  let query_strategy = match query_analysis.type {
    "semantic" => use_vibe_natural_language(query_needs),
    "structural" => use_tree_sitter_syntax(query_needs), 
    "database" => use_direct_surrealdb(query_needs),
    "hybrid" => combine_query_methods(query_needs)
  };
  
  // Step 3: Execute context retrieval
  let context_result = execute_query_strategy(query_strategy);
  
  // Step 4: Calculate compression metrics
  let context_metrics = calculate_compression_metrics(context_result);
  
  // Step 5: Store query for pattern learning
  let learning_query = `CREATE query_pattern CONTENT {
    original_query: "${query_needs.query}",
    strategy_used: "${query_strategy.type}",
    results_count: ${context_result.snippets.length},
    compression_ratio: ${context_metrics.compression_ratio},
    token_savings: ${context_metrics.token_savings},
    timestamp: time::now()
  }`;
  
  execute_cli(`echo '${learning_query}' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty`);
  
  PreciseContext {
    snippets: context_result.snippets,
    lines_loaded: context_result.total_lines,
    lines_saved: context_metrics.lines_saved,
    compression_ratio: context_metrics.compression_ratio,
    token_savings: context_metrics.token_savings,
    query_time: context_result.execution_time
  }
}

fn use_vibe_natural_language(query_needs: QueryNeeds) -> QueryResult {
  // Natural language to precise code snippets
  let query_command = `vibe query "${query_needs.query}" --limit ${query_needs.limit || 5}`;
  
  if query_needs.complexity {
    query_command += ` --complexity ${query_needs.complexity}`;
  }
  
  if query_needs.session {
    query_command += ` --session ${query_needs.session}`;
  }
  
  if query_needs.file_filter {
    query_command += ` --files "${query_needs.file_filter}"`;
  }
  
  let result = execute_cli(query_command);
  
  QueryResult {
    snippets: parse_vibe_output(result),
    total_lines: count_lines(result),
    execution_time: measure_time(result),
    method: "vibe_natural_language"
  }
}

fn use_tree_sitter_syntax(query_needs: QueryNeeds) -> QueryResult {
  // Direct tree-sitter syntax queries for structural patterns
  let syntax_query = query_needs.tree_sitter_pattern;
  let query_command = `vibe query "${syntax_query}" --limit ${query_needs.limit || 3}`;
  
  let result = execute_cli(query_command);
  
  QueryResult {
    snippets: parse_vibe_output(result),
    total_lines: count_lines(result),
    execution_time: measure_time(result),
    method: "tree_sitter_syntax"
  }
}

fn use_direct_surrealdb(query_needs: QueryNeeds) -> QueryResult {
  // Direct database queries for maximum precision
  let sql_query = build_surrealdb_query(query_needs);
  let result = execute_cli(`echo '${sql_query}' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty`);
  
  let snippets = extract_snippets_from_db_result(result);
  
  QueryResult {
    snippets: snippets,
    total_lines: count_lines_in_snippets(snippets),
    execution_time: measure_time(result),
    method: "direct_surrealdb"
  }
}

fn build_surrealdb_query(query_needs: QueryNeeds) -> string {
  let base_query = "SELECT code_snippet, line_range, file_path, complexity_score FROM code_node";
  let conditions = [];
  
  // Pattern-based filtering
  if query_needs.patterns.length > 0 {
    let pattern_conditions = query_needs.patterns.map(p => `patterns CONTAINS "${p}"`);
    conditions.push(`(${pattern_conditions.join(" OR ")})`);
  }
  
  // File-based filtering
  if query_needs.file_filter {
    conditions.push(`file_path LIKE "%${query_needs.file_filter}%"`);
  }
  
  // Complexity filtering
  if query_needs.min_complexity {
    conditions.push(`complexity_score >= ${query_needs.min_complexity}`);
  }
  
  // Session filtering
  if query_needs.session {
    conditions.push(`session_id = "${query_needs.session}"`);
  }
  
  // Combine conditions
  if conditions.length > 0 {
    base_query += ` WHERE ${conditions.join(" AND ")}`;
  }
  
  // Ordering and limiting
  base_query += ` ORDER BY complexity_score DESC, indexed_at DESC LIMIT ${query_needs.limit || 5}`;
  
  base_query
}

fn calculate_compression_metrics(context_result: QueryResult) -> CompressionMetrics {
  let lines_loaded = context_result.total_lines;
  let estimated_full_file_lines = context_result.snippets.length * 1000; // Assume 1000 lines per file
  let lines_saved = estimated_full_file_lines - lines_loaded;
  let compression_ratio = lines_loaded / estimated_full_file_lines;
  
  // Token estimation (rough: 4 tokens per line)
  let tokens_loaded = lines_loaded * 4;
  let tokens_saved = lines_saved * 4;
  
  CompressionMetrics {
    lines_loaded: lines_loaded,
    lines_saved: lines_saved,
    compression_ratio: compression_ratio,
    token_savings: tokens_saved,
    efficiency_gain: lines_saved / lines_loaded
  }
}
```

## Query Examples

### Natural Language Queries (Vibe)
```bash
# Semantic queries for development context
vibe query "async functions in auth module" --limit 5
vibe query "error handling patterns" --complexity high  
vibe query "React components with useState hooks" --files "src/components"
vibe query "database connection functions" --session current
vibe query "test patterns for API endpoints" --limit 3

# Recent development context
vibe query "recent implementations" --session current --limit 5
vibe query "similar functions to authenticate" --complexity medium
vibe query "error types used in this project" --limit 10
```

### Structural Queries (Tree-sitter Syntax)
```bash
# Tree-sitter syntax for precise structural matching
vibe query "(function_declaration name: (identifier) @name)" --limit 3
vibe query "(method_definition key: (property_identifier) @method)" --limit 5
vibe query "(call_expression function: (identifier) @func)" --files "auth"
vibe query "(class_declaration name: (identifier) @class)" --limit 2

# Complex structural patterns
vibe query "(async_function (parameters) @params (block) @body)" --limit 3
vibe query "(try_statement (catch_clause) @catch)" --complexity high
```

### Direct Database Queries (SurrealDB)
```bash
# Precise pattern matching
echo 'SELECT code_snippet, line_range FROM code_node WHERE patterns CONTAINS "async" AND patterns CONTAINS "authentication" LIMIT 5' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty

# Complexity-based filtering
echo 'SELECT code_snippet, file_path FROM code_node WHERE complexity_score > 0.7 AND node_type = "function_declaration" ORDER BY complexity_score DESC LIMIT 3' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty

# Session-specific context
echo 'SELECT code_snippet, patterns FROM code_node WHERE session_id = "current" AND indexed_at > time::now() - 1h LIMIT 10' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty

# File-specific patterns
echo 'SELECT code_snippet, line_range FROM code_node WHERE file_path LIKE "%auth%" AND patterns CONTAINS "error_handling" LIMIT 5' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty
```

## Context Efficiency Examples

### Before (Traditional Approach)
```pseudo
// Loading entire files - 200,000 tokens!
let auth_file = read_file("src/auth.ts");        // 1,000 lines
let utils_file = read_file("src/utils.ts");      // 800 lines  
let types_file = read_file("src/types.ts");      // 600 lines
let config_file = read_file("src/config.ts");    // 400 lines
// Total: 2,800 lines = ~11,200 tokens

// Looking for: 3 async functions, 2 error patterns
// Relevance: ~15 lines out of 2,800 lines (0.5% relevant!)
```

### After (Optimized Approach)
```pseudo
// Optimized: Precise 15-line context - 60 tokens!
let auth_patterns = execute_cli("vibe query 'async auth functions' --limit 3");
// Returns: 8 lines of precise async function snippets

let error_patterns = execute_cli("vibe query 'error handling in auth' --limit 2");  
// Returns: 7 lines of precise error handling patterns

// Total: 15 lines = ~60 tokens
// Compression ratio: 99.5% reduction!
// Relevance: 100% (every line is relevant)
```

## Context Budget Tracking

```pseudo
fn track_context_budget(query_result: PreciseContext) {
  let budget_update = `UPDATE session:current SET 
    context_budget.used += ${query_result.snippets.length * 4}, // ~4 tokens per line
    context_budget.saved += ${query_result.token_savings},
    context_efficiency = ${query_result.compression_ratio}`;
    
  execute_cli(`echo '${budget_update}' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty`);
  
  // Track compression metrics
  let metrics_query = `CREATE context_metric CONTENT {
    query_type: "${query_result.method}",
    lines_loaded: ${query_result.lines_loaded},
    lines_saved: ${query_result.lines_saved}, 
    compression_ratio: ${query_result.compression_ratio},
    token_savings: ${query_result.token_savings},
    timestamp: time::now()
  }`;
  
  execute_cli(`echo '${metrics_query}' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty`);
}
```

## Benefits

- **100x Context Compression**: 15 lines instead of 1,500 lines
- **Surgical Precision**: Every line is relevant to the query
- **Multiple Query Methods**: Natural language, syntax, and direct SQL
- **Real-Time**: Query newly indexed code immediately
- **Learning System**: Queries improve based on usage patterns

## Context Links

- [tree-indexing.md] - How patterns get indexed for querying
- [tools.md] - CLI command patterns and examples
- [SurrealDB Queries] - Advanced database query techniques
- [Vibe Query Syntax] - Natural language and tree-sitter patterns