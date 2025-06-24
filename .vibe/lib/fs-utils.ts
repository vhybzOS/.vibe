/**
 * File system utilities for v2 algorithms - Re-exports from proven patterns
 * 
 * @tested_by ../../../tests/unit/fs-utils.test.ts (File operations, directory management)
 */

export { ensureDir, fileExists, readJSONFile, readTextFile, writeJSONFile, writeTextFile } from '../../../ure/lib/fs.ts'

export { createConfigurationError, createFileSystemError, type VibeError } from '../../../ure/lib/errors.ts'
