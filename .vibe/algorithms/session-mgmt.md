# Session Management Algorithm - Smart Context Resumption

#!/grammars/pseudo-typescript parse

## Purpose

Handle context interruptions and enable intelligent resumption with minimal context requirements.

## Algorithm

```pseudo
INPUT: checkpoint: Checkpoint, target_step: number

# Step 1: Analyze checkpoint for context requirements
checkpoint_analysis = analyze_checkpoint(checkpoint)
step_dependencies = query_step_dependencies(target_step)

# Step 2: Determine minimal context needed
required_context = calculate_minimal_context({
  step: target_step,
  completed_work: checkpoint.completed_work,
  dependencies: step_dependencies,
  specs_reference: checkpoint.specs_file
})

# Step 3: Query for selective context
minimal_context_query = build_context_query(required_context)
selective_context = query_database(db, minimal_context_query)

# Example queries for different steps:
CASE target_step OF
  1,2,3: # Early steps need specs + project patterns
    context_query = """
      SELECT * FROM specs WHERE feature = $current_feature
      UNION
      SELECT * FROM code WHERE type = "pattern" AND relevance > 0.8
      UNION  
      SELECT * FROM tests WHERE type = "template"
    """
    
  6,7,8: # Later steps need implementation context + validation
    context_query = """
      SELECT * FROM code WHERE modified_in_session = true
      UNION
      SELECT * FROM tests WHERE status = "passing" 
      UNION
      SELECT api_surface FROM specs WHERE feature = $current_feature
    """
    
  9: # Algorithm generation needs full implementation view
    context_query = """
      SELECT * FROM code WHERE modified_in_session = true
      UNION
      SELECT * FROM implementation_patterns 
      UNION
      SELECT architecture FROM project_analysis
    """
END

# Step 4: Compress context intelligently  
compressed_context = compress_context({
  selective_context: selective_context,
  focus_area: step_dependencies.focus_area,
  compression_ratio: 0.7  # Target 30% of original size
})

# Step 5: Spawn new subagent with minimal context
resumed_agent = spawn_subagent("development_resume", {
  context_limit: calculate_needed_limit(compressed_context),
  initial_context: compressed_context,
  checkpoint: checkpoint,
  target_step: target_step
})

# Step 6: Resume execution from target step
resumption_result = resumed_agent.continue_from_step(target_step)

# Step 7: Validate resumption success
validation_metrics = {
  context_preserved: calculate_context_overlap(checkpoint.context, compressed_context),
  step_continuity: validate_step_continuity(checkpoint, resumption_result),
  quality_maintained: compare_output_quality(checkpoint.expected, resumption_result.actual)
}

# Step 8: Update session with resumption data
session_update = {
  stage: "development",
  status: "resumed",
  current_step: target_step,
  resumption_metrics: validation_metrics,
  context_efficiency: compressed_context.size / checkpoint.context.size
}

# Step 9: Continue with original algorithm
IF validation_metrics.step_continuity.valid THEN
  # Hand back control to dev-9step.md
  EXECUTE dev_9step_algorithm(resumption_result.context, target_step)
ELSE
  # Resumption failed, need to restart from earlier checkpoint
  fallback_checkpoint = find_previous_valid_checkpoint(checkpoint)
  EXECUTE session_mgmt_algorithm(fallback_checkpoint, fallback_checkpoint.step)
END

OUTPUT: session_update, resumption_result
```

## Math

```latex
context_{minimal} = \bigcup_{d \in dependencies} context\_required(d)
compression\_ratio = \frac{|context_{compressed}|}{|context_{original}|}
resumption\_success = overlap(context_{checkpoint}, context_{resumed}) > 0.8
```

## Context Links

- [dev-9step.md] - Primary development algorithm
- [.vibe/code.db] - Checkpoint and context storage
- [Agent tool] - Subagent spawning for resumption
- [context compression] - Intelligent context reduction techniques
