import { Effect, pipe } from 'effect'
import { ensureVibeDirectory } from '../../lib/fs.ts'

// Re-export for compatibility
export { ensureVibeDirectory }

export const createSystemdService = (daemonPath: string) =>
  Effect.sync(() => {
    const serviceContent = `[Unit]
Description=Vibe Daemon - AI Coding Tools Integration
After=network.target

[Service]
Type=simple
ExecStart=${daemonPath}
Restart=always
RestartSec=10
User=%i
WorkingDirectory=%h
Environment=HOME=%h

[Install]
WantedBy=default.target
`

    return serviceContent
  })

export const installSystemdService = (serviceContent: string) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const serviceDir = `${Deno.env.get('HOME')}/.config/systemd/user`
        await Deno.mkdir(serviceDir, { recursive: true })
        
        const servicePath = `${serviceDir}/vibe-daemon.service`
        await Deno.writeTextFile(servicePath, serviceContent)
        
        return servicePath
      },
      catch: () => new Error('Failed to install systemd service'),
    }),
    Effect.tap(servicePath => 
      Effect.log(`📝 Systemd service installed at ${servicePath}`)
    ),
    Effect.tap(() => 
      Effect.log('💡 Enable with: systemctl --user enable vibe-daemon.service')
    ),
    Effect.tap(() => 
      Effect.log('🚀 Start with: systemctl --user start vibe-daemon.service')
    )
  )