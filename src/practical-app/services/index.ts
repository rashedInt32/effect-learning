import { Context, Effect, Layer, ParseResult } from "effect"
import {
  User,
  UserId,
  Task,
  TaskId,
  Email,
  createTask,
  TaskStatus,
  TaskPriority,
} from "../domain/models"
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  DuplicateError,
  FileSystemError,
} from "../errors"
import { Storage } from "../infrastructure/storage"

/**
 * BUSINESS LOGIC - Services with Effect.gen
 * 
 * This file demonstrates how to build application logic using:
 * - Effect.gen: Generator syntax for sequential operations  
 * - Services: Dependency injection with Context.Tag
 * - Error handling: Type-safe errors with recovery
 * - Composition: Building complex operations from simple ones
 */

/**
 * UserService - Managing users
 * 
 * WHY A SERVICE?
 * - Encapsulates user-related business logic
 * - Depends on Storage (dependency injection)
 * - Returns Effects (composable, type-safe)
 * 
 * DEMONSTRATES:
 * - Effect.gen for sequential operations
 * - Yielding dependencies (yield* Storage)
 * - Yielding Effects (yield* storage.loadUsers())
 * - Error handling (validation, duplicates, not found)
 */
export class UserService extends Context.Tag("UserService")<
  UserService,
  {
    readonly register: (
      email: string,
      name: string
    ) => Effect.Effect<User, ValidationError | DuplicateError | FileSystemError | ParseResult.ParseError>
    readonly findById: (
      id: typeof UserId.Type
    ) => Effect.Effect<User, NotFoundError | FileSystemError | ParseResult.ParseError>
    readonly listAll: () => Effect.Effect<User[], FileSystemError | ParseResult.ParseError>
  }
>() {
  /**
   * Layer - Defines how to construct UserService
   * 
   * WHY Layer.effect?
   * - UserService depends on Storage
   * - Layer.effect handles dependency injection automatically
   * - Effect runtime will provide Storage when needed
   * 
   * PATTERN:
   * 1. yield* Storage to get the storage service
   * 2. Define operations using Effect.gen
   * 3. Return service implementation with UserService.of()
   */
  static readonly layer = Layer.effect(
    UserService,
    Effect.gen(function* () {
      const storage = yield* Storage

      /**
       * Register a new user
       * 
       * DEMONSTRATES:
       * - Input validation with Schema
       * - Checking for duplicates
       * - Creating and saving entities
       * - Error handling at each step
       * 
       * FLOW:
       * 1. Validate email format (Schema.decodeUnknown)
       * 2. Load existing users
       * 3. Check for duplicate email
       * 4. Create new user
       * 5. Save all users
       * 6. Return new user
       * 
       * WHY yield*?
       * - Unwraps Effect values (like await for Promises)
       * - Propagates errors up (if any step fails, whole function fails)
       * - Type-safe (TypeScript knows the unwrapped type)
       */
      const register = (
        email: string,
        name: string
      ): Effect.Effect<
        User,
        ValidationError | DuplicateError | FileSystemError | ParseResult.ParseError
      > =>
        Effect.gen(function* () {
          if (name.trim() === "") {
            return yield* ValidationError.make({
              field: "name",
              message: "Name cannot be empty",
            })
          }

          const validatedEmail = yield* Effect.try({
            try: () => Email.make(email),
            catch: () =>
              ValidationError.make({
                field: "email",
                message: "Invalid email format",
              }),
          })

          const users = yield* storage.loadUsers()

          const existingUser = users.find(
            (u) => u.email === validatedEmail
          )
          if (existingUser) {
            return yield* DuplicateError.make({
              resource: "User",
              field: "email",
              value: email,
            })
          }

          const newUser = new User({
            id: UserId.make(`user-${Date.now()}-${Math.random().toString(36).slice(2)}`),
            email: validatedEmail,
            name,
            createdAt: new Date(),
          })

          yield* storage.saveUsers([...users, newUser])
          return newUser
        })

      /**
       * Find user by ID
       * 
       * DEMONSTRATES:
       * - Loading data from storage
       * - Searching collections
       * - Returning NotFoundError when appropriate
       * 
       * WHY return yield* for errors?
       * - Makes the error part of the Effect type
       * - Caller can handle with catchTag/catchAll
       * - Type-safe error handling
       */
      const findById = (
        id: typeof UserId.Type
      ): Effect.Effect<User, NotFoundError | FileSystemError | ParseResult.ParseError> =>
        Effect.gen(function* () {
          const users = yield* storage.loadUsers()
          const user = users.find((u) => u.id === id)

          if (!user) {
            return yield* NotFoundError.make({
              resource: "User",
              id: String(id),
            })
          }

          return user
        })

      const listAll = (): Effect.Effect<User[], FileSystemError | ParseResult.ParseError> =>
        storage.loadUsers()

      return UserService.of({ register, findById, listAll })
    })
  )
}

/**
 * TaskService - Managing tasks
 * 
 * DEMONSTRATES MORE ADVANCED PATTERNS:
 * - Multiple dependencies (Storage + UserService)
 * - Complex business logic (authorization checks)
 * - State updates (changing task status)
 * - Filtering and querying
 */
