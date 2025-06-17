/**
 * Autonomous Discovery & Inference Engine Service
 * Orchestrates the discovery of dependencies and automatic rule generation
 */

import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { ensureDir, VibeError, writeTextFile } from '../../lib/effects.ts'
import {
  consolidateDependencies,
  type DetectedDependency,
  type DiscoveredRule,
  discoverManifests,
  discoverMultipleDependencies,
  type ManifestParseResult,
  prioritizeRules,
} from '../../discovery/index.ts'
import { UniversalRule } from '../../schemas/index.ts'
import { cacheEnhancedResults, enhancedDiscoverRules } from './enhanced_discovery_service.ts'

/**
 * Discovery session tracking
 */
export interface DiscoverySession {
  id: string
  projectPath: string
  startedAt: string
  completedAt?: string
  status: 'running' | 'completed' | 'failed'
  progress: {
    manifests: number
    dependencies: number
    rules: number
    current: string
  }
  results: {
    manifestResults: ManifestParseResult[]
    dependencies: DetectedDependency[]
    discoveredRules: DiscoveredRule[]
    convertedRules: UniversalRule[]
  }
  errors: string[]
}

/**
 * Discovery configuration
 */
export interface DiscoveryConfig {
  maxConcurrency: number
  cacheEnabled: boolean
  inferenceEnabled: boolean
  minConfidence: number
  maxRulesPerPackage: number
}

/**
 * Discovery event data types
 */
export type DiscoveryEventData =
  | { sessionId: string; projectPath: string } // discovery:started
  | { sessionId: string; manifests: number } // discovery:manifests
  | { sessionId: string; dependencies: number } // discovery:dependencies
  | { sessionId: string; rules: number; enhanced: boolean } // discovery:rules
  | { sessionId: string; convertedRules: number } // discovery:converted
  | { sessionId: string; results: DiscoverySession['results'] } // discovery:completed
  | { sessionId: string; progress: DiscoverySession['progress'] } // discovery:progress
  | { sessionId: string; error: string } // discovery:error

/**
 * Event emitter for real-time updates
 */
export class DiscoveryEventEmitter {
  private listeners = new Map<string, Array<(event: DiscoveryEventData) => void>>()

  emit(eventType: string, data: DiscoveryEventData): void {
    const listeners = this.listeners.get(eventType) || []
    listeners.forEach((listener) => {
      try {
        listener(data)
      } catch (error) {
        console.error(`Event listener error for ${eventType}:`, error)
      }
    })
  }

  on(eventType: string, listener: (event: DiscoveryEventData) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, [])
    }
    this.listeners.get(eventType)!.push(listener)
  }

  off(eventType: string, listener: (event: DiscoveryEventData) => void): void {
    const listeners = this.listeners.get(eventType) || []
    const index = listeners.indexOf(listener)
    if (index >= 0) {
      listeners.splice(index, 1)
    }
  }

  removeAllListeners(eventType?: string): void {
    if (eventType) {
      this.listeners.delete(eventType)
    } else {
      this.listeners.clear()
    }
  }
}

/**
 * Main discovery service class
 */
export class DiscoveryService {
  private sessions = new Map<string, DiscoverySession>()
  private eventEmitter = new DiscoveryEventEmitter()
  private config: DiscoveryConfig = {
    maxConcurrency: 5,
    cacheEnabled: true,
    inferenceEnabled: true,
    minConfidence: 0.5,
    maxRulesPerPackage: 10,
  }

  /**
   * Start autonomous discovery for a project
   */
  startDiscovery = (projectPath: string, config?: Partial<DiscoveryConfig>) =>
    pipe(
      Effect.sync(() => {
        const sessionId = crypto.randomUUID()
        const session: DiscoverySession = {
          id: sessionId,
          projectPath,
          startedAt: new Date().toISOString(),
          status: 'running',
          progress: {
            manifests: 0,
            dependencies: 0,
            rules: 0,
            current: 'Initializing...',
          },
          results: {
            manifestResults: [],
            dependencies: [],
            discoveredRules: [],
            convertedRules: [],
          },
          errors: [],
        }

        this.sessions.set(sessionId, session)
        this.config = { ...this.config, ...config }

        return { sessionId, session }
      }),
      Effect.tap(({ sessionId }) =>
        Effect.sync(() => this.eventEmitter.emit('discovery:started', { sessionId, projectPath }))
      ),
      Effect.flatMap(({ sessionId, session }) =>
        this.runDiscoveryProcess(session).pipe(
          Effect.catchAll((error) => this.handleDiscoveryError(sessionId, error)),
          Effect.map(() => ({ sessionId, session })),
        )
      ),
    )

  /**
   * Get discovery session status
   */
  getSession = (sessionId: string) => Effect.sync(() => this.sessions.get(sessionId))

