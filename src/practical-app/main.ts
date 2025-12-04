import { Effect, Layer } from "effect"
import { UserService, TaskService } from "./services"
import { makeStorageLayer } from "./infrastructure/storage"
import { UserId } from "./domain/models"

/**
 * MAIN APPLICATION - Wiring Everything Together
 * 
 * This file demonstrates:
 * - Layer composition (combining all dependencies)
 * - Running Effects in the real world
 * - Error handling at the application boundary
 * - Putting all the concepts together
 */

/**
 * Application Layer - Composing all dependencies
 * 
 * WHAT'S HAPPENING HERE?
 * - makeStorageLayer creates the Storage service
 * - UserService.layer depends on Storage
 * - TaskService.layer depends on Storage + UserService
 * - Layer.provideMerge automatically wires dependencies
 * 
 * WHY THIS WORKS:
 * - Effect analyzes the dependency graph
 * - Ensures services are created in the right order
 * - Each service gets its dependencies automatically
 * 
 * FLOW:
 * 1. Storage is created (no dependencies)
 * 2. UserService is created (gets Storage)
 * 3. TaskService is created (gets Storage + UserService)
 * 
 * PATTERN: Merge layers from bottom to top
 * - Start with infrastructure (Storage)
 * - Add domain services (UserService, TaskService)
 * - Result: Complete application with all dependencies
 */
const appLayer = TaskService.layer.pipe(
  Layer.provideMerge(UserService.layer),
  Layer.provideMerge(makeStorageLayer("./data"))
)

/**
 * Demo Program - Showcasing all features
 * 
 * DEMONSTRATES:
 * - Registering users
 * - Creating tasks
 * - Updating task status
 * - Assigning tasks
 * - Listing tasks
 * - Error handling (duplicate users, authorization, etc.)
 * 
 * WHY Effect.gen?
 * - Sequential operations (do A, then B, then C)
 * - Automatic error propagation
 * - Type-safe dependency access
 * 
 * PATTERN: Business logic flow
 * 1. Setup data (register users)
 * 2. Perform operations (create tasks)
 * 3. Queries (list tasks)
 * 4. Handle errors (catch and recover)
 */
const demoProgram = Effect.gen(function* () {
  const userService = yield* UserService
  const taskService = yield* TaskService

  yield* Effect.log("=== Task Management System Demo ===\n")

  yield* Effect.log("📝 Registering users...")
  const alice = yield* userService.register("alice@example.com", "Alice")
  yield* Effect.logInfo(`Created user: ${alice.name} (${alice.email})`)

  const bob = yield* userService.register("bob@example.com", "Bob")
  yield* Effect.logInfo(`Created user: ${bob.name} (${bob.email})`)

  yield* Effect.log("\n✅ Creating tasks...")
  const task1 = yield* taskService.create(
    "Implement user authentication",
    "Add JWT-based auth with refresh tokens",
    "high",
    alice.id
  )
  yield* Effect.logInfo(`Created task: ${task1.title} [${task1.priority}]`)

  const task2 = yield* taskService.create(
    "Write documentation",
    "Document all API endpoints",
    "medium",
    alice.id
  )
  yield* Effect.logInfo(`Created task: ${task2.title} [${task2.priority}]`)

  const task3 = yield* taskService.create(
    "Setup CI/CD pipeline",
    undefined,
    "low",
    bob.id
  )
  yield* Effect.logInfo(`Created task: ${task3.title} [${task3.priority}]`)

  yield* Effect.log("\n👤 Assigning task to Bob...")
  const assigned = yield* taskService.assignTask(task1.id, bob.id, alice.id)
  yield* Effect.logInfo(`Assigned "${assigned.title}" to Bob`)

  yield* Effect.log("\n📋 Updating task status...")
  const updated = yield* taskService.updateStatus(task2.id, "in-progress", alice.id)
  yield* Effect.logInfo(`Updated "${updated.title}" to ${updated.status}`)

  yield* Effect.log("\n📊 Listing all tasks...")
  const allTasks = yield* taskService.listAll()
  yield* Effect.logInfo(`Total tasks: ${allTasks.length}`)
  for (const task of allTasks) {
    yield* Effect.logInfo(
      `  - [${task.status}] ${task.title} (priority: ${task.priority})`
    )
  }

  yield* Effect.log("\n🔍 Listing Alice's tasks...")
  const aliceTasks = yield* taskService.listByUser(alice.id)
  yield* Effect.logInfo(`Alice's tasks: ${aliceTasks.length}`)

  yield* Effect.log("\n🔍 Listing Bob's tasks...")
  const bobTasks = yield* taskService.listByUser(bob.id)
  yield* Effect.logInfo(`Bob's tasks: ${bobTasks.length}`)

  /**
   * Error Handling Demo
   * 
   * DEMONSTRATES:
   * - Attempting operations that should fail
   * - Using catchTag to handle specific errors
   * - Recovering from errors gracefully
   * 
   * WHY catchTag?
   * - Handle specific error types differently
   * - Recover from expected errors
   * - Let unexpected errors bubble up
   */
  yield* Effect.log("\n❌ Testing error handling...")

  yield* Effect.log("Trying to register duplicate user...")
  yield* userService.register("alice@example.com", "Alice Clone").pipe(
    Effect.catchTag("DuplicateError", (error) =>
      Effect.gen(function* () {
        yield* Effect.logWarning(
          `✓ Caught expected error: ${error.field} '${error.value}' already exists`
        )
        return yield* userService.findById(alice.id)
      })
    )
  )

  yield* Effect.log("Trying to update task as wrong user...")
  yield* taskService.updateStatus(task1.id, "completed", bob.id).pipe(
    Effect.catchTag("UnauthorizedError", (error) =>
      Effect.gen(function* () {
        yield* Effect.logWarning(`✓ Caught expected error: ${error.action}`)
        return task1
      })
    )
  )

  yield* Effect.log("Trying to find non-existent user...")
  yield* userService.findById(UserId.make("fake-id")).pipe(
    Effect.catchTag("NotFoundError", (error) =>
      Effect.logWarning(
        `✓ Caught expected error: ${error.resource} '${error.id}' not found`
      )
    )
  )

  yield* Effect.log("\n✨ Demo completed successfully!")
})

