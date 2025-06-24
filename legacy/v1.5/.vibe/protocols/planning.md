# Planning Protocol

## Algorithm

```pseudo
INPUT: user_request, current_state
ENTER planning_mode()
current_tasks = vibe scan .vibe/active/ --type tasks
context_focus = vibe focus user_request --scope planning

IF current_tasks.empty THEN
  ask_user("What user flow should we implement first?")
ELSE  
  present_current_work(current_tasks)
END

problem_analysis = vibe reason user_request --context current_state
requirements = gather_requirements(problem_analysis)
related_patterns = vibe relate requirements --scope patterns
implementation_plan = vibe synthesize requirements related_patterns --format plan
predicted_outcome = vibe predict implementation_plan --context current_state
present_plan(implementation_plan, predicted_outcome)

approval = wait_for_user_approval()
IF approval THEN
  vibe cache implementation_plan --key current_session
  EXIT planning_mode()
  RETURN implementation_plan
ELSE
  GOTO requirements  
END

OUTPUT: approved_plan, ready_for_implementation
```

## Context Links

- [.vibe/active/] - current work state
- [Agent tool] - for complex sub-tasks
- [requirements gathering patterns] - structured approach templates

## Requirements Template

```markdown
**User Story**: As a [user], I want [goal] so that [benefit]
**Acceptance Criteria**: [testable outcomes]
**Technical Approach**: [architecture, files, patterns]
**Testing Strategy**: [what proves it works]
**Definition of Done**: [completion verification]
```

## Flow Control

- NEVER start coding without explicit approval
- ALWAYS enter planning mode if no active work
- Use Agent tool for complex architectural planning
