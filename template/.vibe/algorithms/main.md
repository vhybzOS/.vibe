#!/grammars/pseudo-kernel parse

# Main Algorithm - Axior OS Entry Point

## Boot Sequence Integration

LLM-native entry point for Axior OS v2 system algorithms.

## Algorithm

```pseudo
fn main(user_request: string, session_state: SessionState) -> Result<SessionUpdate, VibeError> {
  // Step 1: Check current session state with direct SurrealDB query
  let session_query = "SELECT * FROM session:current ORDER BY updated DESC LIMIT 1";
  let current_session = execute_cli(`echo '${session_query}' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty`);
  
  // Step 2: Determine stage using direct database queries
  let active_work_query = "SELECT stage, status, current_algorithm FROM session:current";
  let active_work = execute_cli(`echo '${active_work_query}' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty`);
  
  let next_algorithm = if active_work.records.empty {
    // No active work - get specs protocol guidance
    let specs_guidance = execute_cli("vibe query 'specs protocol fetch or ask pattern' --limit 1");
    execute_cli("vibe query 'specs-stage.md algorithm content' --limit 1");
    "specs-stage"
  } else if active_work.records[0].stage == "specs" && active_work.records[0].status == "approved" {
    // Specs approved - get development protocol
    let dev_guidance = execute_cli("vibe query 'dev-10step algorithm initialization' --limit 1");
    "dev-10step"
  } else if active_work.records[0].stage == "development" && active_work.records[0].interrupted {
    // Resume interrupted development - get session management protocol
    let resume_guidance = execute_cli("vibe query 'session management resumption algorithm' --limit 1");
    "session-mgmt"
  } else {
    // Continue current work
    active_work.records[0].current_algorithm || "dev-10step"
  };
  
  // Step 3: Get algorithm content dynamically and execute
  let algorithm_content = execute_cli(`vibe query '${next_algorithm}.md algorithm implementation' --limit 1`);
  
  // Step 4: Update session state with direct CLI
  let session_update = `UPDATE session:current SET {
    stage: "${determine_stage(next_algorithm)}",
    current_algorithm: "${next_algorithm}",
    user_request: "${user_request}",
    updated: time::now()
  }`;
  
  execute_cli(`echo '${session_update}' | surreal sql --conn http://localhost:8000 --user root --pass root --ns axior --db code --pretty`);
  
  // Step 5: Execute selected algorithm with dynamic content
  let execution_result = execute_algorithm(next_algorithm, algorithm_content, user_request);
  
  return SessionUpdate {
    algorithm: next_algorithm,
    status: "executing", 
    context_loaded: algorithm_content.snippets.length,
    execution_result: execution_result
  };
}

fn determine_stage(algorithm: string) -> string {
  match algorithm {
    "specs-stage" => "specs",
    "dev-10step" => "development", 
    "session-mgmt" => "resumption",
    _ => "development"
  }
}
```

## Context Links

- [specs-stage.md] - Specification generation algorithm
- [dev-10step.md] - Enhanced 10-step development cycle with protocol integration
- [session-mgmt.md] - Context resumption with CLI primitives
- [protocols/] - Dynamic protocol access via vibe query
- [.vibe/code.db] - SurrealDB for all data storage (sessions, archives, patterns)
