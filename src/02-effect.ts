/**
 * ============================================================
 * EFFECT: Typed Error Handling & Async Operations
 * ============================================================
 * 
 * WHAT IS EFFECT?
 * Effect<Success, Error, Requirements> represents a computation that:
 * - Can succeed with a value (Success)
 * - Can fail with typed errors (Error)
 * - May need dependencies/services (Requirements)
 * 
 * TYPE SIGNATURE: Effect<A, E, R>
 * - A = Success type (what you get when it works)
 * - E = Error type (what errors can occur)
 * - R = Requirements (what dependencies are needed)
 * 
 * WHY USE EFFECT?
 * ❌ Traditional approach:
 *    - try/catch blocks everywhere
 *    - Error types are 'any' or 'unknown'
 *    - Hard to know what errors a function can throw
 *    - Mixing sync and async code is messy
 *    - No composability
 * 
 * ✅ Effect approach:
 *    - Errors are typed and visible in signature
 *    - Compiler ensures you handle all error cases
 *    - Uniform API for sync and async
 *    - Composable and testable
 *    - Built-in retry, timeout, and more
 * 
 * WHEN TO USE:
 * - API calls (can fail with network errors)
 * - Database operations (connection/query errors)
 * - File I/O (file not found, permission errors)
 * - User input validation (validation errors)
 * - External service calls (timeouts, rate limits)
 * - Any operation that can fail in known ways
 * 
 * REAL-WORLD SCENARIOS:
 * 1. HTTP requests (network failures, 404, 500 errors)
 * 2. Database queries (connection lost, constraint violations)
 * 3. File uploads (size limits, invalid formats)
 * 4. Payment processing (declined cards, fraud detection)
 * 5. Authentication (invalid credentials, expired tokens)
 * 6. Data parsing (JSON.parse, CSV parsing)
 */

import { Effect, pipe } from "effect"

console.log("=== EFFECT: Error Handling & Async ===\n")

/**
 * TYPED ERRORS: Use classes with _tag for discrimination
 * 
 * WHY USE CLASSES?
 * - Better error messages
 * - Can add helper methods
 * - Instanceof checks work
 * - TypeScript discriminates by _tag
 * 
 * REAL-WORLD USE CASE:
 * Different error types for different failure modes
 */
class NetworkError {
  readonly _tag = "NetworkError"
  constructor(readonly message: string) {}
}

class ValidationError {
  readonly _tag = "ValidationError"
  constructor(readonly message: string) {}
}

/**
 * EFFECT.succeed / EFFECT.fail: Create Effects
 * 
 * WHEN TO USE:
 * - succeed: You have a value, wrap it in Effect
 * - fail: You have an error, create failed Effect
 * 
 * WHY NOT JUST RETURN THE VALUE?
 * - Composability with other Effects
 * - Can be part of Effect chains
 * - Uniform API (everything is Effect)
 * 
 * REAL-WORLD USE CASE:
 * Fetch user data from API - can fail with network error
 */
const fetchUserData = (id: number): Effect.Effect<string, NetworkError> => {
  if (id <= 0) {
    return Effect.fail(new NetworkError("Invalid ID"))
  }
  return Effect.succeed(`User data for ID ${id}`)
}

/**
 * VALIDATION FUNCTION
 * 
 * REAL-WORLD USE CASE:
 * Validate API response before processing
 */
const validateData = (data: string): Effect.Effect<string, ValidationError> => {
  if (data.length < 5) {
    return Effect.fail(new ValidationError("Data too short"))
  }
  return Effect.succeed(data.toUpperCase())
}

/**
 * EFFECT.flatMap: Chain Effects together
 * 
 * WHEN TO USE:
 * - Next operation depends on previous result
 * - Next operation also returns Effect
 * - Want to sequence async operations
 * 
 * EFFECT.catchAll: Handle ALL errors
 * 
 * WHEN TO USE:
 * - Recover from any error
 * - Convert errors to success values
 * - Logging errors but continuing
 * 
 * HOW IT WORKS:
 * - Receives the error
 * - Must return Effect (can be success or different error)
 * 
 * REAL-WORLD USE CASE:
 * API call → validate response → handle any errors gracefully
 * Example: User profile page that shows fallback when API fails
 */
const program = pipe(
  fetchUserData(1),
  Effect.flatMap(validateData),
  Effect.catchAll((error) => {
    if (error._tag === "NetworkError") {
      return Effect.succeed(`Network error handled: ${error.message}`)
    }
    return Effect.succeed(`Validation error handled: ${error.message}`)
  })
)

Effect.runPromise(program).then((result) => {
  console.log("Result:", result)
})

/**
 * EFFECT.try: Wrap code that throws
 * 
 * WHEN TO USE:
 * - Calling code that throws exceptions
 * - Working with libraries that use throw
 * - Converting throw-based code to Effect
 * 
 * HOW IT WORKS:
 * - try: Function that might throw
 * - catch: Convert thrown value to typed error
 * 
 * REAL-WORLD USE CASES:
 * - JSON.parse (throws on invalid JSON)
 * - File system operations (fs.readFileSync)
 * - Third-party libraries that throw
 * - Date parsing (new Date() with invalid dates)
 * 
 * EXAMPLE SCENARIOS:
 * 1. Parsing user-uploaded JSON config files
 * 2. Reading environment variables that must be valid JSON
 * 3. Calling legacy code that throws
 */
const riskyOperation = Effect.try({
  try: () => JSON.parse('{"name": "Alice"}'),
  catch: (error) => new Error(`JSON parse failed: ${error}`)
})

Effect.runPromise(riskyOperation).then((data) => {
  console.log("\nParsed JSON:", data)
})

/**
 * EFFECT.promise: Wrap Promises
 * 
 * WHEN TO USE:
 * - Working with async/await code
 * - Calling APIs that return Promises
 * - Integrating with existing Promise-based code
 * 
 * HOW IT WORKS:
 * - Takes function that returns Promise
 * - Converts to Effect
 * - Rejected promises become defects (unexpected errors)
 * 
 * EFFECT.map: Transform success value
 * 
 * WHEN TO USE:
 * - Transform result without changing error type
 * - Simple synchronous transformations
 * - Don't need to return another Effect
 * 
 * EFFECT.tap: Perform side effects
 * 
 * WHEN TO USE:
 * - Logging intermediate values
 * - Debugging Effect chains
 * - Performing actions without changing the value
 * 
 * DIFFERENCE FROM MAP:
 * - map: transforms the value
 * - tap: runs side effect, returns original value
 * 
 * REAL-WORLD USE CASES:
 * - HTTP requests (fetch, axios)
 * - Database queries (Prisma, TypeORM)
 * - File operations (fs.promises)
 * - External API calls
 * - Background tasks
 * 
 * EXAMPLE SCENARIO:
 * Fetch data → transform it → log it → use it
 */
const asyncOperation = Effect.promise(() => 
  new Promise<number>((resolve) => setTimeout(() => resolve(100), 100))
)

const multiplied = pipe(
  asyncOperation,
  Effect.map(x => x * 2),
  Effect.tap(x => Effect.sync(() => console.log("\nAsync result:", x)))
)

Effect.runPromise(multiplied)
