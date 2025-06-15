import { Effect, pipe } from 'effect'

const DAEMON_PORT = 4242

/**
 * Discovery command that acts as a client of the daemon
 * Starts discovery via daemon API and streams real-time progress
 */
export const discoverCommand = (
  projectPath: string,
  options: { forceRefresh?: boolean }
) =>
  pipe(
    Effect.log('🔍 Starting autonomous discovery via daemon...'),
    
    // Start discovery via daemon API
    startDiscoverySession(projectPath),
    Effect.flatMap(({ sessionId }) => 
      pipe(
        Effect.log(`📊 Discovery session started: ${sessionId}`),
        Effect.log(''),
        Effect.log('📡 Streaming real-time progress...'),
        Effect.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'),
        
        // Stream events from daemon
        streamDiscoveryEvents(sessionId),
        
        // Final status check
        Effect.flatMap(() => getDiscoveryStatus(sessionId)),
        Effect.tap(session => displayFinalResults(session))
      )
    ),
    
    Effect.catchAll(error => 
      pipe(
        Effect.log('❌ Discovery failed'),
        Effect.log(`   ${error.message}`),
        Effect.log(''),
        Effect.log('💡 Make sure the daemon is running: vibe daemon start'),
        Effect.log('💡 Check daemon status: vibe daemon status')
      )
    )
  )

/**
 * Starts a discovery session via daemon API
 */
const startDiscoverySession = (projectPath: string) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(`http://localhost:${DAEMON_PORT}/api/discovery/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ projectPath }),
          signal: AbortSignal.timeout(10000), // 10 second timeout
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
        }
        
        return await response.json()
      },
      catch: (error: unknown) => {
        if (error instanceof Error) {
          if (error.message.includes('ECONNREFUSED') || error.name === 'ConnectionError') {
            return new Error('Cannot connect to daemon. Is it running? Try: vibe daemon start')
          }
          return error
        }
        return new Error('Unknown error starting discovery session')
      },
    })
  )

/**
 * Streams discovery events from the daemon's SSE endpoint
 */
const streamDiscoveryEvents = (sessionId: string) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(`http://localhost:${DAEMON_PORT}/api/events`, {
          headers: {
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
        })
        
        if (!response.ok) {
          throw new Error(`Failed to connect to event stream: ${response.status}`)
        }
        
        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('No response body reader available')
        }
        
        const decoder = new TextDecoder()
        let buffer = ''
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                await handleDiscoveryEvent(data, sessionId)
                
                // Break if discovery is completed or failed
                if (data.type === 'discovery' && 
                    (data.sessionId === sessionId) &&
                    (line.includes('discovery:completed') || line.includes('discovery:error'))) {
                  return
                }
              } catch (error) {
                // Skip malformed events
                console.warn('Failed to parse event:', line)
              }
            }
          }
        }
      },
      catch: (error) => new Error(`Event stream error: ${error}`),
    })
  )

/**
 * Handles individual discovery events
 */
const handleDiscoveryEvent = async (event: any, sessionId: string) => {
  if (event.type === 'connected') {
    return
  }
  
  if (event.type === 'heartbeat') {
    return
  }
  
  if (event.type === 'discovery' && event.sessionId === sessionId) {
    const timestamp = new Date(event.timestamp).toLocaleTimeString()
    
    if (event.progress) {
      console.log(`[${timestamp}] 📊 ${event.progress.current}`)
      console.log(`           📁 Manifests: ${event.progress.manifests} | 📦 Dependencies: ${event.progress.dependencies} | 📝 Rules: ${event.progress.rules}`)
    }
    
    if (event.manifests !== undefined) {
      console.log(`[${timestamp}] 📄 Found ${event.manifests} manifest file(s)`)
    }
    
    if (event.dependencies !== undefined) {
      console.log(`[${timestamp}] 📦 Analyzing ${event.dependencies} dependencies`)
    }
    
    if (event.rules !== undefined) {
      if (event.enhanced) {
        console.log(`[${timestamp}] ✨ Enhanced discovery: ${event.rules} rules discovered`)
      } else {
        console.log(`[${timestamp}] 📝 Found ${event.rules} rules from registries`)
      }
    }
    
    if (event.convertedRules !== undefined) {
      console.log(`[${timestamp}] 🔄 Converted ${event.convertedRules} rules to universal format`)
    }
    
    // Final completion message
    if (event.results) {
      console.log(`[${timestamp}] ✅ Discovery completed successfully!`)
    }
    
    // Error handling
    if (event.error) {
      console.log(`[${timestamp}] ❌ Discovery error: ${event.error}`)
    }
  }
}

/**
 * Gets final discovery session status
 */
const getDiscoveryStatus = (sessionId: string) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(`http://localhost:${DAEMON_PORT}/api/discovery/status?sessionId=${sessionId}`)
        
        if (!response.ok) {
          throw new Error(`Failed to get discovery status: ${response.status}`)
        }
        
        return await response.json()
      },
      catch: (error) => new Error(`Status check failed: ${error}`),
    })
  )

/**
 * Displays final discovery results
 */
const displayFinalResults = (session: any) =>
  pipe(
    Effect.log(''),
    Effect.log('📊 Discovery Summary'),
    Effect.log('━━━━━━━━━━━━━━━━━━━━━━━━━━'),
    Effect.log(`🕐 Duration: ${session.completedAt ? 
      Math.round((new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 1000) + 's'
      : 'In progress'}`),
    Effect.log(`📄 Manifests analyzed: ${session.progress.manifests}`),
    Effect.log(`📦 Dependencies found: ${session.progress.dependencies}`),
    Effect.log(`📝 Rules discovered: ${session.progress.rules}`),
    Effect.log(`🔄 Universal rules: ${session.results.convertedRules.length}`),
    Effect.log(`❌ Errors: ${session.errors.length}`),
    
    session.errors.length > 0
      ? pipe(
          Effect.log(''),
          Effect.log('⚠️  Errors encountered:'),
          Effect.all(
            session.errors.slice(0, 5).map((error: string) => 
              Effect.log(`   • ${error}`)
            )
          ),
          session.errors.length > 5
            ? Effect.log(`   ... and ${session.errors.length - 5} more errors`)
            : Effect.succeed(null)
        )
      : Effect.succeed(null),
    
    Effect.log(''),
    Effect.log('💾 Results cached to .vibe/dependencies/'),
    Effect.log('🔍 Check status: vibe daemon status'),
    Effect.log('')
  )