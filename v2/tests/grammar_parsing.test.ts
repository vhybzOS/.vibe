/**
 * @tested_by Grammar parsing for specs and algorithms
 * Tests parsing of specification files and pseudo-code algorithms
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { GrammarParser } from '../lib/grammar.ts'

Deno.test('Grammar Parser - Parse specs file with shebang', async () => {
  const parser = new GrammarParser()

  const specsContent = `#!/grammars/specs parse

# Feature: User Authentication
## Intent
AUTHENTICATE user WITH credentials RETURNING session_token

## Inputs  
credentials: {username: string, password: string}

## Outputs
SUCCESS: session_token: JWT<UserClaims>
FAILURE: AuthError = InvalidCredentials | AccountLocked`

  const parsed = await parser.parseSpecs(specsContent)

  assertEquals(parsed.grammar, 'specs')
  assertEquals(parsed.feature, 'User Authentication')
  assertExists(parsed.intent)
  assertExists(parsed.inputs)
  assertExists(parsed.outputs)
})

Deno.test('Grammar Parser - Parse pseudo-code algorithm', async () => {
  const parser = new GrammarParser()

  const algorithmContent = `#!/grammars/pseudo-typescript parse

INPUT: user_request: string, current_state: SessionState
specs_agent = spawn_subagent("specs", expanded_context)
specs_result = specs_agent.execute(user_request)

IF specs_result.approved THEN
  coder_agent = spawn_subagent("development", specs_result.context)
  dev_result = coder_agent.execute_9_steps(specs_result.specs)
  RETURN dev_result
ELSE
  GOTO requirements_gathering
END`

  const parsed = await parser.parseAlgorithm(algorithmContent)

  assertEquals(parsed.grammar, 'pseudo-typescript')
  assertExists(parsed.inputs)
  assertExists(parsed.steps)
  assertEquals(parsed.steps.length > 0, true)
})

Deno.test('Grammar Parser - Extract native language nodes', async () => {
  const parser = new GrammarParser()

  const hybridContent = `
INPUT: credentials: AuthRequest
validation_result = validate_credentials(credentials)
user_record = tsNode42  // await db.user.findUnique({where: {username}})
session_data = tsNode43 // create_session(user_record)
RETURN Success(session_data.token)
`

  const parsed = await parser.parseAlgorithm(hybridContent)

  assertEquals(parsed.nativeNodes.length, 2)
  assertEquals(parsed.nativeNodes[0].id, 'tsNode42')
  assertEquals(parsed.nativeNodes[0].language, 'typescript')
  assertExists(parsed.nativeNodes[0].code)
})
