/**
 * Global secrets management service for the .vibe daemon
 * Handles secure storage and retrieval of API keys and tokens
 * All secrets are encrypted at rest using Web Crypto API
 */

import { Effect, pipe } from 'effect'
import { resolve } from '@std/path'
import { ensureDir, fileExists, logWithContext, readTextFile, writeTextFile } from '../../lib/effects.ts'

/**
 * Supported secret providers
 */
export type SecretProvider =
  | 'openai'
  | 'anthropic'
  | 'github'
  | 'gitlab'
  | 'google'
  | 'azure'
  | 'cohere'

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
export type Secrets = {
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
const getSecretsFilePath = (projectPath?: string): string => {
  if (projectPath) {
    return resolve(projectPath, '.vibe', 'secrets.json')
  }
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
          ['deriveKey'],
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
          ['encrypt', 'decrypt'],
        )

        return key
      },
      catch: (error) => new Error(`Failed to derive encryption key: ${error}`),
    }),
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
          data,
        )

        // Return the encrypted file structure
        const encryptedFile: EncryptedSecretsFile = {
          version: '1.0',
          algorithm: ENCRYPTION_CONFIG.algorithm,
          iv: Array.from(iv).map((b) => b.toString(16).padStart(2, '0')).join(''),
          salt: Array.from(salt).map((b) => b.toString(16).padStart(2, '0')).join(''),
          data: Array.from(new Uint8Array(encryptedData)).map((b) => b.toString(16).padStart(2, '0')).join(''),
        }

        return encryptedFile
      },
      catch: (error) => new Error(`Failed to encrypt secrets: ${error}`),
    }),
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
          encryptedFile.iv.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) || [],
        )
        const salt = new Uint8Array(
          encryptedFile.salt.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) || [],
        )
        const encryptedData = new Uint8Array(
          encryptedFile.data.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) || [],
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
          encryptedData,
        )

        // Parse the decrypted JSON
        const decoder = new TextDecoder()
        const secretsJson = decoder.decode(decryptedData)
        const secrets = JSON.parse(secretsJson) as Secrets

        return secrets
      },
      catch: (error) => new Error(`Failed to decrypt secrets: ${error}`),
    }),
  )

/**
 * Loads secrets from the encrypted file
 * Returns empty object if file doesn't exist or cannot be decrypted
 */
export const loadSecrets = (projectPath?: string) =>
  pipe(
    fileExists(getSecretsFilePath(projectPath)),
    Effect.flatMap((exists) => {
      if (!exists) {
        return Effect.succeed({} as Secrets)
      }

      return pipe(
        readTextFile(getSecretsFilePath(projectPath)),
        Effect.flatMap((content) =>
          Effect.try({
            try: () => JSON.parse(content) as EncryptedSecretsFile,
            catch: () => new Error('Invalid secrets file format'),
          })
        ),
        Effect.flatMap((encryptedFile) => decryptSecrets(encryptedFile)),
        Effect.catchAll((error) => {
          console.warn(`Failed to load secrets: ${error.message}`)
          return Effect.succeed({} as Secrets)
        }),
      )
    }),
  )

/**
 * Saves secrets to the encrypted file
 */
export const saveSecrets = (secrets: Secrets, projectPath?: string) =>
  pipe(
    ensureDir(projectPath ? resolve(projectPath, '.vibe') : getSecretsDirectory()),
    Effect.flatMap(() => encryptSecrets(secrets)),
    Effect.flatMap((encryptedFile) =>
      writeTextFile(getSecretsFilePath(projectPath), JSON.stringify(encryptedFile, null, 2))
    ),
    Effect.tap(() => Effect.log(`🔐 Secrets saved to ${getSecretsFilePath(projectPath)}`)),
  )

/**
 * Gets the status of all secrets (which ones are set)
 * Does not reveal the actual secret values
 */
export const getSecretsStatus = () =>
  pipe(
    loadSecrets(),
    Effect.map((secrets) => {
      const status: SecretsStatus = {
        openai: !!secrets.openai,
        anthropic: !!secrets.anthropic,
        github: !!secrets.github,
        gitlab: !!secrets.gitlab,
        google: !!secrets.google,
        azure: !!secrets.azure,
        cohere: !!secrets.cohere,
      }
      return status
    }),
  )

/**
 * Sets a secret for a specific provider
 */
export const setSecret = (provider: SecretProvider, value: string, projectPath?: string) =>
  pipe(
    loadSecrets(projectPath),
    Effect.map((secrets) => ({
      ...secrets,
      [provider]: value,
    })),
    Effect.flatMap((updatedSecrets) => saveSecrets(updatedSecrets, projectPath)),
    Effect.tap(() =>
      Effect.log(
        `🔑 Secret set for provider: ${provider} at ${projectPath ? 'project' : 'global'} level`,
      )
    ),
  )

/**
 * Gets a secret for a specific provider, checking project-level first, then global fallback.
 */
export const getSecret = (provider: SecretProvider, projectPath?: string) =>
  pipe(
    // 1. Try to load from the project-specific path
    projectPath ? loadSecrets(projectPath) : Effect.succeed({} as Secrets),
    Effect.flatMap((projectSecrets) => {
      if (projectSecrets[provider]) {
        logWithContext('Secrets', `🔐 Using project secret for ${provider}`).pipe(Effect.runSync)
        return Effect.succeed(projectSecrets[provider])
      }

      // 2. If not found, try the global path
      return pipe(
        loadSecrets(), // No projectPath means global
        Effect.map((globalSecrets) => {
          if (globalSecrets[provider]) {
            logWithContext('Secrets', `🌐 Using global fallback secret for ${provider}`).pipe(
              Effect.runSync,
            )
          }
          return globalSecrets[provider]
        }),
      )
    }),
  )

/**
 * Removes a secret for a specific provider
 */
export const removeSecret = (provider: SecretProvider) =>
  pipe(
    loadSecrets(),
    Effect.map((secrets) => {
      const updated = { ...secrets }
      delete updated[provider]
      return updated
    }),
    Effect.flatMap((updatedSecrets) => saveSecrets(updatedSecrets)),
    Effect.tap(() => Effect.log(`🗑️ Secret removed for provider: ${provider}`)),
  )

/**
 * Infers the provider from API key format
 */
const inferProviderFromKey = (apiKey: string): SecretProvider | null => {
  if (apiKey.startsWith('sk-ant-')) {
    return 'anthropic'
  }
  if (apiKey.startsWith('sk-')) {
    return 'openai'
  }
  if (apiKey.startsWith('AIzaSy')) {
    return 'google'
  }
  // Cohere keys are alphanumeric and variable length, making them a good fallback.
  if (apiKey.length > 20 && /^[a-zA-Z0-9]+$/.test(apiKey)) {
    return 'cohere'
  }
  return null
}

/**
 * Infers the provider from the API key format and saves the secret.
 */
export const setSecretAndInferProvider = (apiKey: string, projectPath?: string) =>
  pipe(
    Effect.sync(() => inferProviderFromKey(apiKey)),
    Effect.flatMap((provider) => {
      if (!provider) {
        return Effect.fail(
          new Error(
            'Could not infer provider from API key format. Key is invalid or provider is not supported.',
          ),
        )
      }
      return setSecret(provider, apiKey, projectPath)
    }),
  )
