/**
 * NPM registry fetcher for Node.js packages
 * Fetches package metadata from npmjs.com and discovers rules
 */

import { Effect, pipe } from 'effect'
import { VibeError } from '../../lib/effects.ts'
import {
  RegistryFetcher,
  PackageMetadata,
  DiscoveredRule,
  makeHttpRequest,
  extractGitHubRepo,
  inferFramework,
} from './base.ts'

interface NpmPackageData {
  name: string
  version: string
  description?: string
  homepage?: string
  repository?: string | { type: string; url: string }
  license?: string
  keywords?: string[]
  maintainers?: Array<{ name: string; email?: string }>
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  engines?: Record<string, string>
  time?: Record<string, string>
  [key: string]: unknown
}

interface NpmRegistryResponse {
  'dist-tags': {
    latest: string
    [tag: string]: string
  }
  versions: Record<string, NpmPackageData>
  time: Record<string, string>
  [key: string]: unknown
}

export class NpmRegistryFetcher implements RegistryFetcher {
  readonly name = 'npm'
  readonly supportedPackageTypes = ['npm', 'node'] as const
  readonly baseUrl = 'https://registry.npmjs.org'

  canFetch = (packageName: string, packageType: string): boolean => {
    return this.supportedPackageTypes.includes(packageType as any)
  }

  fetchPackageMetadata = (packageName: string, version?: string) =>
    pipe(
      this.fetchFromRegistry(packageName),
      Effect.flatMap(registryData => this.extractMetadata(registryData, version))
    )

  discoverRules = (packageMetadata: PackageMetadata) =>
    pipe(
      Effect.log(`🔍 Discovering rules for ${packageMetadata.name}`),
      Effect.flatMap(() =>
        Effect.all([
          this.discoverFrameworkRules(packageMetadata),
          this.discoverRepositoryRules(packageMetadata),
          this.discoverCategoryRules(packageMetadata),
        ])
      ),
      Effect.map(([frameworkRules, repoRules, categoryRules]) => [
        ...frameworkRules,
        ...repoRules,
        ...categoryRules,
      ]),
      Effect.tap(rules => 
        Effect.log(`📋 Discovered ${rules.length} rule(s) for ${packageMetadata.name}`)
      )
    )

  getCacheKey = (packageName: string, version: string): string => {
    return `npm:${packageName}:${version}`
  }

  private fetchFromRegistry = (packageName: string) =>
    pipe(
      makeHttpRequest(`${this.baseUrl}/${encodeURIComponent(packageName)}`),
      Effect.map(data => data as NpmRegistryResponse)
    )

  private extractMetadata = (registryData: NpmRegistryResponse, version?: string) =>
    Effect.sync(() => {
      const targetVersion = version || registryData['dist-tags'].latest
      const versionData = registryData.versions[targetVersion]
      
      if (!versionData) {
        throw new VibeError(`Version ${targetVersion} not found`, 'VERSION_NOT_FOUND')
      }

      const metadata: PackageMetadata = {
        name: versionData.name,
        version: targetVersion,
        description: versionData.description,
        homepage: versionData.homepage,
        repository: typeof versionData.repository === 'string' 
          ? { type: 'git', url: versionData.repository }
          : versionData.repository,
        license: versionData.license,
        keywords: versionData.keywords,
        maintainers: versionData.maintainers,
        dependencies: versionData.dependencies,
        peerDependencies: versionData.peerDependencies,
        engines: versionData.engines,
        publishedAt: registryData.time[targetVersion] || new Date().toISOString(),
        framework: inferFramework(versionData.name, {
          name: versionData.name,
          version: targetVersion,
          description: versionData.description,
          keywords: versionData.keywords,
          publishedAt: registryData.time[targetVersion] || new Date().toISOString(),
        }),
      }

      return metadata
    })

  private discoverFrameworkRules = (metadata: PackageMetadata) =>
    Effect.sync(() => {
      const rules: DiscoveredRule[] = []
      
      if (metadata.framework) {
        rules.push(this.createFrameworkRule(metadata))
      }

      // Special handling for popular packages
      if (metadata.name === 'react') {
        rules.push(this.createReactRule(metadata))
      } else if (metadata.name === 'typescript') {
        rules.push(this.createTypeScriptRule(metadata))
      } else if (metadata.name === 'eslint') {
        rules.push(this.createESLintRule(metadata))
      }

      return rules
    })

