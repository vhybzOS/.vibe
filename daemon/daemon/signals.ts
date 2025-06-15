import { Effect } from 'effect'

export const setupSignalHandlers = (shutdownCallback: () => void) =>
  Effect.sync(() => {
    // Handle SIGINT (Ctrl+C)
    Deno.addSignalListener('SIGINT', () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...')
      shutdownCallback()
    })

    // Handle SIGTERM
    Deno.addSignalListener('SIGTERM', () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...')
      shutdownCallback()
    })

    // Handle SIGHUP (reload config)
    Deno.addSignalListener('SIGHUP', () => {
      console.log('\n🔄 Received SIGHUP, reloading configuration...')
      // TODO: Implement config reload
    })

    console.log('📡 Signal handlers registered')
  })