#!/usr/bin/env -S deno run --allow-all

/**
 * Cross-Platform Build Script
 *
 * Builds vibe binary for all supported platforms:
 * - Linux x86_64
 * - macOS x86_64 (Intel and Apple Silicon compatible)
 * - Windows x86_64
 *
 * Outputs binaries to installers/embedded/binaries/ for embedding in installers
 *
 * @tested_by tests/unit/build-cross-platform.test.ts (Build process validation)
 */

import { resolve } from '@std/path'

// Color helpers for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message: string, color = colors.cyan) {
  console.log(`${color}[BUILD]${colors.reset} ${message}`)
}

function success(message: string) {
  console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`)
}

function error(message: string) {
  console.log(`${colors.red}[ERROR]${colors.reset} ${message}`)
}

function warn(message: string) {
  console.log(`${colors.yellow}[WARN]${colors.reset} ${message}`)
}

// Platform configurations
const platforms = [
  { name: 'Linux', target: 'x86_64-unknown-linux-gnu', suffix: '-linux-x86_64' },
  { name: 'macOS', target: 'x86_64-apple-darwin', suffix: '-macos-x86_64' },
  { name: 'Windows', target: 'x86_64-pc-windows-msvc', suffix: '-windows-x86_64.exe' },
]

// Build targets
const buildTargets = [
  { name: 'vibe', source: 'cli.ts', description: 'Main CLI tool with daemon support' },
]

async function ensureDirectory(path: string) {
  try {
    await Deno.mkdir(path, { recursive: true })
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error
    }
  }
}

async function buildBinary(
  target: { name: string; source: string; description: string },
  platform: { name: string; target: string; suffix: string },
  outputDir: string,
) {
  const outputFile = resolve(outputDir, `${target.name}${platform.suffix}`)
  const includeFlag = target.name === 'vibe' ? '--include vibe-coding-project-starters/' : ''

  log(`Building ${target.name} for ${platform.name}...`)

  const command = new Deno.Command('deno', {
    args: [
      'compile',
      '--allow-all',
      '--target',
      platform.target,
      ...(includeFlag ? ['--include', 'vibe-coding-project-starters/'] : []),
      '--output',
      outputFile,
      target.source,
    ],
    stdout: 'piped',
    stderr: 'piped',
  })

  const process = command.spawn()
  const result = await process.output()

  if (!result.success) {
    const errorMessage = new TextDecoder().decode(result.stderr)
    error(`Failed to build ${target.name} for ${platform.name}:\n${errorMessage}`)
    return false
  }

  success(`Built ${target.name} for ${platform.name} -> ${outputFile}`)
  return true
}

async function validateBinary(binaryPath: string, platform: { name: string }) {
  try {
    const stat = await Deno.stat(binaryPath)
    if (stat.size === 0) {
      warn(`Binary ${binaryPath} is empty`)
      return false
    }

    // Basic size check - binaries should be at least 1MB
    if (stat.size < 1024 * 1024) {
      warn(`Binary ${binaryPath} seems too small (${Math.round(stat.size / 1024)}KB)`)
      return false
    }

    log(`Validated ${binaryPath} (${Math.round(stat.size / 1024 / 1024)}MB)`)
    return true
  } catch {
    error(`Cannot validate binary ${binaryPath}`)
    return false
  }
}

async function copyScripts(unixDir: string, windowsDir: string) {
  // Copy scripts to both platform directories
  const scriptsSource = resolve('installers', 'embedded', 'scripts')
  const unixScriptsDir = resolve(unixDir, '..', 'scripts')
  const windowsScriptsDir = resolve(windowsDir, '..', 'scripts')

  await ensureDirectory(unixScriptsDir)
  await ensureDirectory(windowsScriptsDir)

  try {
    // Check if scripts source exists
    await Deno.stat(scriptsSource)

    // Copy all scripts to both directories
    for await (const entry of Deno.readDir(scriptsSource)) {
      if (entry.isFile) {
        const sourceFile = resolve(scriptsSource, entry.name)
        const unixTarget = resolve(unixScriptsDir, entry.name)
        const windowsTarget = resolve(windowsScriptsDir, entry.name)

        await Deno.copyFile(sourceFile, unixTarget)
        await Deno.copyFile(sourceFile, windowsTarget)
      }
    }
    log('Scripts copied to platform-specific directories')
  } catch (error) {
    warn(`Scripts directory not found or empty - skipping script copy: ${error}`)
    // This is not critical as installers can work without additional scripts
  }
}

async function main() {
  log('Starting cross-platform build process...')

  // Create platform-specific embedded directories
  const unixDir = resolve('installers', 'embedded-unix', 'binaries')
  const windowsDir = resolve('installers', 'embedded-windows', 'binaries')

  await ensureDirectory(unixDir)
  await ensureDirectory(windowsDir)

  let totalBuilds = 0
  let successfulBuilds = 0

  // Build each target for each platform
  for (const target of buildTargets) {
    log(`Building ${target.description}...`)

    for (const platform of platforms) {
      totalBuilds++

      // Determine output directory based on platform
      const outputDir = platform.name === 'Windows' ? windowsDir : unixDir

      const success = await buildBinary(target, platform, outputDir)
      if (success) {
        successfulBuilds++

        // Validate the built binary
        const binaryPath = resolve(outputDir, `${target.name}${platform.suffix}`)
        await validateBinary(binaryPath, platform)
      }
    }
  }

  console.log(`\n${colors.bright}Build Summary:${colors.reset}`)
  console.log(`Total builds: ${totalBuilds}`)
  console.log(`Successful: ${colors.green}${successfulBuilds}${colors.reset}`)
  console.log(
    `Failed: ${
      successfulBuilds === totalBuilds ? colors.green + '0' : colors.red + (totalBuilds - successfulBuilds)
    }${colors.reset}`,
  )

  if (successfulBuilds === totalBuilds) {
    success('All binaries built successfully!')

    // Copy scripts to both platform-specific directories
    log('Copying installation scripts...')
    await copyScripts(unixDir, windowsDir)

    console.log(`\nUnix binaries: ${colors.cyan}${unixDir}${colors.reset}`)
    console.log(`Windows binaries: ${colors.cyan}${windowsDir}${colors.reset}`)
  } else {
    error(`${totalBuilds - successfulBuilds} builds failed`)
    Deno.exit(1)
  }
}

// Run the build process
if (import.meta.main) {
  try {
    await main()
  } catch (err) {
    const errorObj = err instanceof Error ? err : new Error(String(err))
    error(`Build process failed: ${errorObj.message}`)
    Deno.exit(1)
  }
}
