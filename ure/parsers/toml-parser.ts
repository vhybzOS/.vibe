/**
 * TOML Parser Service
 *
 * Fast TOML parsing using @std/toml for metadata indexes
 * Provides type-safe parsing with Effect-TS error handling
 *
 * @tested_by tests/unit/toml-parser.test.ts (Core parsing, error handling, schema validation, merging)
 * @tested_by tests/integration/rule-manager.test.ts (Integration with rule management)
 * @tested_by tests/integration/dependency-fetcher.test.ts (Integration with dependency storage)
 */

import { Effect, pipe } from 'effect'
import { parse as parseToml, stringify as stringifyToml } from '@std/toml'
import { z } from 'zod/v4'
import { createConfigurationError, type VibeError } from '../lib/errors.ts'

/**
 * TOML value types according to TOML specification
 */
export type TomlValue =
  | string
  | number
  | boolean
  | Date
  | TomlValue[]
  | { [key: string]: TomlValue }

export type TomlObject = Record<string, TomlValue>

/**
 * Parses TOML content with schema validation
 */
export const parseTomlWithSchema = <T>(
  content: string,
  schema: z.ZodSchema<T>,
  filePath: string = 'unknown',
): Effect.Effect<T, VibeError, never> =>
  pipe(
    Effect.try({
      try: () => parseToml(content),
      catch: (error) =>
        createConfigurationError(
          error,
          `Failed to parse TOML at ${filePath}`,
        ),
    }),
    Effect.flatMap((parsed) =>
      Effect.try({
        try: () => schema.parse(parsed),
        catch: (error) =>
          createConfigurationError(
            error,
            `Invalid TOML schema at ${filePath}`,
          ),
      })
    ),
  )

/**
 * Parses TOML content without schema validation
 */
export const parseTomlRaw = (
  content: string,
  filePath: string = 'unknown',
): Effect.Effect<TomlObject, VibeError, never> =>
  Effect.try({
    try: () => parseToml(content) as TomlObject,
    catch: (error) =>
      createConfigurationError(
        error,
        `Failed to parse TOML at ${filePath}`,
      ),
  })

/**
 * Stringifies object to TOML format
 */
export const stringifyToToml = <T extends TomlObject>(
  data: T,
): Effect.Effect<string, VibeError, never> =>
  Effect.try({
    try: () => stringifyToml(data),
    catch: (error) =>
      createConfigurationError(
        error,
        'Failed to stringify to TOML',
      ),
  })

/**
 * Updates a TOML file with new data while preserving structure
 */
export const updateTomlSection = <T extends TomlValue>(
  originalContent: string,
  sectionPath: string,
  newData: T,
): Effect.Effect<string, VibeError, never> =>
  pipe(
    parseTomlRaw(originalContent),
    Effect.map((parsed) => {
      // Navigate to section and update
      const pathParts = sectionPath.split('.')
      let current = parsed

      // Navigate to parent section
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i]
        if (part && (!current[part] || typeof current[part] !== 'object')) {
          current[part] = {}
        }
        if (part && current[part]) {
          current = current[part] as TomlObject
        }
      }

      // Update the target section
      const lastPart = pathParts[pathParts.length - 1]
      if (lastPart) {
        current[lastPart] = newData
      }

      return parsed
    }),
    Effect.flatMap(stringifyToToml),
  )

/**
 * Merges two TOML objects deeply
 */
export const mergeTomlObjects = <T extends TomlObject>(
  base: T,
  updates: TomlObject,
): T => {
  const merged = { ...base } as T

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        typeof merged[key] === 'object' &&
        merged[key] !== null &&
        !Array.isArray(merged[key])
      ) {
        // Deep merge objects
        ;(merged as TomlObject)[key] = mergeTomlObjects(
          merged[key] as TomlObject,
          value as TomlObject,
        )
      } else {
        // Direct assignment for primitives and arrays
        ;(merged as TomlObject)[key] = value
      }
    }
  }

  return merged
}
