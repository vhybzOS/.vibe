# Effect-TS Patterns

## Composition Algorithm

```pseudo
INPUT: async_operations, error_types
result = pipe(
  initial_operation,
  Effect.flatMap(transform_step),
  Effect.map(final_transform),
  Effect.catchTag(specific_error, handler),
  Effect.catchAll(fallback_handler)
)
OUTPUT: Effect<Success, Error, Requirements>
```

## Import Template

```typescript
import { Effect, pipe } from 'effect'
```

## Function Pattern

```typescript
const operation = (input: InputType): Effect<OutputType, DomainError> =>
  Effect.tryPromise({
    try: () => async_operation(input),
    catch: (e) => createDomainError(e, context),
  })
```

## Composition Pattern

```typescript
const workflow = (input: Input) =>
  pipe(
    validateInput(input),
    Effect.flatMap(processData),
    Effect.map(formatOutput),
    Effect.catchTag('ValidationError', handleValidation),
    Effect.catchTag('ProcessingError', handleProcessing),
  )
```

## Context Links

- [Effect.succeed/fail] - create effects
- [Effect.tryPromise] - async operations
- [pipe()] - functional composition
- [Effect.flatMap/map] - transformations