/**
 * Running the Program
 * 
 * WHAT'S HAPPENING:
 * 1. demoProgram has dependencies (UserService, TaskService)
 * 2. Effect.provide injects those dependencies via appLayer
 * 3. Effect.runPromise executes the Effect as a Promise
 * 4. If any error isn't caught, it will be logged here
 * 
 * WHY runPromise?
 * - Bridges Effect world to Promise/async world
 * - Needed to actually execute the program
 * - Top-level entry point
 * 
 * ERROR HANDLING AT THE BOUNDARY:
 * - All expected errors are handled in demoProgram
 * - Only unexpected errors (bugs, system failures) reach here
 * - We log them and exit with error code
 * 
 * PATTERN: Provide all dependencies, then run
 * ```typescript
 * const program: Effect.Effect<A, E, R> = ...
 * const runnable = Effect.provide(program, layer)  // R becomes never
 * Effect.runPromise(runnable)  // Execute
 * ```
 */
const main = demoProgram.pipe(Effect.provide(appLayer))

Effect.runPromise(main).catch((error) => {
  console.error("Unexpected error:", error)
  process.exit(1)
})

/**
 * LEARNING NOTES - Putting It All Together:
 * 
 * 1. LAYER COMPOSITION:
 *    ```typescript
 *    const app = ServiceC.layer.pipe(
 *      Layer.provideMerge(ServiceB.layer),  // C depends on B
 *      Layer.provideMerge(ServiceA.layer)   // B depends on A
 *    )
 *    ```
 *    - Effect figures out dependency order
 *    - Each service gets what it needs
 *    - Type-checked at compile time
 * 
 * 2. DEPENDENCY GRAPH:
 *    ```
 *    Storage (no dependencies)
 *      ↓
 *    UserService (needs Storage)
 *      ↓
 *    TaskService (needs Storage + UserService)
 *      ↓
 *    Main Program (needs UserService + TaskService)
 *    ```
 * 
 * 3. ERROR HANDLING LAYERS:
 *    - Business logic: Handle expected errors (catchTag, catchAll)
 *    - Application boundary: Log unexpected errors
 *    - This demo: All errors are expected and handled
 * 
 * 4. RUNNING EFFECTS:
 *    ```typescript
 *    // Has dependencies
 *    const program: Effect.Effect<A, E, Storage | UserService>
 * 
 *    // Provide dependencies
 *    const runnable: Effect.Effect<A, E, never>
 *      = Effect.provide(program, appLayer)
 * 
 *    // Execute
 *    Effect.runPromise(runnable)
 *    ```
 * 
 * 5. COMPARED TO TRADITIONAL ARCHITECTURE:
 * 
 *    Traditional (manual DI):
 *    ```typescript
 *    const storage = new FileStorage("./data")
 *    const userService = new UserService(storage)
 *    const taskService = new TaskService(storage, userService)
 *    ```
 *    - Manual wiring (error-prone)
 *    - Hard to test (need to mock everything)
 *    - No type safety for dependencies
 * 
 *    Effect (automatic DI):
 *    ```typescript
 *    const app = TaskService.layer.pipe(
 *      Layer.provideMerge(UserService.layer),
 *      Layer.provideMerge(makeStorageLayer("./data"))
 *    )
 *    ```
 *    - Automatic wiring
 *    - Easy to test (swap layers)
 *    - Type-safe (compiler checks dependencies)
 * 
 * 6. TESTING STRATEGY:
 *    ```typescript
 *    // Production
 *    const prodLayer = makeStorageLayer("./data")
 * 
 *    // Testing
 *    const testLayer = makeInMemoryStorageLayer()
 * 
 *    // Same program, different implementation
 *    Effect.provide(program, prodLayer)   // Real files
 *    Effect.provide(program, testLayer)   // In memory
 *    ```
 * 
 * 7. KEY TAKEAWAYS:
 *    ✅ Schema: Runtime validation + type safety
 *    ✅ TaggedError: Serializable, composable errors
 *    ✅ Services: Dependency injection without boilerplate
 *    ✅ Layers: Automatic dependency wiring
 *    ✅ Effect.gen: Sequential operations with automatic error handling
 *    ✅ Type safety: All errors and dependencies tracked in types
 * 
 * 8. WHEN TO USE EFFECT:
 *    ✅ Complex error handling requirements
 *    ✅ Need dependency injection
 *    ✅ Working with external systems (DB, files, API)
 *    ✅ Want type-safe async operations
 *    ✅ Need composable, testable code
 * 
 * 9. WHEN MAYBE NOT:
 *    ❌ Simple scripts with no dependencies
 *    ❌ Pure computation (use plain functions)
 *    ❌ Team not familiar with functional programming
 *    ❌ Very small projects (overhead might not be worth it)
 * 
 * Try modifying this demo:
 * - Add a new field to Task (e.g., dueDate)
 * - Add a new operation (e.g., deleteTask)
 * - Add a new error type (e.g., TaskOverdueError)
 * - Create a different storage implementation (in-memory)
 * - Add logging service to track all operations
 */
