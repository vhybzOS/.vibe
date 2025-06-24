#!/grammars/pseudo-kernel parse

# Specification Protocol - Fetch or Ask Pattern

## Purpose

Fetch-or-ask pattern using direct CLI primitives. Check SurrealDB for existing specs, or gather requirements from user and generate new specs using CLI tools.

## Algorithm

```pseudo
fn specs_protocol() -> Result<(SpecsContent, Algorithm), VibeError> {
  // Step 1: Direct SurrealDB query for existing specs
  let existing_query = "SELECT * FROM specs WHERE status = 'active' ORDER BY created DESC LIMIT 1";
  let existing_result = execute_cli(`echo '${existing_query}' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty`);
  
  if existing_result.records.empty {
    // ASK: No specs found, gather requirements
    let requirements = ask_user("What feature should we implement?");
    
    // Generate specs using tree-sitter for validation
    let specs_content = generate_specs_grammar(requirements);
    let specs_file = ".vibe/specs/current.md";
    
    // Parse with tree-sitter to validate grammar
    let parse_result = execute_cli(`tree-sitter parse ${specs_file} --quiet`);
    if parse_result.error {
      return Err(VibeError::SpecsParseError(parse_result.error));
    }
    
    // Store in SurrealDB using direct CLI
    let create_query = `CREATE specs:current CONTENT {
      feature_name: "${requirements.feature}",
      content_path: "${specs_file}",
      status: "active",
      created: time::now(),
      ast_validated: true,
      requirements: ${JSON.stringify(requirements)}
    }`;
    
    execute_cli(`echo '${create_query}' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty`);
    
    // Generate high-level algorithm
    let algorithm = generate_algorithm(specs_content);
    let algorithm_file = ".vibe/algorithms/high-level.md";
    
    // Index algorithm with vibe
    execute_cli(`vibe index --path .vibe/algorithms/`);
    
    Ok((specs_content, algorithm))
    
  } else {
    // FETCH: Load existing specs using direct queries
    let specs_record = existing_result.records[0];
    let specs_file = specs_record.content_path;
    
    // Use vibe query to get specs content efficiently 
    let specs_query_result = execute_cli(`vibe query "specification content from ${specs_file}" --limit 1`);
    let specs_content = specs_query_result.snippets[0];
    
    // Get associated algorithm using tree-sitter query
    let algorithm_query = "(function_declaration name: (identifier) @name) @algorithm";
    let algorithm_result = execute_cli(`tree-sitter query .vibe/grammars/pseudo-kernel queries/algorithms.scm ${specs_record.algorithm_file || ".vibe/algorithms/high-level.md"}`);
    
    let algorithm = parse_algorithm_from_ast(algorithm_result);
    
    Ok((specs_content, algorithm))
  }
}

fn generate_specs_grammar(requirements: UserRequirements) -> SpecsContent {
  // Use CLI tools to validate and structure specs
  let specs_template = `#!/grammars/specs parse

# Feature: ${requirements.feature}

## Intent
${requirements.intent}

## Inputs
${requirements.inputs.map(i => `${i.name}: ${i.type}`).join('\n')}

## Outputs  
SUCCESS: ${requirements.success_output}
FAILURE: ${requirements.failure_cases.join(' | ')}

## Examples
${requirements.examples.join('\n')}

## Constraints
${requirements.constraints.join('\n')}

## Invariants
${requirements.invariants.join('\n')}`;

  // Write and validate with tree-sitter
  write_file(".vibe/specs/current.md", specs_template);
  
  SpecsContent {
    content: specs_template,
    file_path: ".vibe/specs/current.md",
    validated: true
  }
}

fn generate_algorithm(specs: SpecsContent) -> Algorithm {
  // Extract algorithm patterns using vibe query
  let pattern_query = execute_cli(`vibe query "algorithm patterns for ${specs.feature_type}" --limit 3`);
  let existing_patterns = pattern_query.snippets;
  
  // Generate algorithm based on specs and patterns
  let algorithm_content = `#!/grammars/pseudo-kernel parse

# High-Level Algorithm: ${specs.feature_name}

## Purpose
Implement ${specs.feature_name} according to specifications

## Algorithm

\`\`\`pseudo
fn ${specs.function_name}(${specs.inputs}) -> Result<${specs.success_type}, ${specs.error_type}> {
  // Step 1: Get implementation context
  let context = execute_cli("vibe query 'similar ${specs.feature_type} implementations' --limit 5");
  
  // Step 2: Validate inputs
  let validation = validate_inputs(${specs.inputs});
  if validation.error {
    return Err(${specs.validation_error});
  }
  
  // Step 3: Core implementation (patterns from context)
  ${generate_core_logic(existing_patterns, specs)}
  
  // Step 4: Return success result
  Ok(${specs.success_return})
}
\`\`\`

## Context Links
- [${specs.file_path}] - Complete specification
- [Implementation patterns] - Retrieved via vibe query
- [Similar features] - Context for development`;

  Algorithm {
    content: algorithm_content,
    file_path: ".vibe/algorithms/high-level.md",
    validated: true
  }
}
```

## CLI Command Patterns

### SurrealDB Operations
```bash
# Query existing specs
echo 'SELECT * FROM specs WHERE status = "active"' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty

# Create new specs record
echo 'CREATE specs:current CONTENT {feature_name: "auth", status: "active", created: time::now()}' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty

# Update specs status
echo 'UPDATE specs:current SET status = "completed"' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty
```

### Tree-sitter Operations
```bash
# Validate specs grammar
tree-sitter parse .vibe/specs/current.md --quiet

# Extract algorithm structure  
tree-sitter query .vibe/grammars/pseudo-kernel queries/algorithms.scm .vibe/algorithms/high-level.md

# Generate grammar if needed
cd .vibe/grammars/specs && tree-sitter generate
```

### Vibe Operations
```bash
# Query for specs content
vibe query "specification content from current feature" --limit 1

# Query for algorithm patterns
vibe query "algorithm patterns for authentication" --limit 3

# Index new specs and algorithms
vibe index --path .vibe/specs/ .vibe/algorithms/
```

## Benefits

- **Zero File Reading**: Use `vibe query` for precise specs content
- **Direct Database**: SurrealDB CLI for state management
- **AST Validation**: Tree-sitter ensures grammar correctness
- **Pattern Reuse**: Query existing implementations for guidance
- **Real-time Indexing**: Immediate availability for context queries

## Context Links

- [tools.md] - CLI command documentation and examples
- [SurrealDB Schema] - Database structure for specs and algorithms
- [Tree-sitter Grammars] - Grammar validation for specs format
- [Algorithm Generation] - Patterns for creating high-level algorithms