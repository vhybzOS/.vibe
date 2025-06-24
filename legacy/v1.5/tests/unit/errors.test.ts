/**
 * Functional Error System Tests
 *
 * Tests for ure/lib/errors.ts
 * Validates tagged union error system and helper functions
 */

import { assertEquals } from '@std/assert'
import {
  type CliError,
  type ConfigurationError,
  createCliError,
  createConfigurationError,
  createCryptoError,
  createDaemonError,
  createDiscoveryError,
  createFileSystemError,
  createMcpError,
  createNetworkError,
  createParseError,
  createTimeoutError,
  createVersionError,
  type CryptoError,
  type DaemonError,
  type DiscoveryError,
  type FileSystemError,
  type McpError,
  type NetworkError,
  type ParseError,
  type TimeoutError,
  type VersionError,
  type VibeError,
} from '../../ure/lib/errors.ts'

Deno.test('Errors - createFileSystemError - creates proper error structure', () => {
  const originalError = new Error('ENOENT: no such file or directory')
  const path = '/tmp/missing-file.txt'
  const message = 'Failed to read file'

  const error = createFileSystemError(originalError, path, message)

  assertEquals(error._tag, 'FileSystemError')
  assertEquals(error.error, originalError)
  assertEquals(error.path, path)
  assertEquals(error.message, message)
})

Deno.test('Errors - createConfigurationError - creates proper error structure', () => {
  const originalError = new Error('Invalid JSON syntax')
  const message = 'Configuration file is malformed'

  const error = createConfigurationError(originalError, message)

  assertEquals(error._tag, 'ConfigurationError')
  assertEquals(error.error, originalError)
  assertEquals(error.message, message)
})

Deno.test('Errors - createParseError - creates proper error structure', () => {
  const originalError = new SyntaxError('Unexpected token')
  const content = '{ invalid: json }'
  const message = 'Failed to parse JSON content'

  const error = createParseError(originalError, content, message)

  assertEquals(error._tag, 'ParseError')
  assertEquals(error.error, originalError)
  assertEquals(error.content, content)
  assertEquals(error.message, message)
})

Deno.test('Errors - createNetworkError - creates proper error structure without URL', () => {
  const originalError = new Error('Connection refused')
  const message = 'Failed to connect to server'

  const error = createNetworkError(originalError, message)

  assertEquals(error._tag, 'NetworkError')
  assertEquals(error.error, originalError)
  assertEquals(error.message, message)
  assertEquals(error.url, undefined)
})

Deno.test('Errors - createNetworkError - creates proper error structure with URL', () => {
  const originalError = new Error('404 Not Found')
  const message = 'Resource not found'
  const url = 'https://api.example.com/data'

  const error = createNetworkError(originalError, message, url)

  assertEquals(error._tag, 'NetworkError')
  assertEquals(error.error, originalError)
  assertEquals(error.message, message)
  assertEquals(error.url, url)
})

Deno.test('Errors - createCryptoError - creates proper error structure', () => {
  const originalError = new Error('Invalid key format')
  const message = 'Failed to decrypt data'

  const error = createCryptoError(originalError, message)

  assertEquals(error._tag, 'CryptoError')
  assertEquals(error.error, originalError)
  assertEquals(error.message, message)
})

Deno.test('Errors - createDiscoveryError - creates proper error structure', () => {
  const originalError = new Error('No tools found')
  const message = 'Failed to discover MCP tools'

  const error = createDiscoveryError(originalError, message)

  assertEquals(error._tag, 'DiscoveryError')
  assertEquals(error.error, originalError)
  assertEquals(error.message, message)
})

Deno.test('Errors - createVersionError - creates proper error structure', () => {
  const version = '0.1.0'
  const message = 'Unsupported version detected'

  const error = createVersionError(version, message)

  assertEquals(error._tag, 'VersionError')
  assertEquals(error.version, version)
  assertEquals(error.message, message)
})

Deno.test('Errors - createTimeoutError - creates proper error structure', () => {
  const timeoutMs = 5000
  const message = 'Operation exceeded time limit'

  const error = createTimeoutError(timeoutMs, message)

  assertEquals(error._tag, 'TimeoutError')
  assertEquals(error.timeoutMs, timeoutMs)
  assertEquals(error.message, message)
})

Deno.test('Errors - createDaemonError - creates proper error structure', () => {
  const originalError = new Error('Service unavailable')
  const message = 'Daemon service failed to start'
  const component = 'discovery-service'

  const error = createDaemonError(originalError, message, component)

  assertEquals(error._tag, 'DaemonError')
  assertEquals(error.error, originalError)
  assertEquals(error.message, message)
  assertEquals(error.component, component)
})

