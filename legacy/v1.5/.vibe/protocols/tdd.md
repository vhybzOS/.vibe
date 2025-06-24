# TDD Protocol

## Algorithm

```pseudo
INPUT: feature_requirements, implementation_plan
prototype_workspace = vibe temp tdd_cycle --auto_cleanup

# 8-Step Implementation Cycle
FOR step IN [1..8] DO
  step_focus = vibe focus step --context current_cycle
  CASE step OF
    1: tests = write_tests_first(feature_requirements)
    2: prototype = vibe prototype feature_requirements --workspace temp
       minimal_code = write_minimal_implementation(tests, prototype)
    3: extended_code = extend_incrementally(minimal_code)
       tuned_approach = vibe tune tdd_protocol --context extended_code
    4: runtime_result = verify_runtime(extended_code)
    5: evolved_tests = evolve_tests(runtime_result, tests)
    6: reverify_result = reverify_runtime(evolved_tests)
    7: quality_result = check_quality_gates()
       validation_result = vibe validate quality_result --against feature_requirements
    8: next_increment = loop_or_complete(validation_result)
       performance_profile = vibe profile current_cycle --optimize_next
  END
  
  IF step == 8 AND feature_complete THEN
    vibe merge prototype_workspace --to production
    TRIGGER flush_protocol()
    BREAK
  END
END

OUTPUT: production_ready_feature, passing_tests, clean_code
```

## Math

```latex
confidence(feature) = ∏_{i=1}^{n} test_i.pass_rate × quality_gates.score
cycle_efficiency = features_completed / total_cycles_run
```

## Context Links

- [@tested_by annotations] - implementation-test linking
- [tests/unit/, tests/integration/, tests/user/] - test organization
- [quality gates checklist] - never skip verification

## Test Organization

```
tests/
├── unit/        # Individual functions, pure logic
├── integration/ # Component interaction  
├── user/        # Complete workflows, CLI behavior
└── utils.ts     # Shared test utilities
```

## Quality Gates (Never Skip)

- `deno task check` → 0 TypeScript errors
- `deno task lint` → 0 violations
- All relevant tests passing
- Manual verification of core functionality
