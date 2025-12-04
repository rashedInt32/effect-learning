import { Context, Effect, Layer } from "effect"
import { promises as fs } from "node:fs"
import { join } from "node:path"
import { Task, User } from "../domain/models"
import { FileSystemError } from "../errors"
import { ParseResult, Schema } from "effect"

/**
 * STORAGE SERVICE - File-based persistence using Services & Layers
 * 
 * This demonstrates the infrastructure layer of our app.
 * It's separated from business logic so we can swap implementations
 * (e.g., file storage → database) without changing business code.
 */

/**
 * Storage Interface - The "contract" for storage operations
 * 
 * WHY AN INTERFACE?
 * - Defines WHAT operations are available (save, load)
 * - Doesn't specify HOW they work (could be files, DB, memory)
 * - Allows swapping implementations (testing, different environments)
 * 
 * WHEN TO USE:
 * - External dependencies (file system, database, API clients)
 * - Operations that need different implementations (test vs production)
 * - Clear separation between business logic and infrastructure
 * 
 * PATTERN: Notice Effect.Effect return types
 * - Effect<A, E, R> where:
 *   - A = Success type (what we get back)
 *   - E = Error type (what can go wrong)
 *   - R = Requirements (dependencies needed) - none here, will be added when used
 */
export class Storage extends Context.Tag("Storage")<
  Storage,
  {
    readonly saveUsers: (users: User[]) => Effect.Effect<void, FileSystemError | ParseResult.ParseError>
    readonly loadUsers: () => Effect.Effect<User[], FileSystemError | ParseResult.ParseError>
    readonly saveTasks: (tasks: Task[]) => Effect.Effect<void, FileSystemError | ParseResult.ParseError>
    readonly loadTasks: () => Effect.Effect<Task[], FileSystemError | ParseResult.ParseError>
  }
>() {}

/**
 * FileStorage Implementation - Actual file system operations
 * 
 * WHY A SEPARATE IMPLEMENTATION?
 * - Can have multiple implementations (FileStorage, MemoryStorage, DbStorage)
 * - Business logic doesn't know/care which implementation is used
 * - Easy to mock for testing
 * 
 * DEMONSTRATES:
 * - Effect.tryPromise: Converting async operations to Effects
 * - Schema.encode/decode: Serializing to/from JSON
 * - Error handling: Wrapping fs errors in FileSystemError
 */
export const makeFileStorage = (dataDir: string) => {
  const usersPath = join(dataDir, "users.json")
  const tasksPath = join(dataDir, "tasks.json")

  /**
   * Helper to ensure directory exists
   * 
   * WHY Effect.tryPromise?
   * - Converts Promise to Effect
   * - Allows us to catch and transform errors
   * - Makes errors type-safe (FileSystemError instead of unknown)
   * 
   * HOW IT WORKS:
   * - try: The async operation to attempt
   * - catch: Function to transform errors into our error type
   * 
   * PATTERN: Schema.Defect wraps unknown errors
   * - Node fs errors can be anything (Error, string, etc.)
   * - Schema.Defect makes them serializable
   * - We wrap in FileSystemError with context (operation, path)
   */
  const ensureDir = Effect.tryPromise({
    try: () => fs.mkdir(dataDir, { recursive: true }),
    catch: (error) =>
      FileSystemError.make({
        operation: "mkdir",
        path: dataDir,
        error,
      }),
  })

  /**
   * Save data to file
   * 
   * DEMONSTRATES:
   * - Schema.encode: Convert runtime objects to JSON-safe format (Effect version)
   * - Effect.gen: Generator syntax for sequential operations
   * - Effect.tryPromise: Async file operations
   * 
   * WHY Schema.encode?
   * - Our models use branded types (UserId, TaskId)
   * - Dates are Date objects, not strings
   * - JSON.stringify can't handle these directly
   * - encode transforms to JSON-safe primitives
   * 
   * KEY LEARNING: Schema has TWO representations:
   * - Type (runtime): User with Date objects, branded types
   * - Encoded (JSON): Plain object with string dates, plain strings
   * 
   * FLOW:
   * 1. Ensure directory exists
   * 2. Encode data to JSON format (branded types → primitives, Dates → strings)
   * 3. Write to file
   * 4. If any step fails, return FileSystemError
   */
  const saveData = <A, I>(
    filePath: string,
    data: A[],
    schema: Schema.Schema<A, I>
  ): Effect.Effect<void, FileSystemError | ParseResult.ParseError> =>
    Effect.gen(function* () {
      yield* ensureDir
      const encoded = yield* Effect.all(
        data.map((item) => Schema.encode(schema)(item))
      )
      yield* Effect.tryPromise({
        try: () => fs.writeFile(filePath, JSON.stringify(encoded, null, 2)),
        catch: (error) =>
          FileSystemError.make({
            operation: "writeFile",
            path: filePath,
            error,
          }),
      })
    })

  /**
   * Load data from file
   * 
   * DEMONSTRATES:
   * - Reading files with error handling
   * - Schema.decode: Convert JSON back to runtime objects (Effect version)
   * - Returning empty array if file doesn't exist (common pattern)
   * 
   * WHY Schema.decode?
   * - Validates data structure (what if file is corrupted?)
   * - Transforms primitives back to branded types
   * - Converts string dates back to Date objects
   * 
   * KEY LEARNING: decode is the inverse of encode
   * - encode: Runtime → JSON (User with Dates → plain object with strings)
   * - decode: JSON → Runtime (plain object with strings → User with Dates)
   * 
   * PATTERN: catchTag for specific error handling
   * - If file doesn't exist, return empty array (not an error)
   * - Other file errors are still errors
   * 
   * FLOW:
   * 1. Try to read file
   * 2. Parse JSON (gets us plain objects with strings)
   * 3. Decode each item (validate + transform to runtime types)
   * 4. If file not found, return empty array
   * 5. Other errors bubble up
   */
  const loadData = <A, I>(
    filePath: string,
    schema: Schema.Schema<A, I>
  ): Effect.Effect<A[], FileSystemError | ParseResult.ParseError> =>
    Effect.gen(function* () {
      const content = yield* Effect.tryPromise({
        try: () => fs.readFile(filePath, "utf-8"),
        catch: (error) =>
          FileSystemError.make({
            operation: "readFile",
            path: filePath,
            error,
          }),
      })

      const parsed = JSON.parse(content) as I[]
      return yield* Effect.all(
        parsed.map((item) => Schema.decode(schema)(item))
      )
    }).pipe(
      Effect.catchTag("FileSystemError", (error) => {
        const errorObj = error.error as { name?: string; code?: string; message?: string }
        if (errorObj && errorObj.code === "ENOENT") {
          return Effect.succeed([])
        }
        return Effect.fail(error)
      })
    )

  return Storage.of({
    saveUsers: (users) => saveData(usersPath, users, User),
    loadUsers: () => loadData(usersPath, User),
    saveTasks: (tasks) => saveData(tasksPath, tasks, Task),
    loadTasks: () => loadData(tasksPath, Task),
  })
}

