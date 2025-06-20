# Changelog

All notable changes to `.vibe` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.7.22] - 2025-06-20

### 🔧 Technical Improvements

- **Formatting Fix**: Resolved CHANGELOG.md formatting issue causing CI failures
- **Release Protocol**: Enhanced with mandatory formatting step before commits

## [0.7.21] - 2025-06-20

### 🎯 Highlights

- Fixed missing Windows binary in releases
- Enhanced Release Protocol with proper CHANGELOG.md workflow
- Platform-specific cache paths prevent binary overwriting

### 🔧 Technical Improvements

- **Windows Binary Fix**: Separate cache restoration paths for each platform
- **Release Protocol Enhancement**: Mandatory CHANGELOG.md population before version bumps
- **Cache Architecture**: Build native binaries to separate directories (build-native-linux/, build-native-windows/, build-native-macos/)

### 📚 Documentation

- **Release Protocol**: Clear instructions for CHANGELOG.md maintenance
- **Template Format**: Standardized changelog entry structure with examples
- **Critical Format Requirements**: Exact version format specifications for workflow compatibility

## [0.7.20] - 2025-06-20

### 🎯 Highlights

- Single binary architecture with 50% size reduction
- Fixed GitHub Actions release workflow for reliable CI/CD
- Comprehensive CI/Release monitoring protocols

### ✨ New Features

- **Unified Binary**: Merged `vibe` and `vibectl` into single binary with `vibe daemon` subcommand
  - Simplified installation and deployment
  - All service templates updated to use `vibe daemon`
  - Consistent user experience across platforms

### 🔧 Technical Improvements

- **50% Binary Reduction**: From 6 binaries to 3 (Linux, macOS, Windows)
- **Installer Size Optimization**: Unix installer ~312MB, Windows installer ~213MB
- **Fixed GitHub Release Workflow**: Resolved cache timing issues between workflow jobs
- **Platform-specific Binary Caching**: Separate cache paths prevent overwriting

### 📚 Documentation

- **CI Protocol**: Systematic GitHub Actions failure diagnosis with API monitoring
- **Release Protocol**: Automated release verification and asset validation
- Updated monitoring timings to 2-minute workflow expectations

## [0.6.0] - 2024-06-19

### 🎯 Highlights

- Project template scaffolding system for instant project creation
- Embedded templates in compiled binary for zero-dependency distribution
- Automatic project name configuration in manifest files

### ✨ New Features

- **Template Scaffolding**: Create new projects with `vibe init <runtime>`
  - `vibe init node myproject` - Scaffold Node.js project with TypeScript, Vitest, and complete `.vibe` OS
  - `vibe init deno myproject` - Scaffold Deno project with testing setup and `.vibe` OS integration
  - Interactive mode: `vibe init node` prompts for project name when not provided
  - Automatic manifest updates: Sets correct project name in package.json (Node.js) or deno.json (Deno)
  - Templates include: AGENTS.md, PROTOCOLS.md, PRD.md, TESTS.md for immediate AI-assisted development

### 🔧 Technical Improvements

- **Runtime-agnostic manifest updater system**: Extensible architecture for future language support (Python, Rust, etc.)
- **Binary resource embedding**: Templates included in compiled binary using Deno 2.3.6's `--include` flag
- **Effect-TS composition**: All template operations use functional error handling
- **Test utilities enhancement**: Added reusable `withTempDir()` helper function
- **CLI unification**: Single `init` command intelligently handles both existing projects and new scaffolding

### 📚 Documentation

- Added CLI testing patterns to PROTOCOLS.md for `./vibe` wrapper script usage
- Complete Phase 1.5 documentation in PRD.md
- Release Protocol added to PROTOCOLS.md for changelog generation

## [0.5.0] - 2024-06-19

### ✨ New Features

- **Vibe Coding Project Starters**: Production-ready templates for new projects
  - Node.js template with TypeScript, ESM, Vitest testing framework
  - Deno template with built-in testing and modern tooling
  - Both templates include complete `.vibe` Operating System documentation

### 🔧 Technical Improvements

- Templates structured for AI-assisted development workflows
- Pre-configured with best practices and architectural patterns
- Ready for immediate use with Claude, Cursor, or other AI coding assistants

## [0.4.8] - 2024-06-19

### 🔧 Technical Improvements

- Cross-reference fixes and documentation updates

## [0.4.0] - 2024-06-18

### ✨ New Features

- **Library Documentation Command**: `vibe code <package>`
  - Fetches fresh documentation from library websites (llms.txt standard)
  - Intelligent caching system for fast subsequent access
  - Supports both npm and JSR package registries

### 🎯 Highlights

- Phase 1 Complete: Core documentation fetching functionality
- Effect-TS architecture throughout
- Production-ready with 100% test coverage

[0.6.0]: https://github.com/vhybzOS/.vibe/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/vhybzOS/.vibe/compare/v0.4.8...v0.5.0
[0.4.8]: https://github.com/vhybzOS/.vibe/compare/v0.4.0...v0.4.8
[0.4.0]: https://github.com/vhybzOS/.vibe/releases/tag/v0.4.0
