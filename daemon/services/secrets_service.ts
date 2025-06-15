/**
 * Global secrets management service for the .vibe daemon
 * Handles secure storage and retrieval of API keys and tokens
 * All secrets are encrypted at rest using Web Crypto API
 */

import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { readTextFile, writeTextFile, ensureDir, fileExists, VibeError } from '../../lib/effects.ts'

/**
 * Supported secret providers
 */
export type SecretProvider = 'openai' | 'anthropic' | 'github' | 'gitlab' | 'google' | 'azure'

/**
 * Structure for storing encrypted secrets
 */
interface EncryptedSecretsFile {
  version: string
  algorithm: string
  iv: string
  salt: string
  data: string
}

/**
 * Raw secrets object (before encryption)
 */
export interface Secrets {
  [key in SecretProvider]?: string
}

/**
 * Public status of secrets (without revealing the actual keys)
 */
export type SecretsStatus = {
  [key in SecretProvider]: boolean
}

/**
 * Encryption key derivation parameters
 */
const ENCRYPTION_CONFIG = {
  algorithm: 'AES-GCM',
  keyLength: 256,
  ivLength: 12,
  saltLength: 16,
  iterations: 100000,
} as const

/**
 * Gets the global secrets directory path
 */
const getSecretsDirectory = (): string => {
  const home = Deno.env.get('HOME') || Deno.env.get('USERPROFILE') || '/tmp'
  return resolve(home, '.config', 'vibe')
}

/**
 * Gets the full path to the secrets file
 */
const getSecretsFilePath = (): string => {
  return resolve(getSecretsDirectory(), 'secrets.json')
}

/**
 * Derives an encryption key from a machine-specific identifier
 * Uses hostname + username as the basis for key derivation
 */
const deriveEncryptionKey = (salt: Uint8Array) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        // Create a machine-specific password using hostname and environment
        const hostname = Deno.hostname()
        const username = Deno.env.get('USER') || Deno.env.get('USERNAME') || 'vibe-user'
        const machineId = `${hostname}-${username}-vibe-secrets`
        
        // Encode the machine ID
        const encoder = new TextEncoder()
        const keyMaterial = await crypto.subtle.importKey(
          'raw',
          encoder.encode(machineId),
          'PBKDF2',
          false,
          ['deriveKey']
        )
        
        // Derive the actual encryption key
        const key = await crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt,
            iterations: ENCRYPTION_CONFIG.iterations,
            hash: 'SHA-256',
          },
          keyMaterial,
          {
            name: ENCRYPTION_CONFIG.algorithm,
            length: ENCRYPTION_CONFIG.keyLength,
          },
          false,
          ['encrypt', 'decrypt']
        )
        
        return key
      },
      catch: (error) => new VibeError(`Failed to derive encryption key: ${error}`, 'CRYPTO_ERROR'),
    })
  )

/**
 * Encrypts secrets data using AES-GCM
 */
const encryptSecrets = (secrets: Secrets) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        // Generate random IV and salt
        const iv = crypto.getRandomValues(new Uint8Array(ENCRYPTION_CONFIG.ivLength))
        const salt = crypto.getRandomValues(new Uint8Array(ENCRYPTION_CONFIG.saltLength))
        
        // Derive encryption key
        const key = await deriveEncryptionKey(salt).pipe(Effect.runPromise)
        
        // Encrypt the secrets
        const encoder = new TextEncoder()
        const data = encoder.encode(JSON.stringify(secrets))
        
        const encryptedData = await crypto.subtle.encrypt(
          {
            name: ENCRYPTION_CONFIG.algorithm,
            iv,
          },
          key,
          data
        )
        
        // Return the encrypted file structure
        const encryptedFile: EncryptedSecretsFile = {
          version: '1.0',
          algorithm: ENCRYPTION_CONFIG.algorithm,
          iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
          salt: Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join(''),
          data: Array.from(new Uint8Array(encryptedData)).map(b => b.toString(16).padStart(2, '0')).join(''),
        }
        
        return encryptedFile
      },
      catch: (error) => new VibeError(`Failed to encrypt secrets: ${error}`, 'CRYPTO_ERROR'),
    })
  )

/**
 * Decrypts secrets data using AES-GCM
 */
