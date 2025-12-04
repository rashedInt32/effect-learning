/**
 * ============================================================
 * SERVICES & LAYERS: Dependency Injection in Effect
 * ============================================================
 * 
 * WHAT ARE SERVICES?
 * Services are interfaces that provide functionality.
 * They represent dependencies your code needs (DB, Logger, Config, etc.)
 * 
 * WHAT ARE LAYERS?
 * Layers are factories that create service implementations.
 * They handle initialization, dependencies, and lifecycle.
 * 
 * THE PROBLEM THEY SOLVE:
 * ❌ Traditional approach (global singletons):
 *    - Hard to test (can't swap implementations)
 *    - Hidden dependencies (not in function signature)
 *    - Initialization order issues
 *    - Can't have multiple instances
 * 
 * ❌ Manual dependency injection:
 *    - Pass everything through function params
 *    - Boilerplate everywhere
 *    - Hard to add new dependencies
 * 
 * ✅ Effect Services & Layers:
 *    - Dependencies explicit in type signature
 *    - Easy to test (swap layers)
 *    - Automatic initialization in correct order
 *    - Type-safe
 *    - Composable
 * 
 * KEY CONCEPTS:
 * 
 * 1. SERVICE (interface):
 *    Defines WHAT operations are available
 *    Example: Database with query() and execute()
 * 
 * 2. LAYER (implementation):
 *    Defines HOW to create the service
 *    Example: PostgresLayer, TestDbLayer
 * 
 * 3. CONTEXT (Requirements):
 *    Third type param in Effect<A, E, R>
 *    Lists what services this Effect needs
 * 
 * WHEN TO USE:
 * - Need to inject dependencies (DB, Logger, API clients)
 * - Want to test with mock implementations
 * - Building reusable modules
 * - Complex applications with many services
 * 
 * REAL-WORLD SCENARIOS:
 * 1. Database access (test DB vs production DB)
 * 2. Logging (console vs file vs cloud)
 * 3. Email sending (real vs fake in tests)
 * 4. Payment processing (Stripe vs test mode)
 * 5. File storage (local vs S3 vs Azure)
 * 6. Feature flags
 * 7. Configuration management
 * 8. API clients (different base URLs per env)
 */

import { Context, Effect, Layer } from "effect"

console.log("=== SERVICES & LAYERS ===\n")

/**
 * SERVICE 1: Database
 * 
 * CONTEXT.TAG:
 * Creates a service identifier and interface
 * 
 * PARAMETERS:
 * 1. "@app/Database": Unique string identifier
 * 2. Database: The service class/tag itself
 * 3. Interface: Methods the service provides
 * 
 * WHY USE A TAG?
 * - Runtime identification
 * - Can have multiple services of same type
 * - Better error messages
 * 
 * REAL-WORLD USE CASE:
 * Database service that can be swapped:
 * - Production: Real PostgreSQL
 * - Tests: In-memory fake
 * - Development: Local Docker DB
 */
class Database extends Context.Tag("@app/Database")<
  Database,
  {
    readonly query: (sql: string) => Effect.Effect<unknown[]>
    readonly execute: (sql: string) => Effect.Effect<void>
  }
>() {
  /**
   * LAYER: Test Implementation
   * 
   * LAYER.sync: Create layer from synchronous factory
   * 
   * WHEN TO USE:
   * - Service initialization doesn't need async
   * - No cleanup needed
   * - Simple in-memory implementations
   * 
   * DATABASE.of(): Creates service instance
   * 
   * REAL-WORLD:
   * This test layer uses in-memory object as "database"
   * Perfect for unit tests - no real DB needed
   */
  static readonly testLayer = Layer.sync(Database, () => {
    const records: Record<string, unknown> = {
      "user-1": { id: "user-1", name: "Alice", email: "alice@example.com" },
      "user-2": { id: "user-2", name: "Bob", email: "bob@example.com" },
    }

    return Database.of({
      query: (sql: string) =>
        Effect.sync(() => {
          console.log(`  [DB] Query: ${sql}`)
          return Object.values(records)
        }),
      execute: (sql: string) =>
        Effect.sync(() => {
          console.log(`  [DB] Execute: ${sql}`)
        }),
    })
  })
}

