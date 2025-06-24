#!/grammars/pseudo-kernel parse

# Specs Stage Algorithm - Specification Generation

## Purpose

Generate comprehensive specifications and high-level algorithms from user requests using expanded context.

## Algorithm

```pseudo
fn specs_stage(user_request: string, project_context: ProjectContext) -> Result<SessionUpdate, VibeError> {
  // Step 1: Use specs protocol for fetch-or-ask pattern
  let specs_protocol = execute_cli("vibe query 'specs protocol algorithm' --limit 1");
  let (specs_content, high_level_algorithm) = execute_specs_protocol();
  
  // Step 2: Check if existing specs are available
  let existing_specs_query = "SELECT * FROM specs WHERE status = 'active' ORDER BY created DESC LIMIT 1";
  let existing_specs = execute_cli(`echo '${existing_specs_query}' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty`);
  
  if existing_specs.records.empty {
    // ASK: No specs found, gather requirements from user
    let requirements = ask_user(user_request);
    
    // Generate specs using tree-sitter validation
    let specs_content = generate_specs_grammar(requirements);
    
    // Validate with tree-sitter
    let parse_result = execute_cli(`tree-sitter parse .vibe/specs/current.md --quiet`);
    if parse_result.error {
      return Err(VibeError::SpecsParseError(parse_result.error));
    }
    
    // Store specs in SurrealDB using direct CLI
    let create_query = `CREATE specs:current CONTENT {
      feature_name: "${requirements.feature}",
      content: ${JSON.stringify(specs_content)},
      status: "active",
      created: time::now(),
      ast_validated: true,
      user_request: "${user_request}"
    }`;
    execute_cli(`echo '${create_query}' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty`);
    
    // Generate high-level algorithm from specs
    let algorithm_content = generate_algorithm_from_specs(specs_content);
    
    // Index with vibe for future queries
    execute_cli("vibe index --path .vibe/specs/ .vibe/algorithms/");
    
  } else {
    // FETCH: Load existing specs from database
    let specs_record = existing_specs.records[0];
    specs_content = specs_record.content;
    
    // Get associated algorithm using vibe query
    let algorithm_result = execute_cli("vibe query 'high level algorithm for current specs' --limit 1");
    high_level_algorithm = algorithm_result.snippets[0];
  }
  
  // Step 3: Present for approval using direct database storage
  let approval_query = `CREATE approval_request CONTENT {
    specs_id: "specs:current",
    specs_preview: ${JSON.stringify(get_specs_preview(specs_content))},
    algorithm_preview: ${JSON.stringify(get_algorithm_preview(high_level_algorithm))},
    estimated_complexity: ${calculate_complexity(specs_content)},
    created: time::now(),
    status: "pending"
  }`;
  execute_cli(`echo '${approval_query}' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty`);
  
  // Step 4: Wait for approval and update session state
  let approval_result = await_user_approval();
  
  let session_update = if approval_result.approved {
    // Update specs status
    execute_cli(`echo 'UPDATE specs:current SET status = "approved", approved_at = time::now()' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty`);
    
    SessionUpdate {
      stage: "specs",
      status: "approved", 
      next_stage: "development",
      specs_content: specs_content,
      algorithm_content: high_level_algorithm
    }
  } else {
    // Mark for revision
    execute_cli(`echo 'UPDATE specs:current SET status = "revision_needed", feedback = "${approval_result.feedback}"' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty`);
    
    SessionUpdate {
      stage: "specs",
      status: "revision_needed", 
      feedback: approval_result.feedback
    }
  };

  Ok(session_update)
}
```

## Context Links

- [protocols/specs.md] - Specs protocol for fetch-or-ask pattern
- [protocols/tools.md] - CLI command documentation and examples
- [.vibe/specs/] - Generated specifications storage
- [.vibe/grammars/specs.grammar] - Specification grammar definition
- [.vibe/code.db] - SurrealDB for specs and approval storage
