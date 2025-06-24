/**
 * File system utilities for v2 - Re-exports from root
 * Surgical copy of proven patterns from ../../ure/lib/fs.ts
 */

export {
  createBackup,
  ensureDir,
  ensureVibeDirectory,
  fileExists,
  findFiles,
  listFiles,
  listJSONFiles,
  loadAllJSONFiles,
  loadConfig,
  loadSchemaValidatedJSON,
  readJSONFile,
  readTextFile,
  remove,
  saveJSONWithBackup,
  writeJSONFile,
  writeTextFile,
} from '../../ure/lib/fs.ts'