  /**
   * Get all active sessions
   */
  getAllSessions = () => Effect.sync(() => Array.from(this.sessions.values()))

  /**
   * Subscribe to discovery events
   */
  subscribe = (eventType: string, listener: (event: DiscoveryEventData) => void) =>
    Effect.sync(() => {
      this.eventEmitter.on(eventType, listener)
      return () => this.eventEmitter.off(eventType, listener)
    })

  /**
   * Main discovery process orchestration
   */
  private runDiscoveryProcess = (session: DiscoverySession) =>
    pipe(
      Effect.log(`🚀 Starting discovery for ${session.projectPath}`),
      // Phase 1: Discover manifests
      Effect.flatMap(() => this.updateProgress(session, 'Discovering manifests...')),
      Effect.flatMap(() => discoverManifests(session.projectPath)),
      Effect.tap((manifestResults) =>
        Effect.sync(() => {
          session.results.manifestResults = manifestResults
          session.progress.manifests = manifestResults.length
          this.eventEmitter.emit('discovery:manifests', {
            sessionId: session.id,
            manifests: manifestResults.length,
          })
        })
      ),
      // Phase 2: Consolidate dependencies
      Effect.flatMap((manifestResults) =>
        pipe(
          this.updateProgress(session, 'Analyzing dependencies...'),
          Effect.flatMap(() => consolidateDependencies(manifestResults)),
          Effect.tap((dependencies) =>
            Effect.sync(() => {
              session.results.dependencies = dependencies
              session.progress.dependencies = dependencies.length
              this.eventEmitter.emit('discovery:dependencies', {
                sessionId: session.id,
                dependencies: dependencies.length,
              })
            })
          ),
        )
      ),
      // Phase 3: Enhanced discovery (direct + inference)
      Effect.flatMap((dependencies) =>
        pipe(
          this.updateProgress(
            session,
            'Enhanced discovery: checking repositories and inference...',
          ),
          Effect.flatMap(() => this.runEnhancedDiscovery(session, dependencies)),
          Effect.tap((enhancedRules) =>
            Effect.sync(() => {
              session.results.discoveredRules = enhancedRules
              session.progress.rules = enhancedRules.length
              this.eventEmitter.emit('discovery:rules', {
                sessionId: session.id,
                rules: enhancedRules.length,
                enhanced: true,
              })
            })
          ),
        )
      ),
      // Phase 4: Convert and prioritize rules
      Effect.flatMap(() =>
        pipe(
          this.updateProgress(session, 'Converting and prioritizing rules...'),
          Effect.flatMap(() => prioritizeRules(session.results.discoveredRules)),
          Effect.flatMap((prioritizedRules) => this.convertToUniversalRules(prioritizedRules)),
          Effect.tap((universalRules) =>
            Effect.sync(() => {
              session.results.convertedRules = universalRules
              this.eventEmitter.emit('discovery:converted', {
                sessionId: session.id,
                convertedRules: universalRules.length,
              })
            })
          ),
        )
      ),
      // Phase 5: Cache results
      Effect.flatMap((universalRules) =>
        pipe(
          this.updateProgress(session, 'Caching results...'),
          Effect.flatMap(() => this.cacheDiscoveryResults(session)),
          Effect.map(() => universalRules),
        )
      ),
      // Complete the session
      Effect.tap(() =>
        Effect.sync(() => {
          session.status = 'completed'
          session.completedAt = new Date().toISOString()
          session.progress.current = 'Completed'
          this.eventEmitter.emit('discovery:completed', {
            sessionId: session.id,
            results: session.results,
          })
        })
      ),
      Effect.tap(() => Effect.log(`✅ Discovery completed for ${session.projectPath}`)),
    )

  /**
   * Update session progress and emit event
   */
  private updateProgress = (session: DiscoverySession, current: string) =>
    Effect.sync(() => {
      session.progress.current = current
      this.eventEmitter.emit('discovery:progress', {
        sessionId: session.id,
        progress: session.progress,
      })
    })

  /**
   * Run enhanced discovery for dependencies
   */
  private runEnhancedDiscovery = (session: DiscoverySession, dependencies: DetectedDependency[]) =>
    pipe(
      Effect.log(`🚀 Starting enhanced discovery for ${dependencies.length} dependencies`),
      // Process dependencies with enhanced discovery
      Effect.all(
        dependencies.slice(0, this.config.maxConcurrency * 2).map((dependency) =>
          pipe(
            this.updateProgress(session, `Discovering rules for ${dependency.name}...`),
            Effect.flatMap(() =>
              // First get metadata from the original registry discovery
              discoverMultipleDependencies([dependency])
            ),
            Effect.flatMap((discoveryResults) => {
              const successful = discoveryResults.successful[0]
              if (!successful) {
                return Effect.succeed([])
              }

              // Use enhanced discovery on the metadata
              return pipe(
                enhancedDiscoverRules(successful.metadata, session.projectPath),
                Effect.map((enhancedResult) => enhancedResult.rules),
                Effect.tap((rules) => cacheEnhancedResults(successful.metadata, [], session.projectPath)),
                Effect.catchAll((error) => {
                  console.warn(`Enhanced discovery failed for ${dependency.name}:`, error.message)
                  // Fall back to original rules
                  return Effect.succeed(successful.rules)
                }),
              )
            }),
            Effect.catchAll((error) => {
              console.warn(`Discovery failed for ${dependency.name}:`, error.message)
              return Effect.succeed([])
            }),
          )
        ),
        { concurrency: this.config.maxConcurrency },
      ),
      Effect.map((rulesArrays) => rulesArrays.flat()),
      Effect.tap((allRules) => Effect.log(`✅ Enhanced discovery completed: ${allRules.length} total rules`)),
    )

