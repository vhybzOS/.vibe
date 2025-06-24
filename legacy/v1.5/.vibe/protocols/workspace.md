# Workspace Protocol

## Algorithm

```pseudo
INPUT: workspace_type, task_context
CASE workspace_type OF
  "temp": workspace_path = vibe temp task_context --auto_cleanup
  "scratch": scratchpad = vibe scratch task_context --ephemeral  
  "prototype": prototype_space = vibe prototype task_context --promote_option
  "branch": concept_branch = vibe branch task_context --isolated
  "merge": integration_result = vibe merge workspace_path --to main_work
END

workspace_metadata = {
  path: workspace_path,
  type: workspace_type,
  created: timestamp,
  auto_cleanup: flush_protocol_trigger,
  parent_context: task_context
}

OUTPUT: workspace_path, workspace_metadata
```

## Workspace Types

**Temp**: Temporary workspace for experimentation

- Auto-cleaned by flush protocol
- Used for TDD prototyping, quick tests
- `vibe temp <name> --auto_cleanup`

**Scratch**: Quick calculations and drafts

- Ephemeral scratchpad space
- Used for reasoning, math, notes
- `vibe scratch <content> --ephemeral`

**Prototype**: Rapid idea exploration

- Can be promoted to main work or discarded
- Used for feature prototyping
- `vibe prototype <idea> --promote_option`

**Branch**: Isolated concept exploration

- Explore ideas without affecting main work
- Can be merged back when ready
- `vibe branch <concept> --isolated`

**Merge**: Integration back to main work

- Intelligent combination of workspace results
- Validates before integration
- `vibe merge <workspace> --to main`

## Context Links

- [.vibe/active/] - main work context
- [flush protocol] - automatic cleanup
- [Agent tool] - complex workspace management
- [validation patterns] - merge quality checks

## Integration Points

**With TDD Protocol**: Temp workspaces for step 2 prototyping
**With Planning Protocol**: Branch workspaces for exploring alternatives\
**With Flush Protocol**: Auto-cleanup of temporary workspaces
**With Commit Protocol**: Validation before merging to main work
