# .vibe Project Templates

Project scaffolding templates for the `.vibe` universal developer tool orchestrator.

## Template Structure

This directory contains starter templates for different runtime environments:

- **`deno-template/`** - Deno + TypeScript project template
- **`node-template/`** - Node.js + TypeScript project template

## Template Usage

Templates are used by the `vibe init <runtime>` command:

```bash
vibe init node myproject    # Creates project from node-template/
vibe init deno myproject    # Creates project from deno-template/
```

## File Conventions

### .template File Convention

**Problem**: Some template files contain imports/syntax that conflict with the main `.vibe` build process (e.g., Node.js files with `vitest` imports that Deno can't resolve during compilation).

**Solution**: Use `.template` suffix for problematic files.

**Convention**:

- Template files ending in `.template` are automatically renamed during scaffolding
- Example: `integration.test.ts.template` → `integration.test.ts` in scaffolded project
- Preserves template functionality while avoiding build conflicts

**Implementation**: Template scaffolding logic in `services/template-scaffolding.ts` handles automatic renaming.

## Template Components

Each template includes:

- **OS Files**: `AGENTS.md`, `CLAUDE.md`, `PRD.md`, `PROTOCOLS.md`, `TESTS.md`
- **Project Files**: Runtime-specific manifests (`package.json`, `deno.json`)
- **Source Code**: Starter implementation files
- **Test Files**: Example test structure (may use `.template` convention)

## Development Notes

- Templates are embedded in the compiled binary using `--include vibe-coding-project-starters/`
- Manifest files automatically updated with project name during scaffolding
- `.vibe` directory initialized in scaffolded projects
- Cross-platform compatibility maintained
