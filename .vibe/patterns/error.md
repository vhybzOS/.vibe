# Error Handling Patterns

## Tagged Union Algorithm

```pseudo
INPUT: operation_result, error_context
error_type = classify_error(operation_result.failure)
tagged_error = create_tagged_error(error_type, error_context)
OUTPUT: Effect.fail(tagged_error)
```

## Error Type Definition

```typescript
type DomainError =
  | FileSystemError
  | ParseError
  | NetworkError
  | ValidationError
```

## Error Creation Pattern

```typescript
const createFileSystemError = (
  cause: unknown,
  path: string,
  operation: string,
): FileSystemError => ({
  _tag: 'FileSystemError',
  cause: String(cause),
  path,
  operation,
  timestamp: new Date().toISOString(),
})
```

## Error Handling Pattern

```typescript
const handleErrors = <T>(effect: Effect<T, DomainError>) =>
  pipe(
    effect,
    Effect.catchTag('FileSystemError', handleFileSystemError),
    Effect.catchTag('ParseError', handleParseError),
    Effect.catchTag('NetworkError', handleNetworkError),
    Effect.catchAll(handleUnknownError),
  )
```

## Context Links

- [Tagged union types] - discriminated unions
- [Effect.catchTag] - specific error handling
- [Error context] - debugging information
- [Error recovery] - fallback strategies