  /**
   * Convert discovered rules to Universal Rules format
   */
  private convertToUniversalRules = (discoveredRules: DiscoveredRule[]) =>
    pipe(
      Effect.all(
        discoveredRules
          .filter((rule) => rule.confidence >= this.config.minConfidence)
          .slice(0, this.config.maxRulesPerPackage * 10) // Reasonable limit
          .map((rule) => this.convertDiscoveredRule(rule)),
      ),
    )

  /**
   * Convert a single discovered rule to Universal Rule format
   */
  private convertDiscoveredRule = (discoveredRule: DiscoveredRule) =>
    Effect.sync((): UniversalRule => ({
      id: discoveredRule.id,
      metadata: {
        name: discoveredRule.name,
        description: discoveredRule.description,
        source: 'auto-generated' as const,
        confidence: discoveredRule.confidence,
        created: discoveredRule.discoveredAt || new Date().toISOString(),
        updated: discoveredRule.discoveredAt || new Date().toISOString(),
        version: '1.0.0',
      },
      targeting: {
        languages: discoveredRule.targeting?.languages || [],
        frameworks: discoveredRule.targeting?.frameworks || [],
        files: discoveredRule.targeting?.files || [],
        contexts: (discoveredRule.targeting?.contexts as ('development' | 'testing' | 'debugging' | 'refactoring')[]) || [],
      },
      content: {
        markdown: typeof discoveredRule.content === 'string' ? discoveredRule.content : discoveredRule.content.markdown,
        examples: typeof discoveredRule.content === 'string' ? [] : discoveredRule.content.examples,
        tags: typeof discoveredRule.content === 'string' ? [] : discoveredRule.content.tags,
        priority: 'medium' as const,
      },
      compatibility: {
        tools: ['cursor' as const], // Default to cursor for now
        formats: {},
      },
      application: {
        mode: 'context' as const,
        conditions: [],
        excludeFiles: [],
        includeFiles: discoveredRule.targeting?.files || [],
      },
      generated: {
        auto: true,
        source: 'registry',
        package: {
          name: discoveredRule.packageName,
          version: discoveredRule.packageVersion,
        },
        confidence: discoveredRule.confidence,
        reviewed: false,
      },
    }))

  /**
   * Cache discovery results to the .vibe directory
   */
  private cacheDiscoveryResults = (session: DiscoverySession) =>
    pipe(
      Effect.sync(() => resolve(session.projectPath, '.vibe', 'dependencies')),
      Effect.flatMap((cacheDir) => ensureDir(cacheDir)),
      Effect.flatMap(() => {
        const cacheDir = resolve(session.projectPath, '.vibe', 'dependencies')

        return Effect.all([
          // Cache session metadata
          writeTextFile(
            resolve(cacheDir, 'discovery-session.json'),
            JSON.stringify(session, null, 2),
          ),

          // Cache individual package rules
          Effect.all(
            session.results.convertedRules.map((rule) => {
              const packageInfo = rule.generated?.package
              if (!packageInfo) return Effect.succeed(void 0)

              const packageDir = resolve(cacheDir, packageInfo.name, packageInfo.version)
              return pipe(
                ensureDir(packageDir),
                Effect.flatMap(() =>
                  writeTextFile(
                    resolve(packageDir, 'rules.json'),
                    JSON.stringify([rule], null, 2),
                  )
                ),
              )
            }),
          ),
        ])
      }),
    )

  /**
   * Handle discovery errors
   */
  private handleDiscoveryError = (sessionId: string, error: VibeError) =>
    Effect.sync(() => {
      const session = this.sessions.get(sessionId)
      if (session) {
        session.status = 'failed'
        session.errors.push(error.message)
        session.completedAt = new Date().toISOString()

        this.eventEmitter.emit('discovery:error', {
          sessionId,
          error: error.message,
        })
      }

      console.error(`Discovery failed for session ${sessionId}:`, error)
      return []
    })
}

/**
 * Global discovery service instance
 */
export const globalDiscoveryService = new DiscoveryService()