  private discoverRepositoryRules = (metadata: PackageMetadata) =>
    Effect.sync(() => {
      const rules: DiscoveredRule[] = []
      const githubRepo = extractGitHubRepo(metadata.repository)
      
      if (githubRepo) {
        // TODO: In a real implementation, we'd fetch README and docs from GitHub
        rules.push(this.createRepositoryRule(metadata, githubRepo))
      }
      
      return rules
    })

  private discoverCategoryRules = (metadata: PackageMetadata) =>
    Effect.sync(() => {
      const rules: DiscoveredRule[] = []
      const keywords = metadata.keywords || []
      
      // Testing libraries
      if (keywords.some(k => ['test', 'testing', 'jest', 'mocha', 'vitest'].includes(k.toLowerCase()))) {
        rules.push(this.createTestingRule(metadata))
      }
      
      // Build tools
      if (keywords.some(k => ['build', 'webpack', 'vite', 'rollup', 'bundler'].includes(k.toLowerCase()))) {
        rules.push(this.createBuildToolRule(metadata))
      }
      
      return rules
    })

  private createFrameworkRule = (metadata: PackageMetadata): DiscoveredRule => ({
    id: `npm-${metadata.name}-framework-${crypto.randomUUID()}`,
    name: `${metadata.framework?.charAt(0).toUpperCase()}${metadata.framework?.slice(1)} Framework Usage`,
    description: `Best practices for using ${metadata.framework} in your project`,
    confidence: 0.8,
    source: 'registry',
    packageName: metadata.name,
    packageVersion: metadata.version,
    framework: metadata.framework,
    category: 'framework',
    content: {
      markdown: `# ${metadata.framework?.charAt(0).toUpperCase()}${metadata.framework?.slice(1)} Best Practices

This project uses ${metadata.name} (${metadata.framework}). Follow these guidelines:

## Installation
\`\`\`bash
npm install ${metadata.name}
\`\`\`

## Usage
${metadata.description || 'Follow the official documentation for best practices.'}

## Version
Currently using version ${metadata.version}
`,
      examples: [],
      tags: [metadata.framework!, 'framework', 'npm'],
    },
    targeting: {
      languages: ['javascript', 'typescript'],
      frameworks: [metadata.framework!],
      files: ['package.json'],
      contexts: ['development'],
    },
    discoveredAt: new Date().toISOString(),
  })

  private createReactRule = (metadata: PackageMetadata): DiscoveredRule => ({
    id: `npm-react-${crypto.randomUUID()}`,
    name: 'React Development Guidelines',
    description: 'Essential React development practices and patterns',
    confidence: 0.9,
    source: 'registry',
    packageName: metadata.name,
    packageVersion: metadata.version,
    framework: 'react',
    category: 'framework',
    content: {
      markdown: `# React Development Guidelines

## Component Structure
- Use functional components with hooks
- Keep components small and focused
- Use TypeScript for type safety

## State Management
- Use useState for local state
- Consider useReducer for complex state logic
- Use Context API for global state

## Performance
- Use React.memo for expensive components
- Implement proper key props for lists
- Use useMemo and useCallback judiciously
`,
      examples: [
        {
          title: 'Functional Component with TypeScript',
          language: 'typescript',
          code: `interface Props {
  title: string;
  onClick: () => void;
}

const Button: React.FC<Props> = ({ title, onClick }) => {
  return (
    <button onClick={onClick}>
      {title}
    </button>
  );
};`
        }
      ],
      tags: ['react', 'components', 'hooks', 'typescript'],
    },
    targeting: {
      languages: ['javascript', 'typescript'],
      frameworks: ['react'],
      files: ['*.tsx', '*.jsx'],
      contexts: ['development'],
    },
    discoveredAt: new Date().toISOString(),
  })

  private createTypeScriptRule = (metadata: PackageMetadata): DiscoveredRule => ({
    id: `npm-typescript-${crypto.randomUUID()}`,
    name: 'TypeScript Configuration',
    description: 'TypeScript setup and best practices',
    confidence: 0.9,
    source: 'registry',
    packageName: metadata.name,
    packageVersion: metadata.version,
    category: 'language',
    content: {
      markdown: `# TypeScript Configuration

## Setup
- Use strict mode for better type safety
- Configure path mapping for cleaner imports
- Set up proper build and development scripts

## Best Practices
- Use interfaces for object shapes
- Prefer type unions over enums when possible
- Use generic types for reusable components
`,
      examples: [],
      tags: ['typescript', 'configuration', 'types'],
    },
    targeting: {
      languages: ['typescript'],
      frameworks: [],
      files: ['tsconfig.json', '*.ts', '*.tsx'],
      contexts: ['development'],
    },
    discoveredAt: new Date().toISOString(),
  })

