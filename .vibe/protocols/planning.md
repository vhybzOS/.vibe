# Planning Protocol

## Algorithm

```pseudo
INPUT: user_request, current_state
ENTER planning_mode()
current_tasks = vibe scan .vibe/active/ --type tasks

IF current_tasks.empty THEN
  ask_user("What user flow should we implement first?")
ELSE  
  present_current_work(current_tasks)
END

requirements = gather_requirements(user_request)
implementation_plan = design_approach(requirements)
present_plan(implementation_plan)

approval = wait_for_user_approval()
IF approval THEN
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
