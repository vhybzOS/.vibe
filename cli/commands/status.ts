import { Effect, pipe } from 'effect'
import { detectAITools } from '../../core/tools/index.js'
import { loadRules } from '../../core/rules/index.js'
import { resolve } from '@std/path'

export const statusCommand = (projectPath: string) =>
  pipe(
    Effect.log('📊 .vibe Status Report'),
    Effect.log('━━━━━━━━━━━━━━━━━━━━━━━━━━'),
    Effect.all([
      detectAITools(projectPath),
      loadRules(resolve(projectPath, '.vibe')),
      checkVibeHealth(projectPath),
    ]),
    Effect.flatMap(([tools, rules, health]) => 
      pipe(
        displayProjectInfo(projectPath),
        Effect.flatMap(() => displayDetectedTools(tools)),
        Effect.flatMap(() => displayRulesInfo(rules)),
        Effect.flatMap(() => displayHealthStatus(health)),
        Effect.flatMap(() => displayRecommendations(tools, rules))
      )
    )
  )

const checkVibeHealth = (projectPath: string) =>
  pipe(
    Effect.succeed({
      configExists: true, // Would check if .vibe/config.json exists
      mcpServerRunning: false, // Would check if MCP server is running
      lastSync: new Date().toISOString(),
      issues: [] as string[],
    })
  )

const displayProjectInfo = (projectPath: string) =>
  pipe(
    Effect.log(''),
    Effect.log(`📁 Project: ${projectPath.split('/').pop()}`),
    Effect.log(`📍 Path: ${projectPath}`),
    Effect.log(`⚙️  .vibe: ${resolve(projectPath, '.vibe')}`)
  )

const displayDetectedTools = (tools: any[]) =>
  pipe(
    Effect.log(''),
    Effect.log('🤖 Detected AI Tools:'),
    tools.length > 0
      ? Effect.all(
          tools.map(tool => 
            Effect.log(`  ${getToolEmoji(tool.tool)} ${tool.tool} (confidence: ${Math.round(tool.confidence * 100)}%)`)
          )
        )
      : Effect.log('  ❌ No AI tools detected'),
    Effect.log('')
  )

const displayRulesInfo = (rules: any[]) =>
  pipe(
    Effect.log('📋 Rules:'),
    Effect.log(`  📊 Total: ${rules.length}`),
    Effect.log(`  ✅ Active: ${rules.filter(r => r.application.mode === 'always').length}`),
    Effect.log(`  🤖 Auto-generated: ${rules.filter(r => r.generated?.auto).length}`),
    Effect.log(`  🔧 Manual: ${rules.filter(r => !r.generated?.auto).length}`),
    Effect.log('')
  )

const displayHealthStatus = (health: any) =>
  pipe(
    Effect.log('💚 Health Status:'),
    Effect.log(`  ⚙️  Configuration: ${health.configExists ? '✅ OK' : '❌ Missing'}`),
    Effect.log(`  📡 MCP Server: ${health.mcpServerRunning ? '✅ Running' : '⚪ Stopped'}`),
    Effect.log(`  🔄 Last Sync: ${new Date(health.lastSync).toLocaleString()}`),
    health.issues.length > 0
      ? Effect.all(
          health.issues.map((issue: string) => 
            Effect.log(`  ⚠️  ${issue}`)
          )
        )
      : Effect.log('  🎉 No issues found'),
    Effect.log('')
  )

const displayRecommendations = (tools: any[], rules: any[]) =>
  pipe(
    Effect.log('💡 Recommendations:'),
    tools.length === 0
      ? Effect.log('  📝 No AI tools detected - consider adding .cursorrules or similar')
      : Effect.succeed(null),
    rules.length === 0
      ? Effect.log('  🎯 No rules found - run `dotvibe generate` to create some')
      : Effect.succeed(null),
    rules.filter(r => r.generated?.auto && r.generated?.reviewRequired).length > 0
      ? Effect.log('  👀 Some auto-generated rules need review')
      : Effect.succeed(null),
    Effect.log('  🚀 Run `dotvibe mcp-server` to enable AI tool integration'),
    Effect.log('  🔄 Run `dotvibe sync` to update tool configurations'),
    Effect.log('')
  )

const getToolEmoji = (tool: string): string => {
  switch (tool) {
    case 'cursor': return '🎯'
    case 'windsurf': return '🏄'
    case 'claude': return '🤖'
    case 'copilot': return '🧑‍✈️'
    case 'codeium': return '💫'
    case 'cody': return '🐨'
    case 'tabnine': return '🔮'
    default: return '❓'
  }
}