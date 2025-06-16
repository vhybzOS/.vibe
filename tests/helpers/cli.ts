/**
 * Master test helper for running CLI commands in an isolated environment.
 * Manages a temporary directory and a mock API server for predictable test results.
 */
import { Effect, pipe } from 'effect';
import { resolve } from '@std/path';
import { initCommand } from '../../cli/commands/init.ts';
import { statusCommand } from '../../cli/commands/status.ts';
import { discoverCommand } from '../../cli/commands/discover.ts';

// Represents the state of our mock daemon API
interface MockApiState {
  secrets: Record<string, any>;
  discoverySessions: Map<string, any>;
}

/**
 * Creates a mock API server that simulates the vibe-daemon's HTTP endpoints.
 */
const createMockApiServer = (state: MockApiState) => {
  const handler = async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    if (req.method === 'POST' && url.pathname === '/api/secrets') {
      const { apiKey, projectPath } = await req.json();
      const scope = projectPath || 'global';
      if (!state.secrets[scope]) state.secrets[scope] = {};
      if (apiKey.startsWith('sk-')) state.secrets[scope].openai = true;
      else if (apiKey.startsWith('ghp_')) state.secrets[scope].github = true;
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
    if (req.method === 'POST' && url.pathname === '/api/discovery/start') {
        const body = await req.text();
        const { projectPath } = JSON.parse(body);
        const sessionId = `test-session-${crypto.randomUUID()}`;
        state.discoverySessions.set(sessionId, { projectPath, status: 'running' });
        return new Response(JSON.stringify({ success: true, sessionId }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
    }
    if (url.pathname === '/api/events') {
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const data = JSON.stringify({ type: 'discovery', sessionId: 'test-session-123', progress: { current: 'Completed' } });
        writer.write(new TextEncoder().encode(`data: ${data}\n\n`)).then(() => {
          writer.close();
        });
        return new Response(readable, { headers: { 'Content-Type': 'text/event-stream' } });
    }
    return new Response('Mock API Not Found', { status: 404 });
  };
  return Deno.serve({ port: 4242, hostname: 'localhost', onListen: () => {} }, handler);
};

/**
 * Sets up a temporary directory and mock server for a single test run.
 * Returns an object with the test environment details and a cleanup function.
 */
export const setupTestCli = async () => {
  const testDir = await Deno.makeTempDir({ prefix: 'vibe_cli_test_' });

  const mockApiState: MockApiState = {
    secrets: {},
    discoverySessions: new Map(),
  };

  const server = createMockApiServer(mockApiState);
  
  // Give the server a moment to start
  await new Promise(resolve => setTimeout(resolve, 10));

  const cleanup = async () => {
    try {
      await server.shutdown();
    } catch {
      // Ignore shutdown errors
    }
    try {
      await Deno.remove(testDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  };

  // Create a dummy package.json for commands that need it
  await Deno.writeTextFile(resolve(testDir, 'package.json'), JSON.stringify({ name: 'test-project', version: '1.0.0' }));


  return {
    testDir,
    mockApiState,
    cleanup,
    run: {
      init: (options: { force?: boolean } = {}) => Effect.runPromise(initCommand(testDir, options)),
      status: () => Effect.runPromise(statusCommand(testDir)),
      discover: (options: { forceRefresh?: boolean } = {}) => Effect.runPromise(discoverCommand(testDir, options)),
    },
  };
};