  private createESLintRule = (metadata: PackageMetadata): DiscoveredRule => ({
    id: `npm-eslint-${crypto.randomUUID()}`,
    name: 'ESLint Configuration',
    description: 'Code quality and linting setup with ESLint',
    confidence: 0.8,
    source: 'registry',
    packageName: metadata.name,
    packageVersion: metadata.version,
    category: 'tooling',
    content: {
      markdown: `# ESLint Configuration

## Setup
- Configure ESLint with appropriate presets
- Set up IDE integration for real-time linting
- Add pre-commit hooks for code quality

## Recommended Rules
- Use consistent code formatting
- Enforce proper error handling
- Prevent common JavaScript pitfalls
`,
      examples: [],
      tags: ['eslint', 'linting', 'code-quality'],
    },
    targeting: {
      languages: ['javascript', 'typescript'],
      frameworks: [],
      files: ['.eslintrc*', 'eslint.config.js'],
      contexts: ['development'],
    },
    discoveredAt: new Date().toISOString(),
  })

  private createTestingRule = (metadata: PackageMetadata): DiscoveredRule => ({
    id: `npm-testing-${metadata.name}-${crypto.randomUUID()}`,
    name: `Testing with ${metadata.name}`,
    description: `Testing setup and practices using ${metadata.name}`,
    confidence: 0.7,
    source: 'registry',
    packageName: metadata.name,
    packageVersion: metadata.version,
    category: 'testing',
    content: {
      markdown: `# Testing with ${metadata.name}

## Setup
Configure ${metadata.name} for comprehensive testing coverage.

## Best Practices
- Write tests alongside your code
- Use descriptive test names
- Test both happy path and edge cases
- Mock external dependencies appropriately

${metadata.description || ''}
`,
      examples: [],
      tags: ['testing', metadata.name, 'quality'],
    },
    targeting: {
      languages: ['javascript', 'typescript'],
      frameworks: [],
      files: ['*.test.*', '*.spec.*'],
      contexts: ['testing'],
    },
    discoveredAt: new Date().toISOString(),
  })

  private createBuildToolRule = (metadata: PackageMetadata): DiscoveredRule => ({
    id: `npm-build-${metadata.name}-${crypto.randomUUID()}`,
    name: `Build Configuration with ${metadata.name}`,
    description: `Build and bundling setup using ${metadata.name}`,
    confidence: 0.7,
    source: 'registry',
    packageName: metadata.name,
    packageVersion: metadata.version,
    category: 'build',
    content: {
      markdown: `# Build Configuration with ${metadata.name}

## Setup
Configure ${metadata.name} for optimal build performance and output.

## Best Practices
- Optimize for production builds
- Configure proper source maps
- Set up development server for fast iteration
- Enable tree shaking for smaller bundles

${metadata.description || ''}
`,
      examples: [],
      tags: ['build', 'bundling', metadata.name],
    },
    targeting: {
      languages: ['javascript', 'typescript'],
      frameworks: [],
      files: ['webpack.config.js', 'vite.config.js', 'rollup.config.js'],
      contexts: ['build'],
    },
    discoveredAt: new Date().toISOString(),
  })

  private createRepositoryRule = (metadata: PackageMetadata, githubRepo: string): DiscoveredRule => ({
    id: `npm-repo-${metadata.name}-${crypto.randomUUID()}`,
    name: `${metadata.name} Documentation`,
    description: `Official documentation and examples for ${metadata.name}`,
    confidence: 0.6,
    source: 'repository',
    packageName: metadata.name,
    packageVersion: metadata.version,
    category: 'documentation',
    content: {
      markdown: `# ${metadata.name} Documentation

## Official Repository
GitHub: https://github.com/${githubRepo}

## Description
${metadata.description || 'No description available'}

## Installation
\`\`\`bash
npm install ${metadata.name}
\`\`\`

For detailed documentation, examples, and API reference, visit the official repository.
`,
      examples: [],
      tags: ['documentation', 'repository', metadata.name],
    },
    targeting: {
      languages: ['javascript', 'typescript'],
      frameworks: metadata.framework ? [metadata.framework] : [],
      files: [],
      contexts: ['development'],
    },
    discoveredAt: new Date().toISOString(),
  })
}