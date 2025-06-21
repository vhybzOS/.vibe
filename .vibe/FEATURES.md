# .vibe Features Reference

Architecture-level documentation of completed features for AI agents.

## [2024-12-20] Go Binary Installer

**Overview**: Cross-platform binary installer that downloads and installs vibe binary with progress indication on Windows, macOS, and Linux.

**Files Created/Modified**:

- `installer/main.go:1-328` - Core installer implementation (platform detection, GitHub API, download with progress)
- `installer/go.mod` - Go module definition
- `installer/Taskfile.yml` - Build automation
- `.github/workflows/release.yml:132-178` - Go build integration in CI/CD
- `deno.json:26` - Version bumped to 0.7.27

**Architecture Decisions**:

- KISS approach: ~200 lines of Go, no abstractions
- No service management, just binary placement in ~/.local/bin/
- Progress bar during download using ProgressWriter
- GitHub API fallback to hardcoded version (v0.7.27)
- Cross-OS cache fix: enableCrossOsArchive: true

**Entry Points**:

- Downloads from: `https://github.com/vhybzOS/.vibe/releases/download/{version}/`
- Installs to: `~/.local/bin/vibe` (Unix) or `%USERPROFILE%\.local\bin\vibe.exe` (Windows)
- Release assets: install-dotvibe, install-dotvibe.exe

**Success**: All 5 release assets working perfectly in production.

---

## [2024-12-19] Template Scaffolding System

**Overview**: Project template scaffolding system enabling `vibe init <runtime>` commands for instant project creation with embedded templates.

**Files Created/Modified**:

- `services/template-scaffolding.ts` - Template copying service using Effect-TS
- `cli.ts` - Added init command routing
- `schemas/config.ts` - Template scaffolding schemas
- `vibe-coding-project-starters/node-template/` - Node.js project template
- `vibe-coding-project-starters/deno-template/` - Deno project template
- `deno.json:20` - Build task with --include flag

**Architecture Decisions**:

- Runtime-agnostic manifest updater system (ManifestUpdater interface)
- Embedded resources using Deno's `--include vibe-coding-project-starters/`
- Generic system extensible for Python, Rust, etc.
- Effect-TS composition for all file operations

**Entry Points**:

- `vibe init node myproject` - Creates Node.js project with TypeScript
- `vibe init deno myproject` - Creates Deno project with testing setup
- Interactive mode when project name omitted

**Success**: Both templates working end-to-end with proper manifest name updates.

---

## [2024-12-18] Library Documentation Fetcher (Phase 1)

**Overview**: Core documentation fetching system that enables `vibe code <package>` to fetch fresh library documentation from llms.txt standard.

**Files Created/Modified**:

- `schemas/library-cache.ts` - Zod v4 schemas and TOML structure
- `services/registry-client.ts` - npm/JSR HTTP client with automatic fallback
- `services/package-detector.ts` - package.json/deno.json parsing
- `services/library-cache.ts` - TOML index management and markdown caching
- `commands/vibe-code.ts` - Main command implementation
- `tests/unit/` - Complete unit test suite (11 files)
- `tests/integration/` - Integration tests for end-to-end workflows
- `tests/user/` - User acceptance tests

**Architecture Decisions**:

- Effect-TS composition throughout (`pipe()` patterns)
- Tagged union error handling (FileSystemError, ParseError, etc.)
- Storage in `.vibe/libraries/` with TOML index
- Package spec parsing: `npm:hono@^4.0.0` → structured data

**Entry Points**:

- `vibe code effect` - Fetches https://effect.website/llms.txt
- `vibe code hono` - Fetches https://hono.dev/llms.txt
- `vibe code zod` - Fetches https://zod.dev/llms.txt

**Storage Structure**:

```
.vibe/libraries/
├── index.toml                # package → version + domain mapping
└── docs/
    ├── hono/README.md        # Cached llms.txt content
    └── effect/README.md      # Cached llms.txt content
```

**Success**: 133 lines of Effect documentation fetched, 210 tests passing.

---

## [2024-12-17] Single Binary Architecture Migration

**Overview**: Merged `vibe` and `vibectl` into single binary with `vibe daemon` subcommand, achieving 50% size reduction.

**Files Created/Modified**:

- `cli.ts` - Added daemon command routing
- `deno.json` - Removed vibectl tasks, updated build scripts
- `.github/workflows/release.yml` - Updated for single binary builds
- Service templates updated to use `vibe daemon`

**Architecture Decisions**:

- Single binary with subcommand architecture
- Daemon functionality accessible via `vibe daemon`
- Simplified installation (3 binaries instead of 6)

**Entry Points**:

- `vibe daemon` - Service daemon functionality
- All existing vibe commands unchanged

**Benefits Achieved**:

- Binary count: 6 → 3 (50% reduction)
- Build cache: ~666MB → ~333MB total
- Simpler architecture to maintain

---

## [2024-11-20] Test Suite Architecture

**Overview**: Comprehensive test suite with Effect-TS integration, cross-platform compatibility, and robust test utilities.

**Files Created/Modified**:

- `tests/utils.ts` - Unified test utilities with absolute path handling
- `tests/unit/` - Unit tests for all services (12 files)
- `tests/integration/` - Component interaction tests
- `tests/user/` - Complete workflow validation
- `scripts/coverage.ts` - Test coverage analysis

**Architecture Decisions**:

- Three-tier testing: unit, integration, user
- `@tested_by` annotations linking implementation to tests
- Effect-TS test helpers for async operations
- Cross-platform filesystem handling

**Entry Points**:

- `deno task test` - Full test suite
- `deno task test:unit` - Fast unit tests
- `deno task test:integration` - Component tests
- `deno task test:user` - User acceptance tests
- `deno task coverage` - Coverage analysis

**Success**: 210 tests passing, 100% production ready.
