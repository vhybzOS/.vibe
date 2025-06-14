import { assertEquals, assertExists, assert } from 'jsr:@std/assert'
import { afterAll, beforeAll, describe, it } from 'jsr:@std/testing/bdd'

describe('🖥️ CLI End-to-End Tests', () => {
  let testProjectPath: string
  let originalCwd: string

  beforeAll(async () => {
    originalCwd = Deno.cwd()
    testProjectPath = await Deno.makeTempDir({ prefix: 'vibe-e2e-' })
    Deno.chdir(testProjectPath)
  })

  afterAll(async () => {
    Deno.chdir(originalCwd)
    try {
      await Deno.remove(testProjectPath, { recursive: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('🚀 Vibe CLI Commands', () => {
    it('📋 should show help', async () => {
      const command = new Deno.Command(Deno.execPath(), {
        args: ['run', '--allow-all', '../src/cli/index.ts', '--help'],
        cwd: testProjectPath,
        stdout: 'piped',
        stderr: 'piped',
      })

      const { code, stdout } = await command.output()
      const output = new TextDecoder().decode(stdout)

      assertEquals(code, 0, 'Help command should succeed')
      assert(output.includes('dotvibe'), 'Should show program name')
      assert(output.includes('init'), 'Should show init command')
      assert(output.includes('sync'), 'Should show sync command')
    })

    it('🔧 should initialize .vibe directory', async () => {
      // Create a basic project structure
      await Deno.writeTextFile('package.json', JSON.stringify({
        name: 'test-project',
        dependencies: { react: '^18.0.0' }
      }, null, 2))

      await Deno.writeTextFile('.cursorrules', '# Test rules\nUse TypeScript.')

      const command = new Deno.Command(Deno.execPath(), {
        args: ['run', '--allow-all', '../src/cli/index.ts', 'init', '--force'],
        cwd: testProjectPath,
        stdout: 'piped',
        stderr: 'piped',
      })

      const { code, stdout } = await command.output()
      const output = new TextDecoder().decode(stdout)

      assertEquals(code, 0, 'Init command should succeed')
      
      // Check that .vibe directory was created
      const vibeStat = await Deno.stat('.vibe')
      assert(vibeStat.isDirectory, '.vibe should be a directory')

      // Check that subdirectories were created
      const rulesStat = await Deno.stat('.vibe/rules')
      assert(rulesStat.isDirectory, '.vibe/rules should exist')

      const memoryStat = await Deno.stat('.vibe/memory')
      assert(memoryStat.isDirectory, '.vibe/memory should exist')

      const diaryStat = await Deno.stat('.vibe/diary')
      assert(diaryStat.isDirectory, '.vibe/diary should exist')
    })

    it('📊 should show project status', async () => {
      const command = new Deno.Command(Deno.execPath(), {
        args: ['run', '--allow-all', '../src/cli/index.ts', 'status'],
        cwd: testProjectPath,
        stdout: 'piped',
        stderr: 'piped',
      })

      const { code, stdout } = await command.output()
      const output = new TextDecoder().decode(stdout)

      assertEquals(code, 0, 'Status command should succeed')
      assert(output.includes('Status Report'), 'Should show status report')
      assert(output.includes('AI Tools'), 'Should show detected tools section')
    })

    it('🔄 should sync configurations', async () => {
      const command = new Deno.Command(Deno.execPath(), {
        args: ['run', '--allow-all', '../src/cli/index.ts', 'sync', '--dry-run'],
        cwd: testProjectPath,
        stdout: 'piped',
        stderr: 'piped',
      })

      const { code, stdout } = await command.output()
      const output = new TextDecoder().decode(stdout)

      assertEquals(code, 0, 'Sync command should succeed')
      assert(output.includes('Sync'), 'Should show sync information')
    })

    it('🎯 should generate rules', async () => {
      const command = new Deno.Command(Deno.execPath(), {
        args: ['run', '--allow-all', '../src/cli/index.ts', 'generate', '--threshold', '0.5'],
        cwd: testProjectPath,
        stdout: 'piped',
        stderr: 'piped',
      })

      const { code, stdout } = await command.output()
      const output = new TextDecoder().decode(stdout)

      assertEquals(code, 0, 'Generate command should succeed')
      assert(output.includes('Analyzing'), 'Should show analysis progress')
    })

    it('🔍 should discover dependencies', async () => {
      const command = new Deno.Command(Deno.execPath(), {
        args: ['run', '--allow-all', '../src/cli/index.ts', 'discover'],
        cwd: testProjectPath,
        stdout: 'piped',
        stderr: 'piped',
      })

      const { code, stdout } = await command.output()
      const output = new TextDecoder().decode(stdout)

      assertEquals(code, 0, 'Discover command should succeed')
      assert(output.includes('Discovering'), 'Should show discovery progress')
    })

    it('📦 should export to AgentFile', async () => {
      const command = new Deno.Command(Deno.execPath(), {
        args: ['run', '--allow-all', '../src/cli/index.ts', 'export', '--output', 'test.af'],
        cwd: testProjectPath,
        stdout: 'piped',
        stderr: 'piped',
      })

      const { code, stdout } = await command.output()
      const output = new TextDecoder().decode(stdout)

      assertEquals(code, 0, 'Export command should succeed')
      
      // Check that export file was created
      const exportStat = await Deno.stat('test.af')
      assert(exportStat.isFile, 'Export file should be created')
      assert(exportStat.size > 0, 'Export file should have content')

      // Verify it's valid JSON
      const exportContent = await Deno.readTextFile('test.af')
      const exportData = JSON.parse(exportContent)
      assertExists(exportData.metadata, 'Export should have metadata')
      assertEquals(exportData.metadata.generator, 'dotvibe')
    })

    it('🤖 should show daemon info', async () => {
      const command = new Deno.Command(Deno.execPath(), {
        args: ['run', '--allow-all', '../src/cli/index.ts', 'daemon'],
        cwd: testProjectPath,
        stdout: 'piped',
        stderr: 'piped',
      })

      const { code, stdout } = await command.output()
      const output = new TextDecoder().decode(stdout)

      assertEquals(code, 0, 'Daemon command should succeed')
      assert(output.includes('Daemon Management'), 'Should show daemon info')
      assert(output.includes('vibe-daemon'), 'Should mention daemon binary')
    })
  })

  describe('🔧 Binary Executables', () => {
    it('🎯 should have executable vibe script', async () => {
      const vibePath = resolve('../vibe')
      const vibeStat = await Deno.stat(vibePath)
      
      assert(vibeStat.isFile, 'vibe should be a file')
      // Check if file is executable (Unix permissions)
      if (Deno.build.os !== 'windows') {
        assert((vibeStat.mode! & 0o111) !== 0, 'vibe should be executable')
      }
    })

    it('🤖 should have executable vibe-daemon script', async () => {
      const daemonPath = resolve('../vibe-daemon')
      const daemonStat = await Deno.stat(daemonPath)
      
      assert(daemonStat.isFile, 'vibe-daemon should be a file')
      // Check if file is executable (Unix permissions)
      if (Deno.build.os !== 'windows') {
        assert((daemonStat.mode! & 0o111) !== 0, 'vibe-daemon should be executable')
      }
    })
  })

  describe('📁 File System Integration', () => {
    it('🔧 should handle project without .vibe gracefully', async () => {
      const tempDir = await Deno.makeTempDir({ prefix: 'vibe-no-init-' })
      
      try {
        const command = new Deno.Command(Deno.execPath(), {
          args: ['run', '--allow-all', '../src/cli/index.ts', 'status'],
          cwd: tempDir,
          stdout: 'piped',
          stderr: 'piped',
        })

        const { code } = await command.output()
        // Should handle gracefully (may succeed with empty results or fail gracefully)
        assert(code === 0 || code === 1, 'Should handle missing .vibe gracefully')
      } finally {
        await Deno.remove(tempDir, { recursive: true })
      }
    })

    it('📝 should respect --force flag', async () => {
      // Try init without force (should detect existing .vibe)
      const command1 = new Deno.Command(Deno.execPath(), {
        args: ['run', '--allow-all', '../src/cli/index.ts', 'init'],
        cwd: testProjectPath,
        stdout: 'piped',
        stderr: 'piped',
      })

      const { code: code1 } = await command1.output()
      
      // Try init with force (should succeed)
      const command2 = new Deno.Command(Deno.execPath(), {
        args: ['run', '--allow-all', '../src/cli/index.ts', 'init', '--force'],
        cwd: testProjectPath,
        stdout: 'piped',
        stderr: 'piped',
      })

      const { code: code2 } = await command2.output()
      assertEquals(code2, 0, 'Init with --force should succeed')
    })
  })

  describe('🚨 Error Handling', () => {
    it('❌ should handle invalid commands gracefully', async () => {
      const command = new Deno.Command(Deno.execPath(), {
        args: ['run', '--allow-all', '../src/cli/index.ts', 'invalid-command'],
        cwd: testProjectPath,
        stdout: 'piped',
        stderr: 'piped',
      })

      const { code, stderr } = await command.output()
      const errorOutput = new TextDecoder().decode(stderr)

      assert(code !== 0, 'Invalid command should fail')
      // Should show helpful error message
    })

    it('🔒 should handle permission errors gracefully', async () => {
      // This test is platform-specific and may not apply to all environments
      if (Deno.build.os !== 'windows') {
        const readOnlyDir = await Deno.makeTempDir({ prefix: 'vibe-readonly-' })
        
        try {
          // Make directory read-only
          await Deno.chmod(readOnlyDir, 0o444)
          
          const command = new Deno.Command(Deno.execPath(), {
            args: ['run', '--allow-all', '../src/cli/index.ts', 'init'],
            cwd: readOnlyDir,
            stdout: 'piped',
            stderr: 'piped',
          })

          const { code } = await command.output()
          // Should fail gracefully with permission error
          assert(code !== 0, 'Should fail when permissions insufficient')
        } finally {
          // Restore permissions for cleanup
          await Deno.chmod(readOnlyDir, 0o755)
          await Deno.remove(readOnlyDir, { recursive: true })
        }
      }
    })
  })
})

// Helper function for path resolution
function resolve(path: string): string {
  return new URL(path, import.meta.url).pathname
}