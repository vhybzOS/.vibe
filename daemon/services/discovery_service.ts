/**
 * Autonomous Discovery & Inference Engine Service
 * Orchestrates the discovery of dependencies and automatic rule generation
 */

import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { VibeError, ensureDir, writeTextFile } from '../../lib/effects.ts'
import { 
  discoverManifests, 
  consolidateDependencies,
  discoverMultipleDependencies, 
  prioritizeRules,
  type DetectedDependency, 
  type ManifestParseResult,
  type DiscoveredRule,
} from '../../discovery/index.ts'
import { UniversalRule } from '../../schemas/index.ts'

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
 * Event emitter for real-time updates
 */
export class DiscoveryEventEmitter {
  private listeners = new Map<string, Array<(event: any) => void>>()
  
  emit(eventType: string, data: any): void {
    const listeners = this.listeners.get(eventType) || []
    listeners.forEach(listener => {
      try {
        listener(data)
      } catch (error) {
        console.error(`Event listener error for ${eventType}:`, error)
      }
    })
  }
  
  on(eventType: string, listener: (event: any) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, [])
    }
    this.listeners.get(eventType)!.push(listener)
  }
  
  off(eventType: string, listener: (event: any) => void): void {
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
          Effect.catchAll(error => 
            this.handleDiscoveryError(sessionId, error)
          ),
          Effect.map(() => ({ sessionId, session }))
        )
      )
    )

  /**
   * Get discovery session status
   */
  getSession = (sessionId: string) =>
    Effect.sync(() => this.sessions.get(sessionId))

  /**
   * Get all active sessions
   */
  getAllSessions = () =>
    Effect.sync(() => Array.from(this.sessions.values()))

  /**
   * Subscribe to discovery events
   */
  subscribe = (eventType: string, listener: (event: any) => void) =>
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
      Effect.tap(manifestResults => 
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
      Effect.flatMap(manifestResults => 
        pipe(
          this.updateProgress(session, 'Analyzing dependencies...'),
          Effect.flatMap(() => consolidateDependencies(manifestResults)),
          Effect.tap(dependencies => 
            Effect.sync(() => {
              session.results.dependencies = dependencies
              session.progress.dependencies = dependencies.length
              this.eventEmitter.emit('discovery:dependencies', {
                sessionId: session.id,
                dependencies: dependencies.length,
              })
            })
          )
        )
      ),
      
      // Phase 3: Discover rules from registries
      Effect.flatMap(dependencies => 
        pipe(
          this.updateProgress(session, 'Discovering rules from registries...'),
          Effect.flatMap(() => discoverMultipleDependencies(dependencies)),
          Effect.tap(discoveryResults => 
            Effect.sync(() => {
              const allRules = discoveryResults.successful.flatMap(r => r.rules)
              session.results.discoveredRules = allRules
              session.progress.rules = allRules.length
              this.eventEmitter.emit('discovery:rules', {
                sessionId: session.id,
                rules: allRules.length,
                stats: discoveryResults.stats,
              })
            })
          )
        )
      ),
      
      // Phase 4: Convert and prioritize rules
      Effect.flatMap(() => 
        pipe(
          this.updateProgress(session, 'Converting and prioritizing rules...'),
          Effect.flatMap(() => prioritizeRules(session.results.discoveredRules)),
          Effect.flatMap(prioritizedRules => this.convertToUniversalRules(prioritizedRules)),
          Effect.tap(universalRules => 
            Effect.sync(() => {
              session.results.convertedRules = universalRules
              this.eventEmitter.emit('discovery:converted', {
                sessionId: session.id,
                convertedRules: universalRules.length,
              })
            })
          )
        )
      ),
      
      // Phase 5: Cache results
      Effect.flatMap(universalRules => 
        pipe(
          this.updateProgress(session, 'Caching results...'),
          Effect.flatMap(() => this.cacheDiscoveryResults(session)),
          Effect.map(() => universalRules)
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
      
      Effect.tap(() => Effect.log(`✅ Discovery completed for ${session.projectPath}`))
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
   * Convert discovered rules to Universal Rules format
   */
  private convertToUniversalRules = (discoveredRules: DiscoveredRule[]) =>
    pipe(
      Effect.all(
        discoveredRules
          .filter(rule => rule.confidence >= this.config.minConfidence)
          .slice(0, this.config.maxRulesPerPackage * 10) // Reasonable limit
          .map(rule => this.convertDiscoveredRule(rule))
      )
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
        source: 'discovery' as const,
        confidence: discoveredRule.confidence,
        created: discoveredRule.discoveredAt,
        updated: discoveredRule.discoveredAt,
        version: '1.0.0',
      },
      targeting: {
        languages: discoveredRule.targeting.languages,
        frameworks: discoveredRule.targeting.frameworks,
        files: discoveredRule.targeting.files,
        contexts: discoveredRule.targeting.contexts,
      },
      content: {
        markdown: discoveredRule.content.markdown,
        examples: discoveredRule.content.examples,
        tags: discoveredRule.content.tags,
        priority: 'medium' as const,
      },
      compatibility: {
        tools: ['cursor' as const], // Default to cursor for now
        formats: {},
      },
      application: {
        mode: 'contextual' as const,
        conditions: [],
        excludeFiles: [],
        includeFiles: discoveredRule.targeting.files,
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
      Effect.flatMap(cacheDir => ensureDir(cacheDir)),
      Effect.flatMap(() => {
        const cacheDir = resolve(session.projectPath, '.vibe', 'dependencies')
        
        return Effect.all([
          // Cache session metadata
          writeTextFile(
            resolve(cacheDir, 'discovery-session.json'),
            JSON.stringify(session, null, 2)
          ),
          
          // Cache individual package rules
          Effect.all(
            session.results.convertedRules.map(rule => {
              const packageInfo = rule.generated?.package
              if (!packageInfo) return Effect.succeed(void 0)
              
              const packageDir = resolve(cacheDir, packageInfo.name, packageInfo.version)
              return pipe(
                ensureDir(packageDir),
                Effect.flatMap(() => 
                  writeTextFile(
                    resolve(packageDir, 'rules.json'),
                    JSON.stringify([rule], null, 2)
                  )
                )
              )
            })
          ),
        ])
      })
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