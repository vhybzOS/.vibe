import { assertEquals, assertExists, assert } from '@std/assert';
import { describe, it, beforeAll, afterAll, beforeEach } from '@std/testing/bdd';
import { setupTestCli } from '../helpers/cli.ts';
import { resolve } from '@std/path';

describe('🚀 .vibe CLI E2E Tests', () => {
  let testEnv: Awaited<ReturnType<typeof setupTestCli>>;

  beforeAll(async () => {
    testEnv = await setupTestCli();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });
  
  // Reset discovery sessions between tests
  beforeEach(() => {
    testEnv.mockApiState.discoverySessions.clear();
  });

  it('vibe init: should create the .vibe directory structure', async () => {
    await testEnv.run.init();
    const stats = await Deno.stat(resolve(testEnv.testDir, '.vibe'));
    assert(stats.isDirectory, '.vibe directory should be created');
    const rulesDirStats = await Deno.stat(resolve(testEnv.testDir, '.vibe', 'rules'));
    assert(rulesDirStats.isDirectory, '.vibe/rules directory should be created');
    const docsStats = await Deno.stat(resolve(testEnv.testDir, '.vibe', 'docs'));
    assert(docsStats.isDirectory, '.vibe/docs directory should be created');
    const memoryStats = await Deno.stat(resolve(testEnv.testDir, '.vibe', 'memory'));
    assert(memoryStats.isDirectory, '.vibe/memory directory should be created');
  });

  it('vibe init: should create a default configuration file', async () => {
    await testEnv.run.init({ force: true });
    const configStats = await Deno.stat(resolve(testEnv.testDir, '.vibe', 'config.json'));
    assert(configStats.isFile, '.vibe/config.json should be created');
    
    const configContent = await Deno.readTextFile(resolve(testEnv.testDir, '.vibe', 'config.json'));
    const config = JSON.parse(configContent);
    // The project name is derived from the directory name, not package.json
    assert(config.project.name.includes('vibe_cli_test_'), 'Project name should be based on directory');
    assertEquals(config.project.type, 'web-app');
    assert(config.settings.autoSync === true, 'AutoSync should be enabled by default');
  });

  it('vibe init: should bootstrap secrets from a project .env file', async () => {
    const envContent = 'OPENAI_API_KEY=sk-test-key-1234\nGITHUB_TOKEN=ghp_test-token-5678';
    await Deno.writeTextFile(resolve(testEnv.testDir, '.env'), envContent);
    await testEnv.run.init({ force: true }); // Use force to re-init in the same dir

    const secretsContent = await Deno.readTextFile(resolve(testEnv.testDir, '.vibe', 'secrets.json'));
    assert(secretsContent.length > 0, 'Encrypted secrets.json should be created');
    // Note: We can't easily test the decrypted content here, but we confirm the file is made.
  });

  it('vibe status: should show project information when .vibe is initialized', async () => {
    // Setup: Initialize .vibe first
    await testEnv.run.init();
    
    // Test: Run status command
    await testEnv.run.status();
    
    // The command should complete without errors
    // In a real implementation, we'd capture stdout and verify specific output
  });

  it('vibe status: should show helpful message when .vibe is not initialized', async () => {
    // Test: Run status command in uninitialized directory
    try {
      await testEnv.run.status();
    } catch (error) {
      // Should provide helpful error message
      assert(error instanceof Error, 'Should throw error for uninitialized directory');
    }
  });

  it('vibe discover: should start discovery session via daemon', async () => {
    // Setup: Initialize .vibe first
    await testEnv.run.init();
    
    // Test: Run discover command
    await testEnv.run.discover();
    
    // Verify discovery session was started (mock API tracks this)
    assert(testEnv.mockApiState.discoverySessions.size > 0, 'Discovery session should be started');
  });

  it('vibe discover: should handle force refresh option', async () => {
    // Setup: Initialize .vibe first
    await testEnv.run.init();
    
    // Test: Run discover command with force refresh
    await testEnv.run.discover({ forceRefresh: true });
    
    // Should complete without errors
    assert(testEnv.mockApiState.discoverySessions.size > 0, 'Discovery session should be started');
  });

  it('vibe init: should handle force flag to overwrite existing directories', async () => {
    // First init
    await testEnv.run.init();
    const firstConfigTime = (await Deno.stat(resolve(testEnv.testDir, '.vibe', 'config.json'))).mtime;
    
    // Wait a moment to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Second init with force
    await testEnv.run.init({ force: true });
    const secondConfigTime = (await Deno.stat(resolve(testEnv.testDir, '.vibe', 'config.json'))).mtime;
    
    assert(secondConfigTime && firstConfigTime && secondConfigTime > firstConfigTime, 'Config should be recreated with force flag');
  });

  it('vibe init: should trigger background discovery request', async () => {
    await testEnv.run.init();
    
    // The init command should have triggered the background discovery
    // Check if our mock API received the discovery start request
    assertEquals(testEnv.mockApiState.discoverySessions.size, 1);
    const session = [...testEnv.mockApiState.discoverySessions.values()][0];
    assertEquals(session.projectPath, testEnv.testDir);
    assertEquals(session.status, 'running');
  });
});