const decryptSecrets = (encryptedFile: EncryptedSecretsFile) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        // Parse IV and salt from hex strings
        const iv = new Uint8Array(
          encryptedFile.iv.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []
        )
        const salt = new Uint8Array(
          encryptedFile.salt.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []
        )
        const encryptedData = new Uint8Array(
          encryptedFile.data.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []
        )
        
        // Derive the same encryption key
        const key = await deriveEncryptionKey(salt).pipe(Effect.runPromise)
        
        // Decrypt the data
        const decryptedData = await crypto.subtle.decrypt(
          {
            name: ENCRYPTION_CONFIG.algorithm,
            iv,
          },
          key,
          encryptedData
        )
        
        // Parse the decrypted JSON
        const decoder = new TextDecoder()
        const secretsJson = decoder.decode(decryptedData)
        const secrets = JSON.parse(secretsJson) as Secrets
        
        return secrets
      },
      catch: (error) => new VibeError(`Failed to decrypt secrets: ${error}`, 'CRYPTO_ERROR'),
    })
  )

/**
 * Loads secrets from the encrypted file
 * Returns empty object if file doesn't exist or cannot be decrypted
 */
export const loadSecrets = () =>
  pipe(
    fileExists(getSecretsFilePath()),
    Effect.flatMap(exists => {
      if (!exists) {
        return Effect.succeed({} as Secrets)
      }
      
      return pipe(
        readTextFile(getSecretsFilePath()),
        Effect.flatMap(content => 
          Effect.try({
            try: () => JSON.parse(content) as EncryptedSecretsFile,
            catch: () => new VibeError('Invalid secrets file format', 'PARSE_ERROR'),
          })
        ),
        Effect.flatMap(encryptedFile => decryptSecrets(encryptedFile)),
        Effect.catchAll(error => {
          console.warn(`Failed to load secrets: ${error.message}`)
          return Effect.succeed({} as Secrets)
        })
      )
    })
  )

/**
 * Saves secrets to the encrypted file
 */
export const saveSecrets = (secrets: Secrets) =>
  pipe(
    ensureDir(getSecretsDirectory()),
    Effect.flatMap(() => encryptSecrets(secrets)),
    Effect.flatMap(encryptedFile => 
      writeTextFile(getSecretsFilePath(), JSON.stringify(encryptedFile, null, 2))
    ),
    Effect.tap(() => Effect.log(`🔐 Secrets saved to ${getSecretsFilePath()}`))
  )

/**
 * Gets the status of all secrets (which ones are set)
 * Does not reveal the actual secret values
 */
export const getSecretsStatus = () =>
  pipe(
    loadSecrets(),
    Effect.map(secrets => {
      const status: SecretsStatus = {
        openai: !!secrets.openai,
        anthropic: !!secrets.anthropic,
        github: !!secrets.github,
        gitlab: !!secrets.gitlab,
        google: !!secrets.google,
        azure: !!secrets.azure,
      }
      return status
    })
  )

/**
 * Sets a secret for a specific provider
 */
export const setSecret = (provider: SecretProvider, value: string) =>
  pipe(
    loadSecrets(),
    Effect.map(secrets => ({
      ...secrets,
      [provider]: value,
    })),
    Effect.flatMap(updatedSecrets => saveSecrets(updatedSecrets)),
    Effect.tap(() => Effect.log(`🔑 Secret set for provider: ${provider}`))
  )

/**
 * Gets a secret for a specific provider
 * Returns undefined if not set
 */
export const getSecret = (provider: SecretProvider) =>
  pipe(
    loadSecrets(),
    Effect.map(secrets => secrets[provider])
  )

/**
 * Removes a secret for a specific provider
 */
export const removeSecret = (provider: SecretProvider) =>
  pipe(
    loadSecrets(),
    Effect.map(secrets => {
      const updated = { ...secrets }
      delete updated[provider]
      return updated
    }),
    Effect.flatMap(updatedSecrets => saveSecrets(updatedSecrets)),
    Effect.tap(() => Effect.log(`🗑️ Secret removed for provider: ${provider}`))
  )

/**
 * Validates that a secret value is properly formatted for its provider
 */
export const validateSecretFormat = (provider: SecretProvider, value: string): boolean => {
  switch (provider) {
    case 'openai':
      return value.startsWith('sk-') && value.length > 20
    case 'anthropic':
      return value.startsWith('sk-ant-') && value.length > 20
    case 'github':
      return (value.startsWith('ghp_') || value.startsWith('github_pat_')) && value.length > 20
    case 'gitlab':
      return value.length > 10 // GitLab tokens are more variable
    case 'google':
      return value.length > 20 // Google API keys are variable
    case 'azure':
      return value.length > 20 // Azure keys are variable
    default:
      return value.length > 0
  }
}