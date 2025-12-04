/**
 * ============================================================
 * ERROR HANDLING: Typed Errors, Recovery, and Defects
 * ============================================================
 * 
 * EFFECT'S ERROR PHILOSOPHY:
 * Effect distinguishes between two types of failures:
 * 
 * 1. EXPECTED ERRORS (E in Effect<A, E, R>):
 *    - Business logic errors you plan for
 *    - Part of your domain (validation failed, not found, unauthorized)
 *    - Type-checked, must be handled
 *    - Recoverable
 * 
 * 2. DEFECTS (not in type signature):
 *    - Unexpected errors (bugs, system failures)
 *    - Like uncaught exceptions
 *    - Should crash/log, not recover
 *    - Examples: out of memory, null pointer, divide by zero
 * 
 * WHY THIS DISTINCTION?
 * ❌ Traditional approach (try/catch):
 *    - All errors mixed together
 *    - Can't tell what errors a function throws
 *    - Easy to forget error handling
 *    - catch(e) - what type is e?
 * 
 * ✅ Effect approach:
 *    - Expected errors in type signature
 *    - Compiler ensures you handle them
 *    - Defects for truly unexpected cases
 *    - Choose recovery strategy per error type
 * 
 * WHEN TO USE EACH ERROR TYPE:
 * 
 * EXPECTED ERRORS:
 * - Validation failures
 * - Not found (user, resource)
 * - Unauthorized access
 * - External API failures
 * - Business rule violations
 * 
 * DEFECTS:
 * - Programming bugs
 * - System failures (out of memory)
 * - Impossible states ("should never happen")
 * - Configuration errors at startup
 */

import { Effect, Schema } from "effect"

/**
 * DEFINING TYPED ERRORS
 * 
 * SCHEMA.TaggedError:
 * Creates error classes with:
 * - _tag field for discrimination
 * - Type-safe fields
 * - Serialization support
 * 
 * WHY USE SCHEMA FOR ERRORS?
 * - Consistent with data modeling
 * - Can serialize errors (send over network)
 * - Built-in validation
 * - Better than plain classes
 * 
 * REAL-WORLD ERROR TYPES:
 */

class ValidationError extends Schema.TaggedError<ValidationError>()(
  "ValidationError",
  {
    field: Schema.String,
    message: Schema.String,
  }
) {}

class NotFoundError extends Schema.TaggedError<NotFoundError>()(
  "NotFoundError",
  {
    resource: Schema.String,
    id: Schema.String,
  }
) {}

class HttpError extends Schema.TaggedError<HttpError>()(
  "HttpError",
  {
    statusCode: Schema.Number,
    message: Schema.String,
  }
) {}

class ApiError extends Schema.TaggedError<ApiError>()(
  "ApiError",
  {
    endpoint: Schema.String,
    statusCode: Schema.Number,
    error: Schema.Defect,
  }
) {}

/**
 * EXAMPLE FUNCTIONS THAT CAN FAIL
 * 
 * Each function clearly shows what errors it can produce
 * in its type signature.
 */

const validateEmail = (email: string): Effect.Effect<string, ValidationError> =>
  email.includes("@")
    ? Effect.succeed(email)
    : ValidationError.make({ field: "email", message: "Invalid email format" })

const findUser = (id: string): Effect.Effect<string, NotFoundError> =>
  id === "123"
    ? Effect.succeed("John Doe")
    : NotFoundError.make({ resource: "User", id })

const fetchApi = (endpoint: string): Effect.Effect<string, HttpError> =>
  endpoint === "/users"
    ? Effect.succeed("User data")
    : HttpError.make({ statusCode: 404, message: "Not found" })

const externalApiCall = (id: string): Effect.Effect<string, ApiError> =>
  Effect.succeed(`Mock API response for user ${id}`)

