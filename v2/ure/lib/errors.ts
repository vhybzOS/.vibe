/**
 * Error system for v2 - Re-exports from root
 * Surgical copy of proven tagged union error patterns
 */

export {
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
