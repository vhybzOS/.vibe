/**
 * @tested_by Template copying and project initialization
 * Tests the vibe init functionality and framework detection
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { TemplateManager } from '../lib/templates.ts'

Deno.test('Template Manager - Detect project type', async () => {
  const manager = new TemplateManager()

  // Test Deno project detection
  const denoProject = await manager.detectProjectType('/tmp/test-deno')
  await Deno.writeTextFile('/tmp/test-deno/deno.json', '{"name": "test"}')

  const detectedType = await manager.detectProjectType('/tmp/test-deno')
  assertEquals(detectedType, 'deno')

  // Cleanup
  await Deno.remove('/tmp/test-deno/deno.json')
  await Deno.remove('/tmp/test-deno')
})

Deno.test('Template Manager - Copy base template', async () => {
  const manager = new TemplateManager()
  const tempDir = '/tmp/test-vibe-init'

  await manager.initProject(tempDir, 'base')

  // Check essential files were copied
  const vibeDir = `${tempDir}/.vibe`
  const agentsFile = `${tempDir}/AGENTS.md`

  assertExists(await Deno.stat(vibeDir))
  assertExists(await Deno.stat(agentsFile))
  assertExists(await Deno.stat(`${vibeDir}/algorithms/main.md`))
  assertExists(await Deno.stat(`${vibeDir}/config.json`))

  // Cleanup
  await Deno.remove(tempDir, { recursive: true })
})

Deno.test('Template Manager - Framework-specific overlay', async () => {
  const manager = new TemplateManager()
  const tempDir = '/tmp/test-deno-init'

  await manager.initProject(tempDir, 'deno')

  // Check Deno-specific adaptations
  const config = JSON.parse(await Deno.readTextFile(`${tempDir}/.vibe/config.json`))
  assertEquals(config.framework, 'deno')
  assertExists(config.commands.test)
  assertExists(config.commands.lint)

  // Cleanup
  await Deno.remove(tempDir, { recursive: true })
})