/**
 * ============================================================
 * EXAMPLE 1: catchAll - Handle ALL Errors
 * ============================================================
 * 
 * EFFECT.catchAll:
 * Catches any error and allows recovery
 * 
 * WHEN TO USE:
 * - Want to handle any error type
 * - Logging all errors
 * - Providing fallback for any failure
 * - Converting errors to success with default value
 * 
 * HOW IT WORKS:
 * - Receives error of type E
 * - Returns Effect (can be success or different error)
 * - Removes error from type (Effect<A, never, R>)
 * 
 * REAL-WORLD USE CASES:
 * - Show "Something went wrong" for any error
 * - Log error and continue with default
 * - Top-level error boundary
 * - Retry with fallback
 * 
 * EXAMPLE SCENARIO:
 * User profile page: validate email, if fails show friendly message
 */
const example1 = Effect.gen(function* () {
  yield* Effect.log("=== Example 1: catchAll - Handle all errors ===")

  const program = validateEmail("invalid-email")

  const recovered = program.pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError("Error occurred", error)
        return `Recovered from ${error._tag}`
      })
    )
  )

  const result = yield* recovered
  yield* Effect.log("Result:", result)
})

/**
 * ============================================================
 * EXAMPLE 2: catchTag - Handle Specific Error Type
 * ============================================================
 * 
 * EFFECT.catchTag:
 * Catches only errors with specific _tag
 * 
 * WHEN TO USE:
 * - Different recovery for different errors
 * - Only want to handle one error type
 * - Let other errors propagate
 * 
 * HOW IT WORKS:
 * - Specify _tag to catch
 * - Only that error type is caught
 * - Other errors bubble up
 * - Error removed from type signature
 * 
 * REAL-WORLD USE CASES:
 * - Handle NotFound with default, let others fail
 * - Retry on network errors, fail on validation
 * - Use cached data on API failure
 * - Show guest user when user not found
 * 
 * EXAMPLE SCENARIO:
 * Load user profile: if not found, show "Guest User"
 * Other errors (network, etc.) should still fail
 */
const example2 = Effect.gen(function* () {
  yield* Effect.log("=== Example 2: catchTag - Handle specific error ===")

  const program = Effect.all([
    validateEmail("test@example.com"),
    findUser("999"),
    fetchApi("/users"),
  ])

  const recovered = program.pipe(
    Effect.catchTag("NotFoundError", (error) =>
      Effect.gen(function* () {
        yield* Effect.logWarning(
          `${error.resource} with id ${error.id} not found`
        )
        return ["test@example.com", "Guest User", "User data"]
      })
    )
  )

  const result = yield* recovered
  yield* Effect.log("Result:", result)
})

/**
 * ============================================================
 * EXAMPLE 3: catchTags - Handle Multiple Error Types
 * ============================================================
 * 
 * EFFECT.catchTags:
 * Handle multiple specific error types with different strategies
 * 
 * WHEN TO USE:
 * - Different recovery per error type
 * - Fine-grained error handling
 * - Building resilient systems
 * 
 * HOW IT WORKS:
 * - Object mapping: { ErrorTag: handler }
 * - Each handler receives typed error
 * - Unhandled errors still propagate
 * 
 * REAL-WORLD USE CASES:
 * - API calls: NotFound → default, Unauthorized → redirect, Network → retry
 * - Form: ValidationError → show message, Network → retry
 * - File upload: TooBig → compress, InvalidFormat → convert, Network → retry
 * - Payment: Declined → ask retry, Fraud → block, Network → retry
 * 
 * EXAMPLE SCENARIO:
 * Multi-step user registration:
 * - Validation fails → use defaults
 * - HTTP error → show error page
 * - Others → crash (unexpected)
 */
const example3 = Effect.gen(function* () {
  yield* Effect.log("=== Example 3: catchTags - Handle multiple errors ===")

  const program = Effect.all([
    validateEmail("bad-email"),
    findUser("123"),
    fetchApi("/invalid"),
  ])

  const recovered = program.pipe(
    Effect.catchTags({
      ValidationError: (error) =>
        Effect.gen(function* () {
          yield* Effect.logWarning(
            `Validation failed for ${error.field}: ${error.message}`
          )
          return ["default@example.com", "John Doe", "User data"]
        }),
      HttpError: (error) =>
        Effect.gen(function* () {
          yield* Effect.logWarning(`HTTP ${error.statusCode}: ${error.message}`)
          return ["default@example.com", "John Doe", "Default data"]
        }),
    })
  )

  const result = yield* recovered
  yield* Effect.log("Result:", result)
})

