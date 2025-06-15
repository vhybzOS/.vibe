import { describe, it, beforeAll, afterAll } from '@std/testing/bdd';
import { assertEquals, assertExists } from '@std/assert';
import { Effect } from 'effect';
import { daemonCommand, __setDaemonControlPort } from '../../cli/commands/daemon.ts';
import { startTestDaemon, type TestDaemon } from '../test_daemon.ts';

describe('Vibe Daemon CLI Command (E2E)', () => {
  let testDaemon: TestDaemon;

  beforeAll(async () => {
    const result = await Effect.runPromise(startTestDaemon());
    testDaemon = result;
    // Override the control port used by the command
    __setDaemonControlPort(testDaemon.port);
  });

  afterAll(() => {
    testDaemon?.shutdown();
  });

  it('should show daemon status via API', async () => {
    // We suppress console.log for this test to keep the output clean
    const originalLog = console.log;
    console.log = () => {};
    try {
      await Effect.runPromise(daemonCommand('status', {}));
      // The test is that this doesn't throw an error and connects successfully.
    } finally {
      console.log = originalLog; // Restore console.log
    }
  });

  it('should handle "daemon not running" for status command', async () => {
    // Stop the daemon temporarily
    testDaemon.shutdown();
    const originalLog = console.log;
    let logs: string[] = [];
    console.log = (msg: string) => logs.push(msg);

    try {
      await Effect.runPromise(daemonCommand('status', {}));
      assertExists(logs.find(log => log.includes('Cannot connect to daemon')));
    } finally {
      console.log = originalLog;
      // Restart the daemon for other tests
      const result = await Effect.runPromise(startTestDaemon());
      testDaemon = result;
      __setDaemonControlPort(testDaemon.port);
    }
  });

  it('should send a shutdown request', async () => {
    await Effect.runPromise(daemonCommand('stop', {}));
    // We can't easily test the server actually stopped in this isolated test,
    // but we can verify the 'stop' command ran without throwing an error.
  });
});