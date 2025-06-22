# TDD Protocol

## Algorithm

```pseudo
INPUT: feature_requirements, implementation_plan

# 8-Step Implementation Cycle
FOR step IN [1..8] DO
  CASE step OF
    1: tests = write_tests_first(feature_requirements)
    2: minimal_code = write_minimal_implementation(tests)
    3: extended_code = extend_incrementally(minimal_code)
    4: runtime_result = verify_runtime(extended_code)
    5: evolved_tests = evolve_tests(runtime_result, tests)
    6: reverify_result = reverify_runtime(evolved_tests)
    7: quality_result = check_quality_gates()
    8: next_increment = loop_or_complete(quality_result)
  END
  
  IF step == 8 AND feature_complete THEN
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