export class TaskService extends Context.Tag("TaskService")<
  TaskService,
  {
    readonly create: (
      title: string,
      description: string | undefined,
      priority: TaskPriority,
      createdBy: typeof UserId.Type
    ) => Effect.Effect<Task, ValidationError | UnauthorizedError | FileSystemError | ParseResult.ParseError>
    readonly findById: (
      id: typeof TaskId.Type
    ) => Effect.Effect<Task, NotFoundError | FileSystemError | ParseResult.ParseError>
    readonly listAll: () => Effect.Effect<Task[], FileSystemError | ParseResult.ParseError>
    readonly listByUser: (
      userId: typeof UserId.Type
    ) => Effect.Effect<Task[], FileSystemError | ParseResult.ParseError>
    readonly updateStatus: (
      taskId: typeof TaskId.Type,
      status: TaskStatus,
      userId: typeof UserId.Type
    ) => Effect.Effect<Task, NotFoundError | UnauthorizedError | FileSystemError | ParseResult.ParseError>
    readonly assignTask: (
      taskId: typeof TaskId.Type,
      assigneeId: typeof UserId.Type,
      requesterId: typeof UserId.Type
    ) => Effect.Effect<Task, NotFoundError | UnauthorizedError | FileSystemError | ParseResult.ParseError>
  }
>() {
  /**
   * Layer with multiple dependencies
   * 
   * DEMONSTRATES:
   * - Depending on Storage
   * - Depending on UserService
   * - Both automatically injected by Effect runtime
   * 
   * PATTERN: Just yield* each dependency
   * - Effect figures out the dependency graph
   * - Ensures everything is constructed in correct order
   */
  static readonly layer = Layer.effect(
    TaskService,
    Effect.gen(function* () {
      const storage = yield* Storage
      const userService = yield* UserService

      /**
       * Create a new task
       * 
       * DEMONSTRATES:
       * - Validation (title length, user exists)
       * - Using helper functions (createTask)
       * - Composing with other services (userService.findById)
       * - Error propagation
       * 
       * WHY check if user exists?
       * - Business rule: only existing users can create tasks
       * - Demonstrates service composition
       * - Shows how errors from one service propagate through another
       */
      const create = (
        title: string,
        description: string | undefined,
        priority: TaskPriority,
        createdBy: typeof UserId.Type
      ): Effect.Effect<
        Task,
        ValidationError | UnauthorizedError | FileSystemError | ParseResult.ParseError
      > =>
        Effect.gen(function* () {
          if (title.trim() === "") {
            return yield* ValidationError.make({
              field: "title",
              message: "Title cannot be empty",
            })
          }

          yield* userService.findById(createdBy).pipe(
            Effect.catchTag("NotFoundError", () =>
              Effect.fail(
                UnauthorizedError.make({
                  action: "create task - user does not exist",
                })
              )
            )
          )

          const tasks = yield* storage.loadTasks()
          const newTask = createTask({
            title,
            description,
            priority,
            createdBy,
          })

          yield* storage.saveTasks([...tasks, newTask])
          return newTask
        })

      const findById = (
        id: typeof TaskId.Type
      ): Effect.Effect<Task, NotFoundError | FileSystemError | ParseResult.ParseError> =>
        Effect.gen(function* () {
          const tasks = yield* storage.loadTasks()
          const task = tasks.find((t) => t.id === id)

          if (!task) {
            return yield* NotFoundError.make({
              resource: "Task",
              id: String(id),
            })
          }

          return task
        })

      const listAll = (): Effect.Effect<Task[], FileSystemError | ParseResult.ParseError> =>
        storage.loadTasks()

      /**
       * List tasks by user
       * 
       * DEMONSTRATES:
       * - Filtering data
       * - Working with optional fields (task.assignedTo)
       * - Finding tasks created by OR assigned to a user
       */
      const listByUser = (
        userId: typeof UserId.Type
      ): Effect.Effect<Task[], FileSystemError | ParseResult.ParseError> =>
        Effect.gen(function* () {
          const tasks = yield* storage.loadTasks()
          return tasks.filter(
            (t) => t.createdBy === userId || t.assignedTo === userId
          )
        })

      /**
       * Update task status
       * 
       * DEMONSTRATES:
       * - Authorization checks (only creator can update)
       * - Updating entities (creating new instance with changes)
       * - Saving changes back to storage
       * 
       * WHY create new Task instead of mutating?
       * - Immutability (Effect philosophy)
       * - Easier to reason about
       * - Can track history if needed
       * 
       * PATTERN: Load → Validate → Update → Save
       * - Common pattern for state updates
       * - Each step can fail with different errors
       * - Type-safe error handling at each step
       */
      const updateStatus = (
        taskId: typeof TaskId.Type,
        status: TaskStatus,
        userId: typeof UserId.Type
      ): Effect.Effect<
        Task,
        NotFoundError | UnauthorizedError | FileSystemError | ParseResult.ParseError
      > =>
        Effect.gen(function* () {
          const tasks = yield* storage.loadTasks()
          const task = tasks.find((t) => t.id === taskId)

          if (!task) {
            return yield* NotFoundError.make({
              resource: "Task",
              id: String(taskId),
            })
          }

          if (task.createdBy !== userId) {
            return yield* UnauthorizedError.make({
              action: "update task status - not the creator",
            })
          }

          const updatedTask = new Task({
            ...task,
            status,
            updatedAt: new Date(),
            completedAt: status === "completed" ? new Date() : task.completedAt,
          })

          const updatedTasks = tasks.map((t) =>
            t.id === taskId ? updatedTask : t
          )
          yield* storage.saveTasks(updatedTasks)

          return updatedTask
        })

      /**
       * Assign task to user
       * 
       * DEMONSTRATES:
       * - Multi-step validation (task exists, user exists, requester is creator)
       * - Composing multiple services (UserService + TaskService)
       * - Complex authorization logic
       * 
       * LEARNING POINT: Error handling composition
       * - Each yield* can fail with different errors
       * - Final Effect type is union of all possible errors
       * - Caller can handle each error type differently
       */
      const assignTask = (
        taskId: typeof TaskId.Type,
        assigneeId: typeof UserId.Type,
        requesterId: typeof UserId.Type
      ): Effect.Effect<
        Task,
        NotFoundError | UnauthorizedError | FileSystemError | ParseResult.ParseError
      > =>
        Effect.gen(function* () {
          const tasks = yield* storage.loadTasks()
          const task = tasks.find((t) => t.id === taskId)

          if (!task) {
            return yield* NotFoundError.make({
              resource: "Task",
              id: String(taskId),
            })
          }

          if (task.createdBy !== requesterId) {
            return yield* UnauthorizedError.make({
              action: "assign task - not the creator",
            })
          }

          yield* userService.findById(assigneeId).pipe(
            Effect.catchTag("NotFoundError", () =>
              Effect.fail(
                UnauthorizedError.make({
                  action: "assign task - assignee does not exist",
                })
              )
            )
          )

          const updatedTask = new Task({
            ...task,
            assignedTo: assigneeId,
            updatedAt: new Date(),
          })

          const updatedTasks = tasks.map((t) =>
            t.id === taskId ? updatedTask : t
          )
          yield* storage.saveTasks(updatedTasks)

          return updatedTask
        })

      return TaskService.of({
        create,
        findById,
        listAll,
        listByUser,
        updateStatus,
        assignTask,
      })
    })
  )
}

