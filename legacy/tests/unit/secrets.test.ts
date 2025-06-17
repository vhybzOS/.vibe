import { assert, assertEquals, assertExists } from '@std/assert'
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd'
import { Effect } from 'effect'
import {
  getSecret,
  getSecretsStatus,
  loadSecrets,
  removeSecret,
  saveSecrets,
  type SecretProvider,
  type Secrets,
  setSecret,
} from '../../daemon/services/secrets_service.ts'

describe('🔐 Secrets Service Unit Tests', () => {
  let originalHome: string | undefined
  let testHomeDir: string

  beforeEach(async () => {
    // Create a temporary home directory for testing
    testHomeDir = await Deno.makeTempDir({ prefix: 'vibe-secrets-test-' })
    originalHome = Deno.env.get('HOME')
    Deno.env.set('HOME', testHomeDir)
  })

  afterEach(async () => {
    // Restore original HOME environment variable
    if (originalHome) {
      Deno.env.set('HOME', originalHome)
    } else {
      Deno.env.delete('HOME')
    }

    // Clean up test directory
    try {
      await Deno.remove(testHomeDir, { recursive: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('💾 Secret Storage and Retrieval', () => {
    it('should handle empty secrets initially', async () => {
      const secrets = await Effect.runPromise(loadSecrets())
      assertEquals(Object.keys(secrets).length, 0)

      const status = await Effect.runPromise(getSecretsStatus())
      assertEquals(status.openai, false)
      assertEquals(status.anthropic, false)
      assertEquals(status.github, false)
      assertEquals(status.gitlab, false)
      assertEquals(status.google, false)
      assertEquals(status.azure, false)
    })

    it('should set and retrieve a secret', async () => {
      const testKey = 'sk-1234567890abcdef1234567890abcdef'

      // Set the secret
      await Effect.runPromise(setSecret('openai', testKey))

      // Retrieve the secret
      const retrievedKey = await Effect.runPromise(getSecret('openai'))
      assertEquals(retrievedKey, testKey)

      // Check status
      const status = await Effect.runPromise(getSecretsStatus())
      assertEquals(status.openai, true)
      assertEquals(status.anthropic, false)
    })

    it('should set multiple secrets', async () => {
      const openaiKey = 'sk-1234567890abcdef1234567890abcdef'
      const anthropicKey = 'sk-ant-1234567890abcdef1234567890abcdef'
      const githubToken = 'ghp_1234567890abcdef1234567890abcdef'

      // Set multiple secrets
      await Effect.runPromise(setSecret('openai', openaiKey))
      await Effect.runPromise(setSecret('anthropic', anthropicKey))
      await Effect.runPromise(setSecret('github', githubToken))

      // Verify all secrets
      const openaiRetrieved = await Effect.runPromise(getSecret('openai'))
      const anthropicRetrieved = await Effect.runPromise(getSecret('anthropic'))
      const githubRetrieved = await Effect.runPromise(getSecret('github'))

      assertEquals(openaiRetrieved, openaiKey)
      assertEquals(anthropicRetrieved, anthropicKey)
      assertEquals(githubRetrieved, githubToken)

      // Check status
      const status = await Effect.runPromise(getSecretsStatus())
      assertEquals(status.openai, true)
      assertEquals(status.anthropic, true)
      assertEquals(status.github, true)
      assertEquals(status.gitlab, false)
      assertEquals(status.google, false)
      assertEquals(status.azure, false)
    })

    it('should remove a secret', async () => {
      const testKey = 'sk-1234567890abcdef1234567890abcdef'

      // Set the secret
      await Effect.runPromise(setSecret('openai', testKey))

      // Verify it exists
      let status = await Effect.runPromise(getSecretsStatus())
      assertEquals(status.openai, true)

      // Remove the secret
      await Effect.runPromise(removeSecret('openai'))

      // Verify it's gone
      const retrievedKey = await Effect.runPromise(getSecret('openai'))
      assertEquals(retrievedKey, undefined)

      status = await Effect.runPromise(getSecretsStatus())
      assertEquals(status.openai, false)
    })

    it('should handle non-existent secrets gracefully', async () => {
      const retrievedKey = await Effect.runPromise(getSecret('openai'))
      assertEquals(retrievedKey, undefined)
    })

    it('should overwrite existing secrets', async () => {
      const firstKey = 'sk-1234567890abcdef1234567890abcdef'
      const secondKey = 'sk-abcdef1234567890abcdef1234567890'

      // Set initial secret
      await Effect.runPromise(setSecret('openai', firstKey))
      let retrievedKey = await Effect.runPromise(getSecret('openai'))
      assertEquals(retrievedKey, firstKey)

      // Overwrite with new secret
      await Effect.runPromise(setSecret('openai', secondKey))
      retrievedKey = await Effect.runPromise(getSecret('openai'))
      assertEquals(retrievedKey, secondKey)
    })
  })

  describe('🔒 Encryption and Persistence', () => {
    it('should persist secrets across service restarts', async () => {
      const testKey = 'sk-1234567890abcdef1234567890abcdef'

      // Set a secret
      await Effect.runPromise(setSecret('openai', testKey))

      // Simulate service restart by loading secrets fresh
      const loadedSecrets = await Effect.runPromise(loadSecrets())
      assertEquals(loadedSecrets.openai, testKey)
    })

    it('should encrypt secrets in the file system', async () => {
      const testKey = 'sk-1234567890abcdef1234567890abcdef'

      // Set a secret
      await Effect.runPromise(setSecret('openai', testKey))

      // Check that the secrets file exists and is encrypted
      const secretsFilePath = `${testHomeDir}/.config/vibe/secrets.json`
      const fileContent = await Deno.readTextFile(secretsFilePath)
      const parsedFile = JSON.parse(fileContent)

      // Should have encrypted file structure
      assertExists(parsedFile.version)
      assertExists(parsedFile.algorithm)
      assertExists(parsedFile.iv)
      assertExists(parsedFile.salt)
      assertExists(parsedFile.data)
      assertEquals(parsedFile.algorithm, 'AES-GCM')

      // The raw file should not contain the secret in plain text
      assert(!fileContent.includes(testKey))
    })

    it('should handle corrupted secrets file gracefully', async () => {
      // Create a corrupted secrets file
      const secretsFilePath = `${testHomeDir}/.config/vibe/secrets.json`
      await Deno.mkdir(`${testHomeDir}/.config/vibe`, { recursive: true })
      await Deno.writeTextFile(secretsFilePath, '{ invalid json }')

      // Should not throw and should return empty secrets
      const secrets = await Effect.runPromise(loadSecrets())
      assertEquals(Object.keys(secrets).length, 0)
    })

    it('should create config directory if it does not exist', async () => {
      const testKey = 'sk-1234567890abcdef1234567890abcdef'

      // Ensure config directory doesn't exist
      const configDir = `${testHomeDir}/.config/vibe`
      try {
        await Deno.remove(configDir, { recursive: true })
      } catch {
        // Directory might not exist, that's fine
      }

      // Set a secret (should create directory)
      await Effect.runPromise(setSecret('openai', testKey))

      // Verify directory was created
      const stat = await Deno.stat(configDir)
      assert(stat.isDirectory)

      // Verify secret was saved
      const retrievedKey = await Effect.runPromise(getSecret('openai'))
      assertEquals(retrievedKey, testKey)
    })
  })

  describe('🔧 Edge Cases and Error Handling', () => {
    it('should handle empty secret values', async () => {
      // Setting an empty secret should work

      // But we can still set it if needed
      await Effect.runPromise(setSecret('openai', ''))
      const retrieved = await Effect.runPromise(getSecret('openai'))
      assertEquals(retrieved, '')

      const status = await Effect.runPromise(getSecretsStatus())
      assertEquals(status.openai, false) // Empty string is falsy
    })

    it('should handle all supported providers', async () => {
      const providers: SecretProvider[] = [
        'openai',
        'anthropic',
        'github',
        'gitlab',
        'google',
        'azure',
        'cohere',
      ]
      const testValues: Record<SecretProvider, string> = {
        openai: 'sk-1234567890abcdef1234567890abcdef',
        anthropic: 'sk-ant-1234567890abcdef1234567890abcdef',
        github: 'ghp_1234567890abcdef1234567890abcdef',
        gitlab: 'gitlab-token-12345678901234567890',
        google: 'google-api-key-12345678901234567890',
        azure: 'azure-key-12345678901234567890',
        cohere: 'cohere-key-1234567890abcdef1234567890abcdef',
      }

      // Set all secrets
      for (const provider of providers) {
        await Effect.runPromise(setSecret(provider, testValues[provider]))
      }

      // Verify all secrets
      for (const provider of providers) {
        const retrieved = await Effect.runPromise(getSecret(provider))
        assertEquals(retrieved, testValues[provider])
      }

      // Check status
      const status = await Effect.runPromise(getSecretsStatus())
      for (const provider of providers) {
        assertEquals(status[provider], true)
      }
    })

    it('should handle direct secrets loading and saving', async () => {
      const testSecrets: Secrets = {
        openai: 'sk-1234567890abcdef1234567890abcdef',
        github: 'ghp_1234567890abcdef1234567890abcdef',
      }

      // Save secrets directly
      await Effect.runPromise(saveSecrets(testSecrets))

      // Load secrets directly
      const loadedSecrets = await Effect.runPromise(loadSecrets())
      assertEquals(loadedSecrets.openai, testSecrets.openai)
      assertEquals(loadedSecrets.github, testSecrets.github)
      assertEquals(loadedSecrets.anthropic, undefined)
    })

    it('should handle different environment variables for home directory', async () => {
      // Test with USERPROFILE (Windows-style)
      Deno.env.delete('HOME')
      Deno.env.set('USERPROFILE', testHomeDir)

      const testKey = 'sk-1234567890abcdef1234567890abcdef'
      await Effect.runPromise(setSecret('openai', testKey))

      const retrieved = await Effect.runPromise(getSecret('openai'))
      assertEquals(retrieved, testKey)

      // Clean up
      Deno.env.delete('USERPROFILE')
      Deno.env.set('HOME', testHomeDir)
    })
  })
})
