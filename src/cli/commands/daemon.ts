import { Effect, pipe } from 'effect'

export const daemonCommand = (
  options: Record<string, unknown>
) =>
  pipe(
    Effect.log('🤖 Vibe Daemon Management'),
    Effect.log('━━━━━━━━━━━━━━━━━━━━━━━━━━'),
    Effect.log(''),
    Effect.log('🚀 To start the daemon:'),
    Effect.log('  vibe-daemon'),
    Effect.log(''),
    Effect.log('🛑 To stop the daemon:'),
    Effect.log('  pkill vibe-daemon'),
    Effect.log(''),
    Effect.log('📊 To check daemon status:'),
    Effect.log('  ps aux | grep vibe-daemon'),
    Effect.log(''),
    Effect.log('📄 View logs:'),
    Effect.log('  tail -f /tmp/vibe-daemon.log'),
    Effect.log(''),
    Effect.log('⚙️  Install as system service:'),
    Effect.log('  # Copy vibe-daemon to /usr/local/bin/'),
    Effect.log('  # systemctl --user enable vibe-daemon.service'),
    Effect.log('  # systemctl --user start vibe-daemon.service'),
    Effect.log('')
  )