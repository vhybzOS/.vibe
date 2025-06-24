# CLI Command Patterns

## Command Structure Algorithm

```pseudo
INPUT: user_command, command_args
parsed_args = vibe parse command_args --format cli_schema
validation_result = validate_command(parsed_args)
IF validation_result.valid THEN
  effect_result = execute_command_effect(parsed_args)
  output = format_output(effect_result)
ELSE
  output = format_error(validation_result.errors)
END
OUTPUT: formatted_output
```

## Higher-Order Wrapper Pattern

```typescript
export const commandName = withVibeDirectory((vibePath, options) =>
  pipe(
    performOperation(vibePath, options),
    Effect.flatMap(showResults),
    Effect.catchAll((error) => Effect.fail(createCliError(error, 'Operation failed', 'command-name'))),
  )
)
```

## CLI Integration Template

```typescript
program
  .command('command-name')
  .description('Command description')
  .argument('<required>', 'Required argument')
  .option('--flag', 'Optional flag')
  .action(async (required, options) => {
    const result = await Effect.runPromise(commandName(required, options))
    console.log(result)
  })
```

## Error Handling

```typescript
const createCliError = (
  cause: unknown,
  message: string,
  command: string,
): CliError => ({
  _tag: 'CliError',
  cause: String(cause),
  message,
  command,
  exitCode: 1,
})
```

## Context Links

- [commander.js patterns] - CLI parsing
- [withVibeDirectory] - common CLI wrapper
- [Effect.runPromise] - effect execution
- [CLI error formatting] - user-friendly errors