/**
 * LEARNING NOTES - Business Logic with Effect.gen:
 * 
 * 1. EFFECT.GEN BASICS:
 *    ```typescript
 *    Effect.gen(function*() {
 *      const x = yield* someEffect  // Unwrap Effect
 *      const y = yield* anotherEffect
 *      return x + y
 *    })
 *    ```
 *    - Like async/await but for Effects
 *    - yield* unwraps Effect values
 *    - Errors propagate automatically
 * 
 * 2. DEPENDENCY INJECTION:
 *    ```typescript
 *    Effect.gen(function*() {
 *      const storage = yield* Storage      // Request dependency
 *      const userService = yield* UserService
 *      // Use them...
 *    })
 *    ```
 *    - Declare what you need with yield*
 *    - Effect provides it from Layer
 *    - Type-safe, checked at compile time
 * 
 * 3. ERROR HANDLING PATTERNS:
 * 
 *    Early return with error:
 *    ```typescript
 *    if (!isValid) {
 *      return yield* ValidationError.make({ ... })
 *    }
 *    ```
 * 
 *    Transform errors:
 *    ```typescript
 *    yield* someEffect.pipe(
 *      Effect.catchTag("NotFoundError", (e) =>
 *        Effect.fail(UnauthorizedError.make({ ... }))
 *      )
 *    )
 *    ```
 * 
 * 4. IMMUTABLE UPDATES:
 *    ```typescript
 *    const updated = new Task({ ...task, status: "completed" })
 *    const updatedList = list.map(t => t.id === id ? updated : t)
 *    ```
 *    - Never mutate data
 *    - Create new instances
 *    - Map over collections
 * 
 * 5. SERVICE COMPOSITION:
 *    - TaskService uses UserService
 *    - UserService uses Storage
 *    - Layers handle wiring automatically
 *    - Each service focuses on its domain
 * 
 * 6. COMPARED TO TRADITIONAL CODE:
 * 
 *    Traditional async/await:
 *    ```typescript
 *    async function register(email: string) {
 *      const users = await loadUsers()  // What errors?
 *      if (users.find(u => u.email === email)) {
 *        throw new Error("duplicate")  // Stringly-typed
 *      }
 *      // ...
 *    }
 *    ```
 * 
 *    Effect:
 *    ```typescript
 *    const register = Effect.gen(function*() {
 *      const users = yield* storage.loadUsers()  // Error: FileSystemError
 *      if (users.find(...)) {
 *        return yield* DuplicateError.make({ ... })  // Type-safe
 *      }
 *      // ...
 *    })
 *    // Type: Effect<User, DuplicateError | FileSystemError, Storage>
 *    ```
 *    - Errors in type signature
 *    - Dependencies in type signature
 *    - Composable and testable
 */
