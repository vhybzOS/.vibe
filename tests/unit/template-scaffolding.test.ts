/**
 * Template Scaffolding Tests
 *
 * Tests for `vibe init <runtime>` command functionality
 * Tests runtime-to-template mapping, template copying, and integration with initCommand
 *
 * @tested_by services/template-scaffolding.ts (Template copying service)
 * @tested_by cli.ts (CLI argument parsing for init <runtime>)
 */

import { assertEquals, assertRejects } from '@std/assert'
import { resolve } from '@std/path'
import { Effect } from 'effect'
import { describe, it } from '@std/testing/bdd'
import { withTempDir } from '../utils.ts'

// Import functions to test (these will be implemented)
// import { getRuntimeTemplate, copyTemplate, scaffoldProject } from '../../services/template-scaffolding.ts'
// import { TemplateScaffoldOptionsSchema } from '../../schemas/config.ts'

describe('Template Scaffolding - Runtime Mapping', () => {
  it('should map "node" runtime to "node-template"', async () => {
    // Test the convention mapping function
    // const templatePath = getRuntimeTemplate('node')
    // assertEquals(templatePath, 'node-template')
  })

  it('should map "deno" runtime to "deno-template"', async () => {
    // const templatePath = getRuntimeTemplate('deno')
    // assertEquals(templatePath, 'deno-template')
  })

  it('should reject unsupported runtime types', async () => {
    // await assertRejects(
    //   () => Effect.runPromise(getRuntimeTemplate('python')),
    //   Error,
    //   'Unsupported runtime: python'
    // )
  })

  it('should list supported runtimes', async () => {
    // const supportedRuntimes = getSupportedRuntimes()
    // assertEquals(supportedRuntimes, ['node', 'deno'])
  })
})

describe('Template Scaffolding - Template Access', () => {
  it('should locate embedded template directory', async () => {
    // Test that we can access embedded templates from binary
    // const templatePath = getTemplateSourcePath('node-template')
    // assertEquals(templatePath.includes('vibe-coding-project-starters/node-template'), true)
  })

  it('should validate template exists before copying', async () => {
    // await assertRejects(
    //   () => Effect.runPromise(validateTemplateExists('nonexistent-template')),
    //   Error,
    //   'Template not found: nonexistent-template'
    // )
  })

  it('should list files in template directory', async () => {
    // const files = await Effect.runPromise(listTemplateFiles('node-template'))
    // // Should include standard files from vibe-coding-project-starters/node-template/
    // assertEquals(files.includes('package.json'), true)
    // assertEquals(files.includes('AGENTS.md'), true)
    // assertEquals(files.includes('CLAUDE.md'), true)
  })
})

describe('Template Scaffolding - Project Name Handling', () => {
  it('should validate project name format', async () => {
    // Test valid project names
    // await Effect.runPromise(validateProjectName('my-project'))
    // await Effect.runPromise(validateProjectName('myProject'))
    // await Effect.runPromise(validateProjectName('my_project'))
  })

  it('should reject invalid project names', async () => {
    // await assertRejects(
    //   () => Effect.runPromise(validateProjectName('')),
    //   Error,
    //   'Project name cannot be empty'
    // )
    //
    // await assertRejects(
    //   () => Effect.runPromise(validateProjectName('my project')),
    //   Error,
    //   'Project name cannot contain spaces'
    // )
  })

  it('should handle existing directory names', async () => {
    await withTempDir(async (tempDir) => {
      // Create existing directory
      const existingDir = resolve(tempDir, 'existing-project')
      await Deno.mkdir(existingDir)

      // Should reject creating project with existing name
      // await assertRejects(
      //   () => Effect.runPromise(validateProjectPath(existingDir)),
      //   Error,
      //   'Directory already exists: existing-project'
      // )
    })
  })
})