/**
 * SERVICE 2: Logger
 * 
 * WHEN TO USE LOGGER SERVICE:
 * - Want different logging per environment
 * - Need to capture logs in tests
 * - Send logs to different destinations
 * 
 * REAL-WORLD IMPLEMENTATIONS:
 * - Console: Development
 * - File: Production server
 * - CloudWatch/Datadog: Production monitoring
 * - Silent: Tests (unless debugging)
 */
class Logger extends Context.Tag("@app/Logger")<
  Logger,
  {
    readonly log: (message: string) => Effect.Effect<void>
  }
>() {
  static readonly consoleLayer = Layer.sync(Logger, () =>
    Logger.of({
      log: (message: string) =>
        Effect.sync(() => {
          console.log(`  [Logger] ${message}`)
        }),
    })
  )
}

/**
 * SERVICE 3: UserService (depends on other services)
 * 
 * LAYER.effect: Create layer that needs Effect operations
 * 
 * WHEN TO USE:
 * - Service needs other services (dependencies)
 * - Initialization needs async operations
 * - Need error handling during setup
 * 
 * DEMONSTRATES:
 * - Service composition (UserService needs Database + Logger)
 * - yield* to get dependencies
 * - Effect.fn for traced methods
 * 
 * DEPENDENCY INJECTION:
 * const db = yield* Database
 * const logger = yield* Logger
 * 
 * Effect runtime automatically:
 * 1. Creates Database
 * 2. Creates Logger
 * 3. Passes both to UserService
 * 4. Ensures correct initialization order
 * 
 * REAL-WORLD USE CASE:
 * UserService needs DB to query users and Logger to log operations
 * In tests: swap Database for in-memory, Logger for silent
 * In prod: use real Postgres, CloudWatch logging
 */
class UserService extends Context.Tag("@app/UserService")<
  UserService,
  {
    readonly getAll: () => Effect.Effect<unknown[]>
  }
>() {
  static readonly layer = Layer.effect(
    UserService,
    Effect.gen(function* () {
      const db = yield* Database
      const logger = yield* Logger

      const getAll = Effect.fn("UserService.getAll")(function* () {
        yield* logger.log("Fetching all users")
        const users = yield* db.query("SELECT * FROM users")
        yield* logger.log(`Found ${users.length} users`)
        return users
      })

      return UserService.of({ getAll })
    })
  )
}

/**
 * COMPOSING LAYERS
 * 
 * LAYER.provideMerge: Combine layers
 * 
 * HOW IT WORKS:
 * UserService.layer needs Database + Logger
 * We "provide" those dependencies by merging layers
 * 
 * THINK OF IT AS:
 * "UserService needs Database and Logger, here they are"
 * 
 * DEPENDENCY GRAPH:
 * UserService → Database
 *            → Logger
 * 
 * Effect automatically:
 * - Creates Database first
 * - Creates Logger first
 * - Then creates UserService
 * - No manual coordination needed
 */
const appLayer = UserService.layer.pipe(
  Layer.provideMerge(Database.testLayer),
  Layer.provideMerge(Logger.consoleLayer)
)

/**
 * USING SERVICES
 * 
 * PATTERN:
 * 1. Write program that needs services
 * 2. Type signature shows requirements: Effect<A, E, UserService>
 * 3. Provide layer to satisfy requirements
 * 4. Run the program
 * 
 * EFFECT.provide(appLayer):
 * Satisfies all service requirements
 * 
 * TYPE TRANSFORMATION:
 * Before: Effect<unknown[], never, UserService>
 * After:  Effect<unknown[], never, never>
 * 
 * REAL-WORLD FLOW:
 * 1. Write business logic using services
 * 2. In main.ts: provide production layers
 * 3. In tests: provide test layers
 * Same code, different implementations!
 */
const program = Effect.gen(function* () {
  const userService = yield* UserService
  const users = yield* userService.getAll()
  yield* Effect.logInfo(`Total users: ${users.length}`)
  return users
})

console.log("Running program with services:")
Effect.runPromise(program.pipe(Effect.provide(appLayer))).then(() => {
  console.log("\n✓ Services & Layers example complete\n")
})
