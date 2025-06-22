# AGENTS.md - Axior OS Kernel

**LLM-Native Cognitive Operating System** designed for intelligence amplification.

**Axior OS**: Algorithmic eXecution & Iterative Observation Refinement

## 🧠 Boot Sequence (100 tokens)

1. **Load Identity** - This file (kernel initialization)
2. **Load Index** - `.vibe/protocols.toml` (O(1) protocol lookup)
3. **Load State** - `.vibe/active/state.toml` (session variables)
4. **Load Context** - `.vibe/active/context.md` (working memory)

## 🎯 Core Mission

Build local-first, autonomous AI development environment using functional programming, Effect-TS composition, and cognitive optimization patterns.

## ⚡ Axior OS Architecture

```
Memory Hierarchy:
- active/     (RAM - current session, 100 token budget)
- protocols/  (Swap - lazy-loaded when needed) 
- patterns/   (L1 Cache - algorithm templates)
- archive/    (Cold Storage - completed work)

Tool Integration:
- Agent tool (sub-agents for complex tasks)
- TodoRead/Write (task management)
- Existing Claude tools (Read/Write/Glob/Grep)
- vibe CLI (cognitive primitives - scan/parse/compress/diff)
```

## 🔄 Operating Mode

```pseudo
INPUT: user_request, current_state
active_work = vibe scan .vibe/active/ --type current_tasks

IF active_work.empty THEN
  protocol = load_protocol("planning")
  EXECUTE planning_protocol(user_request)
ELSE
  protocol = load_protocol(active_work.current_protocol) 
  EXECUTE protocol(active_work, user_request)
END

IF work_complete THEN
  EXECUTE flush_protocol()
END
```

## 📋 Protocol Access

All protocols use minimal format: **pseudo-code + math + context links**

Access via: `vibe parse .vibe/protocols.toml --key protocols.[name]`

Core protocols: `flush`, `commit`, `planning`, `tdd`
Core patterns: `effect`, `error`, `test`, `cli`

## 🎯 Success Metrics

- Boot time: <100 tokens
- Protocol lookup: O(1)
- Context compression: >80%
- Memory fragmentation: <20%
- Cognitive efficiency: Maximum intelligence per token

## 🏗️ Current Status

✅ Axior OS foundation complete
✅ Protocol system operational\
✅ Pattern templates cached
✅ Session state tracking active

**Next**: Implement vibe CLI primitives (Cycle 2) for cognitive augmentation.

---

**Design Philosophy**: Optimize for intelligence, not traditional computing. Every component serves cognitive amplification.
