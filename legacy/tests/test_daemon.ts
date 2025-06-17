/**
 * A lightweight, controllable mock daemon server for testing purposes.
 * It mimics the real daemon's API endpoints for predictable test results.
 */
import { Effect } from 'effect'

export interface TestDaemon {
  port: number
  controller: AbortController
  serverPromise: Deno.HttpServer<Deno.NetAddr>
  shutdown: () => void
}

// A record to store the latest request for inspection in tests
export const latestRequest = {
  body: null as string | null,
  pathname: '' as string,
  method: '' as string,
}

const DUMMY_STATUS_RESPONSE = {
  daemon: { name: 'vibe-test-daemon', version: '1.0.0', isRunning: true, pid: 1234 },
  mcpServer: { running: true, port: 3001 },
  projects: [],
  config: {},
}

const DUMMY_DISCOVERY_RESPONSE = {
  sessionId: 'test-session-123',
  status: 'running',
}

const handler = (req: Request): Response => {
  const url = new URL(req.url)
  latestRequest.pathname = url.pathname
  latestRequest.method = req.method

  // Asynchronously capture the body
  req.json().then((body) => {
    latestRequest.body = body
  }).catch(() => {
    latestRequest.body = null
  })

  switch (url.pathname) {
    case '/api/secrets':
      return new Response(
        JSON.stringify({ success: true, message: 'Secret saved in test daemon.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )

    case '/api/discovery/start':
      return new Response(JSON.stringify(DUMMY_DISCOVERY_RESPONSE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    case '/api/events':
      return new Response('data: {"type":"discovery","progress":{"current":"Completed"}}\n\n', {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      })

    case '/status':
      return new Response(JSON.stringify(DUMMY_STATUS_RESPONSE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    case '/shutdown':
      return new Response(JSON.stringify({ message: 'Test daemon shutdown initiated.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    default:
      return new Response('Not Found', { status: 404 })
  }
}

/**
 * Starts the test daemon on a random, available port.
 */
export const startTestDaemon = (): Effect.Effect<TestDaemon, Error> =>
  Effect.tryPromise({
    try: async () => {
      let resolveFn: (value: { port: number }) => void
      const portPromise = new Promise<{ port: number }>((resolve) => {
        resolveFn = resolve
      })

      const controller = new AbortController()
      const serverPromise = Deno.serve({
        port: 0, // 0 means use any available port
        signal: controller.signal,
        onListen: ({ port }) => {
          resolveFn({ port })
        },
      }, handler)

      const { port } = await portPromise

      return {
        port,
        controller,
        serverPromise,
        shutdown: () => controller.abort(),
      }
    },
    catch: (err) => new Error(`Failed to start test daemon: ${err}`),
  })
