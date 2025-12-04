/**
 * ============================================================
 * EFFECT.gen & EFFECT.fn: Async/Await Style with Effects
 * ============================================================
 * 
 * WHAT ARE THESE?
 * - Effect.gen: Generator-based syntax for writing Effect code
 * - Effect.fn: Named generator functions with automatic tracing
 * 
 * WHY USE THEM?
 * Makes Effect code look like async/await but with:
 * - Type-safe error handling
 * - Dependency injection
 * - Automatic resource cleanup
 * - Built-in retry, timeout, concurrency control
 * 
 * SYNTAX COMPARISON:
 * 
 * ❌ Traditional (nested/imperative):
 *    const data = await fetchData()
 *    await logInfo(data)
 *    const processed = await processData(data)
 *    return processed
 * 
 * ❌ Pipe (verbose for imperative flow):
 *    pipe(
 *      fetchData(),
 *      Effect.flatMap(data => 
 *        pipe(
 *          Effect.logInfo(data),
 *          Effect.flatMap(() => processData(data))
 *        )
 *      )
 *    )
 * 
 * ✅ Effect.gen (clean, readable):
 *    Effect.gen(function* () {
 *      const data = yield* fetchData()
 *      yield* Effect.logInfo(data)
 *      return yield* processData(data)
 *    })
 * 
 * WHEN TO USE:
 * - Sequential async operations
 * - Need intermediate values
 * - Complex control flow (if/else, loops)
 * - Building business logic
 * - Writing service methods
 * 
 * WHEN TO USE PIPE INSTEAD:
 * - Simple linear transformations
 * - Don't need intermediate values
 * - Primarily using map/flatMap
 * 
 * REAL-WORLD SCENARIOS:
 * 1. Multi-step API workflows
 * 2. Database transactions
 * 3. File processing pipelines
 * 4. User authentication flows
 * 5. Payment processing
 * 6. Data migration scripts
 */

import { Effect, Schedule } from "effect"

console.log("=== EFFECT.fn & EFFECT.gen ===\n")

/**
 * BASIC BUILDING BLOCKS
 * 
 * EFFECT.sync: Wrap synchronous code
 * 
 * WHEN TO USE:
 * - Function doesn't throw
 * - Purely synchronous
 * - No async operations
 * 
 * REAL-WORLD USE CASES:
 * - Reading in-memory cache
 * - Simple calculations
 * - Formatting strings
 * - Logging to console
 */
const fetchData = Effect.sync(() => {
  console.log("  Fetching data...")
  return "raw data from API"
})

const processData = (data: string) =>
  Effect.sync(() => {
    console.log(`  Processing: ${data}`)
    return data.toUpperCase()
  })

/**
 * EXAMPLE 1: Effect.gen - Imperative Style
 * 
 * DEMONSTRATES:
 * - yield* to unwrap Effects
 * - Sequential operations
 * - Using intermediate values
 * - Effect.logInfo for logging
 * 
 * SYNTAX:
 * - yield* Effect → unwraps to value
 * - Like await for Effect
 * 
 * WHEN TO USE:
 * - Need to use previous results
 * - Multi-step workflows
 * - Easier to read than nested pipes
 * 
 * REAL-WORLD USE CASE:
 * Fetch API data → log what you got → process it → return result
 * Common in REST API handlers, CLI tools, scripts
 */
const basicProgram = Effect.gen(function* () {
  const data = yield* fetchData
  yield* Effect.logInfo(`Got data: ${data}`)
  return yield* processData(data)
})

console.log("1. Basic Effect.gen:")
Effect.runPromise(basicProgram).then((result) => {
  console.log(`  Result: ${result}\n`)
})

/**
 * EXAMPLE 2: Effect.fn - Named Functions with Tracing
 * 
 * WHAT IS EFFECT.fn?
 * - Like Effect.gen but with automatic tracing
 * - Gives function a name for debugging
 * - Better error messages and logs
 * - Shows up in traces and spans
 * 
 * WHEN TO USE:
 * - Reusable Effect-based functions
 * - Want better debugging info
 * - Building libraries/frameworks
 * - Production code (tracing helps debugging)
 * 
 * SYNTAX:
 * Effect.fn("functionName")(function* (params) {
 *   // Effect.gen style code
 * })
 * 
 * BENEFITS:
 * - Function name in stack traces
 * - Better telemetry
 * - Easier debugging in production
 * 
 * REAL-WORLD USE CASES:
 * - Service methods (processUser, createOrder)
 * - Background jobs
 * - API handlers
 * - Business logic functions
 */
type User = { id: string; name: string }

const getUser = (userId: string): Effect.Effect<User> =>
  Effect.sync(() => ({ id: userId, name: `User ${userId}` }))

const processUser = Effect.fn("processUser")(function* (userId: string) {
  yield* Effect.logInfo(`Processing user ${userId}`)
  const user = yield* getUser(userId)
  return user
})

console.log("2. Effect.fn with tracing:")
Effect.runPromise(processUser("123")).then((user) => {
  console.log(`  Processed: ${user.name}\n`)
})

/**
 * EXAMPLE 3: Advanced Effect Patterns with Pipe
 * 
 * DEMONSTRATES:
 * - timeout: Add time limits to operations
 * - retry: Automatic retries with backoff
 * - tap: Side effects without changing value
 * - withSpan: Add tracing spans
 * 
 * WHEN TO USE EACH:
 * 
 * TIMEOUT:
 * - External API calls (prevent hanging)
 * - Database queries (connection limits)
 * - File operations (prevent infinite wait)
 * - User-facing operations (UX)
 * 
 * RETRY:
 * - Flaky network calls
 * - Database deadlocks
 * - Rate-limited APIs
 * - Transient failures
 * 
 * TAP:
 * - Logging intermediate results
 * - Metrics/analytics
 * - Debugging
 * - Notifications
 * 
 * WITHSPAN:
 * - Distributed tracing
 * - Performance monitoring
 * - Production debugging
 * - Understanding flow in complex systems
 * 
 * REAL-WORLD USE CASE:
 * External API call that:
 * - Might timeout (network issues)
 * - Might fail temporarily (retry)
 * - Need to log success (metrics)
 * - Need to trace (debugging)
 * 
 * SCHEDULE EXPLAINED:
 * - exponential("100 millis"): Start with 100ms, double each time
 * - recurs(3): Retry up to 3 times
 * - compose: Combine scheduling policies
 * 
 * EXAMPLE RETRY TIMELINE:
 * Attempt 1: Immediate
 * Attempt 2: Wait 100ms
 * Attempt 3: Wait 200ms
 * Attempt 4: Wait 400ms
 * Then give up
 */
const callExternalApi = Effect.sync(() => "API response")

const resilientCall = callExternalApi.pipe(
  Effect.timeout("2 seconds"),
  Effect.retry(
    Schedule.exponential("100 millis").pipe(Schedule.compose(Schedule.recurs(3)))
  ),
  Effect.tap((data) => Effect.logInfo(`Fetched: ${data}`)),
  Effect.withSpan("callExternalApi")
)

console.log("3. Instrumentation with pipe:")
Effect.runPromise(resilientCall).then(() => {
  console.log("  Done with instrumentation\n")
})
