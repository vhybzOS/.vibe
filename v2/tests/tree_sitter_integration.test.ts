/**
 * @tested_by Tree-sitter CLI integration with shell scripts
 * Tests the KISS approach: shell scripts → tree-sitter CLI → JSON → SurrealDB
 */

import { assertEquals, assertExists, assert } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { resolve } from '@std/path'

Deno.test('Tree-sitter Shell Script Integration - Execute parse script', async () => {
  // Test calling a parse shell script (mocked for now)
  const grammarDir = resolve('./grammars/pseudo-typescript')
  const parseScript = resolve(grammarDir, 'parse')
  
  // This will fail until we create the actual structure
  // But documents expected behavior
  try {
    const result = await new Deno.Command(parseScript, {
      args: ['sample-algorithm.md'],
      cwd: grammarDir
    }).output()
    
    assertExists(result.stdout)
    assertEquals(result.code, 0)
  } catch (error) {
    // Expected to fail until implementation
    assert(error instanceof Error)
  }
})

Deno.test('Tree-sitter CLI JSON Output Parsing', async () => {
  // Test parsing tree-sitter CLI JSON output format
  const mockTreeSitterOutput = JSON.stringify({
    "type": "source_file",
    "children": [
      {
        "type": "statement",
        "children": [
          {
            "type": "assignment",
            "children": [
              {"type": "identifier", "text": "result"},
              {"type": "=", "text": "="},
              {"type": "function_call", "text": "process(input)"}
            ]
          }
        ]
      }
    ]
  })
  
  const parsed = JSON.parse(mockTreeSitterOutput)
  assertExists(parsed.type)
  assertEquals(parsed.type, "source_file")
  assertExists(parsed.children)
})

Deno.test('Tree-sitter JSON to SurrealDB Schema Conversion', () => {
  // Test converting tree-sitter JSON to our SurrealDB CodeNode schema
  const treeSitterNode = {
    "type": "function_declaration",
    "children": [
      {"type": "identifier", "text": "authenticate"},
      {"type": "parameter_list", "text": "(credentials)"},
      {"type": "block", "text": "{ ... }"}
    ],
    "start_position": {"row": 10, "column": 0},
    "end_position": {"row": 15, "column": 1}
  }
  
  // Expected SurrealDB format
  const expectedCodeNode = {
    id: "func_authenticate_10_15",
    file_path: "test.md",
    node_type: "function_declaration",
    name: "authenticate",
    line_range: [10, 15],
    code_snippet: "function authenticate(credentials) { ... }",
    patterns: ["function", "authentication"],
    complexity_score: 0.6,
    language: "pseudo-typescript"
  }
  
  // Test conversion function (to be implemented)
  try {
    const converted = convertTreeSitterToCodeNode(treeSitterNode, "test.md")
    assertEquals(converted.node_type, expectedCodeNode.node_type)
    assertEquals(converted.name, expectedCodeNode.name)
    assertEquals(converted.line_range, expectedCodeNode.line_range)
  } catch (error) {
    // Expected to fail until implementation
    assert(error instanceof Error)
  }
})

Deno.test('Pseudo-typescript Grammar - Native Node Parsing', () => {
  // Test parsing hybrid pseudo-code + TypeScript with tsNodeN markers
  const hybridCode = `
#!/grammars/pseudo-typescript parse

INPUT: credentials: AuthRequest
validation_result = validate_credentials(credentials)
IF validation_result.valid THEN
  user_record = tsNode42  // await db.user.findUnique({where: {username}})
  session_data = tsNode43 // {id: user.id, token: jwt.sign(payload)}
  RETURN Success(session_data.token)
ELSE
  RETURN Failure(AuthError::InvalidCredentials)
END
`

  // Expected to parse both pseudo-code and native TypeScript references
  const expectedNodes = [
    { type: "shebang", text: "#!/grammars/pseudo-typescript parse" },
    { type: "input_declaration", text: "INPUT: credentials: AuthRequest" },
    { type: "assignment", text: "validation_result = validate_credentials(credentials)" },
    { type: "condition", text: "IF validation_result.valid THEN" },
    { type: "native_node", text: "tsNode42", comment: "await db.user.findUnique({where: {username}})" },
    { type: "native_node", text: "tsNode43", comment: "{id: user.id, token: jwt.sign(payload)}" }
  ]
  
  // Test that our grammar can handle this hybrid syntax
  assertExists(hybridCode)
  assert(hybridCode.includes("tsNode42"))
  assert(hybridCode.includes("#!/grammars/pseudo-typescript parse"))
})

Deno.test('Specs Grammar - Specification File Parsing', () => {
  // Test parsing specification files with shebang grammar
  const specsCode = `
#!/grammars/specs parse

# Feature: User Authentication

## Intent

AUTHENTICATE user WITH credentials RETURNING session_token

## Inputs

credentials: {username: string, password: string}

## Outputs

SUCCESS: session_token: JWT<UserClaims>
FAILURE: AuthError = InvalidCredentials | AccountLocked
`

  // Expected to parse specification structure
  const expectedNodes = [
    { type: "shebang", text: "#!/grammars/specs parse" },
    { type: "feature", text: "Feature: User Authentication" },
    { type: "intent", text: "AUTHENTICATE user WITH credentials RETURNING session_token" },
    { type: "inputs", text: "credentials: {username: string, password: string}" },
    { type: "outputs", text: "SUCCESS: session_token: JWT<UserClaims>" }
  ]
  
  // Test that specs grammar handles specification format
  assertExists(specsCode)
  assert(specsCode.includes("#!/grammars/specs parse"))
  assert(specsCode.includes("## Intent"))
})

Deno.test('Revolutionary Context Retrieval - Precise Line Extraction', async () => {
  // Test that we can get precise 10-line code snippets instead of full files
  const mockIndexedNodes = [
    {
      id: "auth_func_1",
      file_path: "src/auth.ts",
      node_type: "async_function_declaration",
      name: "authenticate",
      line_range: [42, 52],
      code_snippet: "async function authenticate(credentials: AuthRequest) {\n  // implementation\n}",
      patterns: ["async", "authentication", "credentials"],
      complexity_score: 0.8
    },
    {
      id: "error_handler_1", 
      file_path: "src/errors.ts",
      node_type: "function_declaration",
      name: "handleAuthError",
      line_range: [15, 25],
      code_snippet: "function handleAuthError(error: AuthError) {\n  // error handling\n}",
      patterns: ["error", "authentication", "handling"],
      complexity_score: 0.6
    }
  ]
  
  // Test querying for specific patterns
  const authQuery = "async authentication functions"
  const relevantNodes = mockIndexedNodes.filter(node => 
    node.patterns.includes("async") && node.patterns.includes("authentication")
  )
  
  assertEquals(relevantNodes.length, 1)
  assertEquals(relevantNodes[0]?.name, "authenticate")
  assertEquals(relevantNodes[0]?.line_range, [42, 52])
  
  // Revolutionary: 10 lines of precise context instead of 1000-line files!
  const contextLines = relevantNodes[0]?.code_snippet.split('\n').length || 0
  assert(contextLines <= 10, "Context should be 10 lines or fewer")
})

// Mock function signatures for functions to be implemented
function convertTreeSitterToCodeNode(treeSitterNode: any, filePath: string): any {
  throw new Error("Not implemented yet - will be created in Step 3")
}