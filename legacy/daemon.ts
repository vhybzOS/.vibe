#!/usr/bin/env -S deno run --allow-all

/**
 * .vibe Daemon - Background service
 * Idiomatic Deno entry point for the daemon process
 */

import { VibeDaemon } from './daemon/index.ts'

// Run daemon if this file is executed directly
if (import.meta.main) {
  const daemon = new VibeDaemon()

  daemon.start().catch((error) => {
    console.error('❌ Daemon failed to start:', error)
    Deno.exit(1)
  })
}
