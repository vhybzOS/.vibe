#!/grammars/pseudo-kernel parse

# Specs Stage Algorithm - Specification Generation

## Purpose

Generate comprehensive specifications and high-level algorithms from user requests using expanded context.

## Algorithm

```pseudo
fn specs_stage(user_request: string, project_context: ProjectContext) -> Result<SessionUpdate, VibeError> {
  // Step 1: Spawn specs subagent with expanded context
  let expanded_context = query_full_codebase(db);
  let specs_agent = spawn_subagent("specs", {
    context_limit: 200000,  // 3-4x normal limit
    initial_context: expanded_context,
    user_request
  });

  // Step 2: Comprehensive analysis
  let codebase_analysis = specs_agent.analyze_existing_code();
  let requirements_analysis = specs_agent.extract_requirements(user_request);
  let constraints_analysis = specs_agent.identify_constraints(project_context);

  // Step 3: Generate specification
  let specs_content = specs_agent.generate_specs({
    grammar: "specs",
    template: load_specs_template(),
    analysis: {
      codebase: codebase_analysis,
      requirements: requirements_analysis, 
      constraints: constraints_analysis
    }
  });

  // Step 4: Generate high-level algorithm
  let high_level_algorithm = specs_agent.generate_algorithm({
    grammar: "pseudo-kernel",
    specs: specs_content,
    project_patterns: codebase_analysis.patterns
  });

  // Step 5: Save artifacts
  let specs_file = save_specs(".vibe/specs/", specs_content);
  let algorithm_file = save_algorithm(".vibe/algorithms/", high_level_algorithm);

  // Step 6: Present for approval
  let approval_result = present_for_approval({
    specs: specs_file,
    algorithm: algorithm_file,
    estimated_complexity: specs_agent.estimate_complexity()
  });

  // Step 7: Update session state
  let session_update = if approval_result.approved {
    SessionUpdate {
      stage: "specs",
      status: "approved",
      next_stage: "development",
      specs_file,
      algorithm_file
    }
  } else {
    SessionUpdate {
      stage: "specs", 
      status: "revision_needed",
      feedback: approval_result.feedback
    }
  };

  Ok({ session_update, specs_file, algorithm_file })
}
```

## Context Links

- [.vibe/specs/] - Generated specifications storage
- [.vibe/grammars/specs.grammar] - Specification grammar definition
- [Agent tool] - Subagent spawning for expanded context
- [SurrealDB queries] - Codebase analysis and storage
