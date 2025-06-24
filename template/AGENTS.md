# AGENTS.md - Axior OS v2 Kernel

**Axior OS**: Algorithmic eXecution & Iterative Observation Refinement

## 🧠 Boot Sequence

1. `vibe index` - Initialize SurrealDB, parse codebase
2. `vibe session load` - Restore or create session state
3. Execute `.vibe/algorithms/main.md` - Run current algorithm

## 🔄 Operating Philosophy

Agent-refactorable algorithms stored in `.vibe/algorithms/`
Context managed via SurrealDB queries\
Subagents spawn with selective context resumption

## 🎯 Core Algorithms

- `main.md` - Entry point and stage orchestration
- `specs-stage.md` - Specification generation with expanded context
- `dev-9step.md` - Enhanced 9-step development cycle
- `session-mgmt.md` - Smart context resumption

## 📊 Success Metrics

- Boot time: <50 tokens (vs v1: 100)
- Context efficiency: >90% compression ratio
- Resumption success: 99% accurate context restoration

---

**Design Philosophy**: Every token serves intelligence. Every algorithm is agent-refactorable. Every resumption preserves cognitive continuity.
