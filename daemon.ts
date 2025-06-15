#!/usr/bin/env -S deno run --allow-all

/**
 * .vibe Daemon - Background service
 * Idiomatic Deno entry point for the daemon process
 */

import { Effect, pipe } from 'effect'
import { logWithContext } from './lib/effects.ts'

// Import the daemon implementation
import { VibeDaemon } from './daemon/index.ts'

/**
 * Main daemon entry point
 */
const main = () =>
  pipe(
    Effect.sync(() => new VibeDaemon()),
    Effect.flatMap(daemon => daemon.start()),
    Effect.tap(() => logWithContext('Daemon', 'Started successfully')),
    Effect.catchAll(error => 
      pipe(
        Effect.sync(() => {
          console.error('❌ Daemon failed to start:', error.message)
          if (Deno.env.get('VIBE_DEBUG')) {
            console.error('Stack trace:', error.stack)
          }
          Deno.exit(1)
        })
      )
    )
  )

// Run daemon if this file is executed directly
if (import.meta.main) {
  Effect.runPromise(main()).catch((error) => {
    console.error('❌ Unexpected daemon error:', error)
    Deno.exit(1)
  })
}