/**
 * ============================================================
 * EXAMPLE 4: Expected Errors vs Defects
 * ============================================================
 * 
 * EFFECT.orDie:
 * Converts expected error to defect (crash)
 * 
 * WHEN TO USE:
 * - Error is actually unrecoverable
 * - Should terminate program (config missing)
 * - Want to treat expected error as bug
 * 
 * EFFECT.catchAllDefect:
 * Catches defects (unexpected errors)
 * 
 * WHEN TO USE:
 * - Top-level error boundary
 * - Logging crashes before exit
 * - Graceful shutdown
 * - Never in business logic!
 * 
 * PHILOSOPHY:
 * Expected errors: Handle and recover
 * Defects: Log and crash (or restart)
 * 
 * REAL-WORLD USE CASES:
 * - Missing config file at startup (orDie - can't run)
 * - Database connection string invalid (orDie - can't run)
 * - Main function wrapper (catchAllDefect - log crash)
 * - Health check endpoint (catchAllDefect - return 500)
 * 
 * EXAMPLE SCENARIO:
 * App can't start without config file.
 * Mark as defect, catch at top-level, log, exit gracefully.
 */
const example4 = Effect.gen(function* () {
  yield* Effect.log("=== Example 4: Expected Errors vs Defects ===")

  const loadConfig = Effect.fail(new Error("Config file not found"))

  const main = Effect.gen(function* () {
    return yield* loadConfig.pipe(Effect.orDie)
  })

  yield* Effect.log(
    "Attempting to load config (will terminate with defect)..."
  )
  return yield* main.pipe(
    Effect.catchAllDefect((defect) =>
      Effect.gen(function* () {
        yield* Effect.logError("Caught defect at system boundary:", defect)
        return yield* Effect.void
      })
    )
  )
})

/**
 * ============================================================
 * EXAMPLE 5: Schema.Defect - Wrapping Unknown Errors
 * ============================================================
 * 
 * SCHEMA.Defect:
 * Type for unknown errors (from external code)
 * 
 * WHEN TO USE:
 * - Calling code that throws
 * - Third-party libraries
 * - Wrapping unknown errors in typed errors
 * 
 * EFFECT.tryPromise:
 * Wrap promise that might reject
 * 
 * PATTERN:
 * catch: (unknown) => MyTypedError wrapping unknown
 * 
 * WHY?
 * External errors are unpredictable.
 * Wrap them in your domain error with context.
 * 
 * REAL-WORLD USE CASES:
 * - External API calls (axios, fetch)
 * - Third-party SDKs (Stripe, AWS)
 * - Database libraries
 * - File system operations
 * - Any code that throws
 * 
 * EXAMPLE SCENARIO:
 * Calling external API that throws random errors.
 * Wrap in ApiError with endpoint context for debugging.
 */
const example5 = Effect.gen(function* () {
  yield* Effect.log("=== Example 5: Schema.Defect - Wrapping unknown errors ===")

  const simulateExternalError = Effect.tryPromise({
    try: async () => {
      throw new Error("External library error")
    },
    catch: (error) =>
      ApiError.make({
        endpoint: "/api/users/1",
        statusCode: 500,
        error,
      }),
  })

  const result = yield* simulateExternalError.pipe(
    Effect.catchTag("ApiError", (error) =>
      Effect.gen(function* () {
        yield* Effect.logError("API Error:", {
          endpoint: error.endpoint,
          statusCode: error.statusCode,
          error: error.error,
        })
        return { id: "1", name: "Fallback User", email: "fallback@example.com" }
      })
    )
  )

  yield* Effect.log("Result:", result)
})

const main = Effect.gen(function* () {
  yield* example1
  yield* Effect.log("")
  yield* example2
  yield* Effect.log("")
  yield* example3
  yield* Effect.log("")
  yield* example4
  yield* Effect.log("")
  yield* example5
})

Effect.runPromise(main)
