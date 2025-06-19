# Product Requirements Document

## Product Vision

_👋 Replace this section with your product vision_

[Describe your product's main value proposition and target users]

## Core Problem & Solution

**Problem**: [What problem does your product solve?]

**Solution**: [How does your product solve this problem?]

**Key Promise**: [What is the main benefit users get?]

## Current Implementation Status

**🎯 Current Phase**: [Phase/Sprint name]

**📋 Active Plan**: [Current implementation focus]

Use [planning mode protocol](PROTOCOLS.md#planning-mode-protocol) and [requirements gathering protocol](PROTOCOLS.md#requirements-gathering-protocol) for feature planning.

For complex work, use [thread template](PROTOCOLS.md#thread-management-protocol):

### **Thread Template Reference**

For complex implementations, copy this template from [PROTOCOLS.md](PROTOCOLS.md#thread-management-protocol):

```markdown
### **Thread**: [Name]

**Trigger**: [What caused this thread to open]
**Scope**: [What this thread covers]\
**Exit Criteria**: [How we know it's complete]
[Indented task list with status tracking using status emojis]
```

**Thread Management**: Follow [thread management protocol](PROTOCOLS.md#thread-management-protocol) with [status emojis](PROTOCOLS.md#thread-management-protocol) for progress tracking.

## Feature Roadmap

### Phase 1: Foundation

- [ ] **Feature 1**: [Description]
- [ ] **Feature 2**: [Description]
- [ ] **Feature 3**: [Description]

### Phase 2: Core Features

- [ ] **Feature A**: [Description]
- [ ] **Feature B**: [Description]
- [ ] **Feature C**: [Description]

### Phase 3: Advanced Features

- [ ] **Enhancement X**: [Description]
- [ ] **Enhancement Y**: [Description]
- [ ] **Enhancement Z**: [Description]

## Technical Requirements

### Architecture Overview

- **Runtime**: Node.js
- **Language**: TypeScript
- **Testing**: Vitest
- **Build**: TypeScript compiler (tsc)
- **Linting**: ESLint + Prettier
- **Database**: [Your database choice]
- **Deployment**: [Your deployment strategy]

### Quality Standards

- All features must pass [quality gates](PROTOCOLS.md#quality-gates)
- Follow [TDD protocol](PROTOCOLS.md#test-driven-development)
- Maintain comprehensive test coverage
- Use consistent [coding standards](PROTOCOLS.md#coding-protocols)

## Success Definition

**Phase Success**: [How you measure completion of current phase]

**Long-term Success**: [How you measure overall product success]

## Development Workflow

1. **Feature Planning**: Use [requirements gathering protocol](PROTOCOLS.md#requirements-gathering-protocol)
2. **Implementation**: Follow [8-step implementation cycle](PROTOCOLS.md#8-step-implementation-cycle)
3. **Quality Assurance**: Apply [quality gates](PROTOCOLS.md#quality-gates)
4. **Documentation**: Update this PRD and [TESTS.md](TESTS.md) as needed

---

_For detailed development protocols, see [PROTOCOLS.md](PROTOCOLS.md)_
