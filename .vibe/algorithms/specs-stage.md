# Specs Stage Algorithm - Specification Generation

#!/grammars/pseudo-typescript parse

## Purpose

Generate comprehensive specifications and high-level algorithms from user requests using expanded context.

## Algorithm

```pseudo
INPUT: user_request: string, project_context: ProjectContext

# Step 1: Spawn specs subagent with expanded context
expanded_context = query_full_codebase(db)
specs_agent = spawn_subagent("specs", {
  context_limit: 200000,  # 3-4x normal limit
  initial_context: expanded_context,
  user_request: user_request
})

# Step 2: Comprehensive analysis
codebase_analysis = specs_agent.analyze_existing_code()
requirements_analysis = specs_agent.extract_requirements(user_request)
constraints_analysis = specs_agent.identify_constraints(project_context)

# Step 3: Generate specification
specs_content = specs_agent.generate_specs({
  grammar: "specs",
  template: load_specs_template(),
  analysis: {
    codebase: codebase_analysis,
    requirements: requirements_analysis, 
    constraints: constraints_analysis
  }
})

# Step 4: Generate high-level algorithm
high_level_algorithm = specs_agent.generate_algorithm({
  grammar: "pseudo-typescript",
  specs: specs_content,
  project_patterns: codebase_analysis.patterns
})

# Step 5: Save artifacts
specs_file = save_specs(".vibe/specs/", specs_content)
algorithm_file = save_algorithm(".vibe/algorithms/", high_level_algorithm)

# Step 6: Present for approval
approval_result = present_for_approval({
  specs: specs_file,
  algorithm: algorithm_file,
  estimated_complexity: specs_agent.estimate_complexity()
})

# Step 7: Update session state
IF approval_result.approved THEN
  session_update = {
    stage: "specs",
    status: "approved",
    next_stage: "development",
    specs_file: specs_file,
    algorithm_file: algorithm_file
  }
ELSE
  session_update = {
    stage: "specs", 
    status: "revision_needed",
    feedback: approval_result.feedback
  }
END

OUTPUT: session_update, specs_file, algorithm_file
```

## Context Links

- [.vibe/specs/] - Generated specifications storage
- [.vibe/grammars/specs.grammar] - Specification grammar definition
- [Agent tool] - Subagent spawning for expanded context
- [SurrealDB queries] - Codebase analysis and storage
