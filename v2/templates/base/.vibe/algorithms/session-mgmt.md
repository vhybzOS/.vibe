#!/grammars/pseudo-kernel parse

# Session Management Algorithm - Smart Context Resumption

## Purpose

Handle context interruptions and enable intelligent resumption with minimal context requirements.

## Algorithm

```pseudo
fn session_mgmt(checkpoint: Checkpoint, target_step: number) -> Result<SessionUpdate, VibeError> {
  // Step 1: Analyze checkpoint for context requirements
  let checkpoint_analysis = analyze_checkpoint(checkpoint);
  let step_dependencies = query_step_dependencies(target_step);

  // Step 2: Determine minimal context needed
  let required_context = calculate_minimal_context({
    step: target_step,
    completed_work: checkpoint.completed_work,
    dependencies: step_dependencies,
    specs_reference: checkpoint.specs_file
  });

  // Step 3: Query for selective context with intelligent pattern matching
  let context_query = match target_step {
    1..3 => {
      // Early steps need specs + project patterns
      """
        SELECT * FROM specs WHERE feature = $current_feature
        UNION
        SELECT * FROM code WHERE type = "pattern" AND relevance > 0.8
        UNION  
        SELECT * FROM tests WHERE type = "template"
      """
    },
    
    6..8 => {
      // Later steps need implementation context + validation
      """
        SELECT * FROM code WHERE modified_in_session = true
        UNION
        SELECT * FROM tests WHERE status = "passing" 
        UNION
        SELECT api_surface FROM specs WHERE feature = $current_feature
      """
    },
    
    9 => {
      // Algorithm generation needs full implementation view
      """
        SELECT * FROM code WHERE modified_in_session = true
        UNION
        SELECT * FROM implementation_patterns 
        UNION
        SELECT architecture FROM project_analysis
      """
    }
  };
  
  let selective_context = query_database(db, context_query);

  // Step 4: Compress context intelligently  
  let compressed_context = compress_context({
    selective_context,
    focus_area: step_dependencies.focus_area,
    compression_ratio: 0.7  // Target 30% of original size
  });

  // Step 5: Spawn new subagent with minimal context
  let resumed_agent = spawn_subagent("development_resume", {
    context_limit: calculate_needed_limit(compressed_context),
    initial_context: compressed_context,
    checkpoint,
    target_step
  });

  // Step 6: Resume execution from target step
  let resumption_result = resumed_agent.continue_from_step(target_step);

  // Step 7: Validate resumption success
  let validation_metrics = {
    context_preserved: calculate_context_overlap(checkpoint.context, compressed_context),
    step_continuity: validate_step_continuity(checkpoint, resumption_result),
    quality_maintained: compare_output_quality(checkpoint.expected, resumption_result.actual)
  };

  // Step 8: Update session with resumption data
  let session_update = SessionUpdate {
    stage: "development",
    status: "resumed",
    current_step: target_step,
    resumption_metrics: validation_metrics,
    context_efficiency: compressed_context.size / checkpoint.context.size
  };

  // Step 9: Continue with original algorithm
  if validation_metrics.step_continuity.valid {
    // Hand back control to dev-9step.md
    execute(dev_9step_algorithm, { context: resumption_result.context, target_step });
    Ok(session_update)
  } else {
    // Resumption failed, need to restart from earlier checkpoint
    let fallback_checkpoint = find_previous_valid_checkpoint(checkpoint);
    session_mgmt(fallback_checkpoint, fallback_checkpoint.step)
  }
}
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