/**
 * Layer - Providing the implementation
 * 
 * WHAT IS A LAYER?
 * - A Layer is a recipe for constructing a service
 * - Handles dependency injection automatically
 * - Composes with other layers to build complete app
 * 
 * WHY Layer.succeed?
 * - Simple constructor (no dependencies, no errors)
 * - Other Layer constructors:
 *   - Layer.effect: When construction can fail
 *   - Layer.scoped: When service needs cleanup
 *   - Layer.merge: Combine multiple layers
 * 
 * HOW TO USE:
 * - Create layer once
 * - Provide it to Effects that need Storage
 * - Effect runtime automatically injects it
 * 
 * Example:
 *   const program: Effect.Effect<void, Error, Storage> = ...
 *   Effect.provide(program, StorageLive)  // Injects Storage
 */
export const makeStorageLayer = (dataDir: string) =>
  Layer.sync(Storage, () => Storage.of(makeFileStorage(dataDir)))

/**
 * LEARNING NOTES - Services & Layers:
 * 
 * 1. SEPARATION OF CONCERNS:
 *    - Storage (interface) = WHAT operations are available
 *    - makeFileStorage = HOW operations work (file system)
 *    - StorageLayer = WHERE to get the implementation
 * 
 * 2. DEPENDENCY INJECTION FLOW:
 *    ```typescript
 *    // 1. Define what you need (in your Effect)
 *    const program = Effect.gen(function*() {
 *      const storage = yield* Storage  // Request Storage service
 *      yield* storage.saveUsers([...])
 *    })
 *    // Type: Effect<void, FileSystemError, Storage>
 *    //                                     ^^^^^^^ dependency
 * 
 *    // 2. Provide implementation
 *    const runnable = program.pipe(
 *      Effect.provide(makeStorageLayer("/data"))
 *    )
 *    // Type: Effect<void, FileSystemError, never>
 *    //                                     ^^^^^ no dependencies!
 * 
 *    // 3. Run it
 *    Effect.runPromise(runnable)
 *    ```
 * 
 * 3. BENEFITS:
 *    - Easy testing (swap FileStorage for MemoryStorage)
 *    - No global state (each test gets fresh instance)
 *    - Type-safe (compiler ensures all dependencies provided)
 *    - Composable (layers combine automatically)
 * 
 * 4. COMPARED TO OTHER PATTERNS:
 * 
 *    Manual dependency injection:
 *    ```typescript
 *    class TaskService {
 *      constructor(private storage: Storage) {}
 *    }
 *    const storage = new FileStorage()
 *    const taskService = new TaskService(storage)
 *    ```
 *    - Lots of boilerplate
 *    - Have to wire everything manually
 *    - Hard to track what depends on what
 * 
 *    Effect layers:
 *    ```typescript
 *    const program = Effect.gen(function*() {
 *      const storage = yield* Storage
 *      const taskService = yield* TaskService
 *    })
 *    Effect.provide(program, Layer.merge(StorageLayer, TaskServiceLayer))
 *    ```
 *    - Automatic wiring
 *    - Type-checked (compiler ensures all deps provided)
 *    - Composable (layers merge automatically)
 * 
 * 5. WHEN TO USE SERVICES:
 *    ✅ External dependencies (DB, file system, HTTP)
 *    ✅ Multiple implementations (test vs production)
 *    ✅ Stateful resources (connection pools, caches)
 *    ❌ Pure functions (just write normal functions)
 *    ❌ Simple utilities (use modules/imports)
 */
