# Main Algorithm - Axior OS Entry Point

#!/grammars/pseudo-typescript parse

## Boot Sequence Integration

INPUT: user_request: string, session_state?: SessionState

## Algorithm

```pseudo
# Step 1: Initialize system
db = initialize_surrealdb(".vibe/code.db")
session = session_state || create_new_session()

# Step 2: Determine current stage  
active_work = query_active_work(db)

IF active_work.empty THEN
  # No active work - start specs stage
  stage = "specs"
  algorithm = load_algorithm("specs-stage.md")
ELSE IF active_work.stage == "specs" AND active_work.status == "approved" THEN
  # Specs approved - start development
  stage = "development" 
  algorithm = load_algorithm("dev-9step.md")
ELSE IF active_work.stage == "development" AND active_work.interrupted THEN
  # Resume interrupted development
  stage = "development_resume"
  algorithm = load_algorithm("session-mgmt.md")
ELSE
  # Continue current work
  stage = active_work.stage
  algorithm = load_algorithm(active_work.current_algorithm)
END

# Step 3: Execute appropriate algorithm
context = prepare_context(session, user_request, active_work)
result = execute_algorithm(algorithm, context)

# Step 4: Update session state
updated_session = update_session_state(session, result)
save_session(db, updated_session)

OUTPUT: result, updated_session
```

## Context Links

- [specs-stage.md] - Specification generation algorithm
- [dev-9step.md] - 9-step development cycle
- [session-mgmt.md] - Context resumption logic
- [.vibe/code.db] - SurrealDB session storage