describe('Template Scaffolding - File Copying', () => {
  it('should copy all template files recursively', async () => {
    await withTempDir(async (tempDir) => {
      const projectPath = resolve(tempDir, 'test-project')

      // This test will verify the main functionality
      // await Effect.runPromise(copyTemplate('node-template', projectPath))

      // Verify all expected files were copied
      // const copiedFiles = await Array.fromAsync(Deno.readDir(projectPath))
      // const fileNames = copiedFiles.map(f => f.name)
      // assertEquals(fileNames.includes('package.json'), true)
      // assertEquals(fileNames.includes('AGENTS.md'), true)
      // assertEquals(fileNames.includes('CLAUDE.md'), true)
    })
  })

  it('should preserve file permissions during copy', async () => {
    await withTempDir(async (tempDir) => {
      const projectPath = resolve(tempDir, 'test-project')

      // await Effect.runPromise(copyTemplate('deno-template', projectPath))

      // Verify key files exist and are readable
      // const denoJsonPath = resolve(projectPath, 'deno.json')
      // const stat = await Deno.stat(denoJsonPath)
      // assertEquals(stat.isFile, true)
    })
  })

  it('should handle template subdirectories', async () => {
    await withTempDir(async (tempDir) => {
      const projectPath = resolve(tempDir, 'test-project')

      // If templates have subdirectories, they should be copied too
      // await Effect.runPromise(copyTemplate('node-template', projectPath))

      // This test ensures recursive copying works correctly
      // Additional subdirectory checks would go here if templates had them
    })
  })
})

describe('Template Scaffolding - Integration with initCommand', () => {
  it('should create .vibe folder after template copy', async () => {
    await withTempDir(async (tempDir) => {
      const projectPath = resolve(tempDir, 'test-project')

      // This tests the full workflow
      // await Effect.runPromise(scaffoldProject('node', 'test-project', tempDir))

      // Verify template was copied
      // const packageJsonPath = resolve(projectPath, 'package.json')
      // assertEquals(await Deno.stat(packageJsonPath).then(s => s.isFile), true)

      // Verify .vibe folder was created
      // const vibePath = resolve(projectPath, '.vibe')
      // assertEquals(await Deno.stat(vibePath).then(s => s.isDirectory), true)

      // Verify .vibe structure
      // const configPath = resolve(vibePath, 'config.json')
      // assertEquals(await Deno.stat(configPath).then(s => s.isFile), true)
    })
  })

  it('should use correct project name in .vibe/config.json', async () => {
    await withTempDir(async (tempDir) => {
      const projectName = 'my-test-project'
      const projectPath = resolve(tempDir, projectName)

      // await Effect.runPromise(scaffoldProject('deno', projectName, tempDir))

      // Verify project name in config
      // const configPath = resolve(projectPath, '.vibe', 'config.json')
      // const config = JSON.parse(await Deno.readTextFile(configPath))
      // assertEquals(config.projectName, projectName)
    })
  })
})

describe('Template Scaffolding - Error Handling', () => {
  it('should provide clear error for unsupported runtime', async () => {
    // await assertRejects(
    //   () => Effect.runPromise(scaffoldProject('python', 'test-project', '/tmp')),
    //   Error,
    //   'Unsupported runtime: python. Supported runtimes: node, deno'
    // )
  })

  it('should provide clear error for existing directory', async () => {
    await withTempDir(async (tempDir) => {
      const projectName = 'existing-project'
      const projectPath = resolve(tempDir, projectName)
      await Deno.mkdir(projectPath)

      // await assertRejects(
      //   () => Effect.runPromise(scaffoldProject('node', projectName, tempDir)),
      //   Error,
      //   'Directory already exists: existing-project'
      // )
    })
  })

  it('should handle permission errors gracefully', async () => {
    // Test for scenarios where user doesn't have write permissions
    // This would be more relevant in restricted environments
  })
})

describe('Template Scaffolding - Schema Validation', () => {
  it('should validate template scaffold options schema', async () => {
    // Test the new schema additions
    // const validOptions = {
    //   runtime: 'node',
    //   projectName: 'my-project',
    //   targetDirectory: '/tmp'
    // }
    //
    // const parsed = TemplateScaffoldOptionsSchema.parse(validOptions)
    // assertEquals(parsed.runtime, 'node')
    // assertEquals(parsed.projectName, 'my-project')
  })

  it('should reject invalid runtime in schema', async () => {
    // const invalidOptions = {
    //   runtime: 'invalid',
    //   projectName: 'my-project',
    //   targetDirectory: '/tmp'
    // }
    //
    // assertRejects(
    //   () => TemplateScaffoldOptionsSchema.parse(invalidOptions),
    //   Error,
    //   'Invalid runtime'
    // )
  })
})
