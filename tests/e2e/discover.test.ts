import { describe, it, beforeAll, afterAll } from '@std/testing/bdd';
import { assertEquals, assertExists } from '@std/assert';
import { Effect } from 'effect';
import { enhancedDiscoverRules } from '../../daemon/services/enhanced_discovery_service.ts';
import { PackageMetadata } from '../../discovery/registries/base.ts';
import { startTestDaemon, type TestDaemon } from '../test_daemon.ts';

describe('Enhanced Discovery Service (E2E)', () => {
  let testDaemon: TestDaemon;
  let tempProjectPath: string;

  beforeAll(async () => {
    const result = await Effect.runPromise(startTestDaemon());
    testDaemon = result;
    
    // Create a temporary project directory for testing
    tempProjectPath = await Deno.makeTempDir({ prefix: 'vibe-discovery-test-' });
  });

  afterAll(async () => {
    testDaemon?.shutdown();
    
    // Clean up temporary project directory
    try {
      await Deno.remove(tempProjectPath, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should handle enhanced discovery without API keys gracefully', async () => {
    const mockMetadata: PackageMetadata = {
      name: 'test-package',
      version: '1.0.0',
      description: 'A test package for discovery',
      registry: 'npm',
      repository: '',
      homepage: '',
      language: 'typescript',
      framework: undefined,
      downloadUrl: '',
      publishedAt: new Date().toISOString(),
    };

    const result = await Effect.runPromise(enhancedDiscoverRules(mockMetadata, tempProjectPath));
    
    assertExists(result);
    assertEquals(result.method, 'inference');
    assertEquals(result.success, false);
    assertExists(result.rules);
    assertEquals(Array.isArray(result.rules), true);
  });

  it('should attempt direct discovery before inference', async () => {
    const mockMetadata: PackageMetadata = {
      name: 'another-test-package',
      version: '2.0.0',
      description: 'Another test package for discovery',
      registry: 'npm',
      repository: 'https://github.com/example/test-repo',
      homepage: 'https://example.com',
      language: 'typescript',
      framework: undefined,
      downloadUrl: '',
      publishedAt: new Date().toISOString(),
    };

    const result = await Effect.runPromise(enhancedDiscoverRules(mockMetadata, tempProjectPath));
    
    assertExists(result);
    // Should try direct discovery first, then fall back to inference
    assertExists(result.method);
    assertExists(result.rules);
    assertEquals(Array.isArray(result.rules), true);
  });

  it('should handle packages with missing metadata gracefully', async () => {
    const mockMetadata: PackageMetadata = {
      name: 'minimal-package',
      version: '1.0.0',
      description: '',
      registry: 'npm',
      repository: '',
      homepage: '',
      language: 'javascript',
      framework: undefined,
      downloadUrl: '',
      publishedAt: new Date().toISOString(),
    };

    const result = await Effect.runPromise(enhancedDiscoverRules(mockMetadata, tempProjectPath));
    
    assertExists(result);
    assertExists(result.method);
    assertExists(result.rules);
    assertEquals(Array.isArray(result.rules), true);
    // Even with minimal metadata, should not throw errors
  });

  it('should handle network timeouts and errors gracefully', async () => {
    const mockMetadata: PackageMetadata = {
      name: 'timeout-test-package',
      version: '1.0.0',
      description: 'Package for testing timeout scenarios',
      registry: 'npm',
      repository: 'https://github.com/nonexistent/timeout-repo',
      homepage: 'https://nonexistent-domain-12345.com',
      language: 'typescript',
      framework: undefined,
      downloadUrl: '',
      publishedAt: new Date().toISOString(),
    };

    // This should complete without throwing errors, even if external calls fail
    const result = await Effect.runPromise(enhancedDiscoverRules(mockMetadata, tempProjectPath));
    
    assertExists(result);
    assertExists(result.method);
    assertExists(result.rules);
    assertEquals(Array.isArray(result.rules), true);
  });

  it('should provide consistent result structure regardless of discovery method', async () => {
    const mockMetadata: PackageMetadata = {
      name: 'consistent-structure-package',
      version: '1.0.0',
      description: 'Package for testing result structure consistency',
      registry: 'npm',
      repository: '',
      homepage: '',
      language: 'typescript',
      framework: undefined,
      downloadUrl: '',
      publishedAt: new Date().toISOString(),
    };

    const result = await Effect.runPromise(enhancedDiscoverRules(mockMetadata, tempProjectPath));
    
    // Verify the result has consistent structure
    assertExists(result);
    assertExists(result.method);
    assertExists(result.rules);
    assertExists(result.success);
    assertEquals(Array.isArray(result.rules), true);
    assertEquals(typeof result.success, 'boolean');
    assertEquals(['direct', 'inference'].includes(result.method), true);
  });
});