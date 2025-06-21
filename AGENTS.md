# AGENTS.md - .vibe Development OS

The main entry point for AI agents working with the .vibe project.

## 🚀 Quick Start

1. **Read this file completely**
2. **Check `.vibe/PRD.md`** for active work and planned features
3. **Follow `.vibe/PROTOCOLS.md`** for all development workflows
4. **Use `.vibe/FEATURES.md`** to understand existing architecture
5. **Reference `.vibe/TESTS.md`** for current test strategy (stop at "Past Tests")

## 🎯 Core Mission

Build a local-first, autonomous AI development environment using functional programming principles, Effect-TS composition, and test-driven development. Every line of code should be a joy to read, maintain, and extend.

## 📁 OS File Structure

- **`.vibe/PRD.md`**: Active tasks only (keep under 150 lines)
- **`.vibe/FEATURES.md`**: Completed features reference for architecture understanding
- **`.vibe/PROTOCOLS.md`**: All development protocols and coding standards
- **`.vibe/TESTS.md`**: Current test strategy (agent stops reading at "Past Tests")
- **`CHANGELOG.md`**: User-facing changes only

## 🔄 Core Workflow

### New Session Protocol

1. Check active tasks in `.vibe/PRD.md`
2. Enter [planning mode](/.vibe/PROTOCOLS.md#planning-mode-protocol) if no active work
3. Ask: "What user flow should we implement first?"
4. Follow [8-step implementation cycle](/.vibe/PROTOCOLS.md#8-step-implementation-cycle)
5. Run [Flush Protocol](/.vibe/PROTOCOLS.md#flush-protocol) when feature complete

### Key Development Principles

- **Effect-TS for all async operations** - Use [Effect-TS patterns](/.vibe/PROTOCOLS.md#effect-ts-patterns)
- **Test-first development** - Follow [TDD protocol](/.vibe/PROTOCOLS.md#test-driven-development)
- **Quality gates at each step** - Never skip [quality gate checklist](/.vibe/PROTOCOLS.md#quality-gates)
- **Archive completed work** - Use Flush Protocol to keep PRD.md lean

### Architectural Excellence

- **Functional Programming**: Pure functions, immutable data, Effect-TS composition
- **Service-Oriented**: Stateless services with clear dependencies
- **Tagged Union Errors**: Specific error types with context
- **Test-Implementation Linking**: `@tested_by` annotations in all files

## 🏗️ Project Status

**Current State**: All major features complete and production ready

- ✅ Library documentation fetcher (`vibe code <package>`)
- ✅ Template scaffolding (`vibe init <runtime>`)
- ✅ Cross-platform binary installer
- ✅ 210 tests passing, 0 failures

**Technology Stack**: Deno, Effect-TS, TypeScript, Zod, functional programming patterns

**Success Metrics**:

- Zero TypeScript compilation errors
- Zero lint violations
- All tests passing
- Features working at runtime
- Architectural consistency

## 📋 Next Steps

When no active work exists in PRD.md:

1. Enter planning mode explicitly
2. Ask user what to implement next
3. Consider Phase 2: Enhanced command interface (`vibe code hono --list`)
4. Follow [requirements gathering protocol](/.vibe/PROTOCOLS.md#requirements-gathering-protocol)
5. Get approval before any implementation

## 🎯 Quality Standards

Every session must achieve:

- `deno task check` passes (0 TypeScript errors)
- `deno task lint` passes (0 violations)
- `deno task test` passes (all tests green)
- Manual verification of core functionality
- Clean, maintainable code with proper patterns

---

**Remember**: Consistency over cleverness. Predictability over performance. Quality over quantity.

See `.vibe/PROTOCOLS.md` for complete development protocols and coding standards.