Deno.test('Errors - createMcpError - creates proper error structure', () => {
  const originalError = new Error('Protocol violation')
  const message = 'Invalid MCP message format'
  const operation = 'list_tools'

  const error = createMcpError(originalError, message, operation)

  assertEquals(error._tag, 'McpError')
  assertEquals(error.error, originalError)
  assertEquals(error.message, message)
  assertEquals(error.operation, operation)
})

Deno.test('Errors - createCliError - creates proper error structure', () => {
  const originalError = new Error('Invalid argument')
  const message = 'Command execution failed'
  const command = 'vibe init'

  const error = createCliError(originalError, message, command)

  assertEquals(error._tag, 'CliError')
  assertEquals(error.error, originalError)
  assertEquals(error.message, message)
  assertEquals(error.command, command)
})

Deno.test('Errors - VibeError union type - accepts all error types', () => {
  const errors: VibeError[] = [
    createFileSystemError(new Error('fs'), '/path', 'FS error'),
    createConfigurationError(new Error('config'), 'Config error'),
    createParseError(new Error('parse'), 'content', 'Parse error'),
    createNetworkError(new Error('network'), 'Network error'),
    createCryptoError(new Error('crypto'), 'Crypto error'),
    createDiscoveryError(new Error('discovery'), 'Discovery error'),
    createVersionError('1.0.0', 'Version error'),
    createTimeoutError(1000, 'Timeout error'),
    createDaemonError(new Error('daemon'), 'Daemon error', 'service'),
    createMcpError(new Error('mcp'), 'MCP error', 'operation'),
    createCliError(new Error('cli'), 'CLI error', 'command'),
  ]

  // All errors should have a _tag property
  errors.forEach((error) => {
    assertEquals(typeof error._tag, 'string')
    assertEquals(error._tag.endsWith('Error'), true)
  })
})

Deno.test('Errors - tagged union discrimination - switch statement', () => {
  const errors: VibeError[] = [
    createFileSystemError(new Error('fs'), '/path', 'FS error'),
    createConfigurationError(new Error('config'), 'Config error'),
    createNetworkError(new Error('network'), 'Network error', 'https://example.com'),
  ]

  const results = errors.map((error) => {
    switch (error._tag) {
      case 'FileSystemError':
        return `FileSystem: ${error.path}`
      case 'ConfigurationError':
        return `Configuration: ${error.message}`
      case 'NetworkError':
        return `Network: ${error.url || 'no-url'}`
      default:
        return 'Unknown error type'
    }
  })

  assertEquals(results, [
    'FileSystem: /path',
    'Configuration: Config error',
    'Network: https://example.com',
  ])
})

Deno.test('Errors - error properties immutability - readonly check', () => {
  const error = createFileSystemError(new Error('test'), '/path', 'Test error')

  // TypeScript should enforce readonly, but we can verify the structure
  assertEquals(typeof error._tag, 'string')
  assertEquals(typeof error.error, 'object')
  assertEquals(typeof error.path, 'string')
  assertEquals(typeof error.message, 'string')

  // Verify the error is properly structured
  const errorJson = JSON.stringify(error, (key, value) => {
    if (key === 'error') return value.message // Serialize Error objects
    return value
  })

  const parsed = JSON.parse(errorJson)
  assertEquals(parsed._tag, 'FileSystemError')
  assertEquals(parsed.path, '/path')
  assertEquals(parsed.message, 'Test error')
})

Deno.test('Errors - comprehensive error handling pattern', () => {
  // Simulate a function that could return different error types
  function processOperation(scenario: string): VibeError | null {
    switch (scenario) {
      case 'file-not-found':
        return createFileSystemError(
          new Error('ENOENT'),
          '/missing/file.txt',
          'File does not exist',
        )
      case 'invalid-config':
        return createConfigurationError(
          new Error('Invalid JSON'),
          'Configuration file is malformed',
        )
      case 'network-failure':
        return createNetworkError(
          new Error('Connection timeout'),
          'Failed to reach server',
          'https://api.example.com',
        )
      case 'success':
        return null
      default:
        return createCliError(
          new Error('Unknown scenario'),
          'Unexpected test scenario',
          'test-command',
        )
    }
  }

  // Test each scenario
  const fileError = processOperation('file-not-found')
  assertEquals(fileError?._tag, 'FileSystemError')
  assertEquals((fileError as FileSystemError)?.path, '/missing/file.txt')

  const configError = processOperation('invalid-config')
  assertEquals(configError?._tag, 'ConfigurationError')

  const networkError = processOperation('network-failure')
  assertEquals(networkError?._tag, 'NetworkError')
  assertEquals((networkError as NetworkError)?.url, 'https://api.example.com')

  const success = processOperation('success')
  assertEquals(success, null)

  const unknownError = processOperation('unknown')
  assertEquals(unknownError?._tag, 'CliError')
})
