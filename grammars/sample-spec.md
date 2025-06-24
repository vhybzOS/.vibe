#!/grammars/specs parse

# Feature: User Authentication

## Intent

AUTHENTICATE user WITH credentials RETURNING session_token

## Inputs

credentials: {username: string, password: string}

## Outputs

SUCCESS: session_token: JWT<UserClaims>
FAILURE: AuthError = InvalidCredentials | AccountLocked

## Examples

authenticate({username: "alice", password: "secret123"}) → "eyJ..."

## Constraints

password.length >= 8
rate_limit(username) < 5

## Invariants

valid_session(token) ⟺ user_exists(decode(token).sub)