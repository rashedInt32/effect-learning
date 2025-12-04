import { Schema } from "effect"

/**
 * DOMAIN MODELS - Data Modeling with Effect Schema
 * 
 * WHY USE SCHEMA?
 * - Type-safe: Compile-time AND runtime validation
 * - Serializable: Can save to DB/files and send over network
 * - Transformable: Parse from JSON, encode to JSON automatically
 * - Composable: Build complex types from simple primitives
 * 
 * WHEN TO USE:
 * - Defining domain entities (User, Task, etc.)
 * - API request/response types
 * - Data that crosses boundaries (file I/O, network, etc.)
 * 
 * WHY NOT JUST TypeScript interfaces?
 * - Interfaces only exist at compile-time (erased after compilation)
 * - Schemas validate at runtime and can catch bad data
 * - Schemas can transform data (e.g., parse dates, sanitize strings)
 */

/**
 * Branded Types - Creating "unique" types from primitives
 * 
 * WHAT: A brand is like a stamp that says "this string has been validated"
 * WHY: Prevents mixing up different kinds of strings
 * WHEN: Use for IDs, emails, validated inputs
 * 
 * Example without brands:
 *   const userId: string = "user123"
 *   const taskId: string = "task456"
 *   deleteUser(taskId) // ❌ Compiles but logically wrong!
 * 
 * With brands:
 *   const userId: UserId = UserId.make("user123")
 *   const taskId: TaskId = TaskId.make("task456")
 *   deleteUser(taskId) // ✅ Type error - can't pass TaskId to function expecting UserId
 */

export class UserId extends Schema.String.pipe(Schema.brand("UserId")) {}

export class TaskId extends Schema.String.pipe(Schema.brand("TaskId")) {}

/**
 * Email validation with branded type
 * 
 * WHY: Ensures we never accidentally use an unvalidated string as email
 * HOW: Uses Schema.filter to add validation rules
 * WHEN: For any data that needs validation (emails, URLs, phone numbers)
 */
export class Email extends Schema.String.pipe(
  Schema.filter((email) => email.includes("@") && email.includes("."), {
    message: () => "Invalid email format - must contain @ and domain",
  }),
  Schema.brand("Email")
) {}

/**
 * User Schema - Using Schema.Struct for records
 * 
 * WHY Schema.Struct instead of interface?
 * - Runtime validation: Can parse untrusted data (from files, network)
 * - JSON encoding: Schema.encode/decode for serialization
 * - Defaults: Can specify default values
 * - Transformations: Can transform data during parse (trim strings, etc.)
 * 
 * PATTERN: Notice how we compose smaller schemas (UserId, Email)
 * into larger ones (User). This is composition!
 */
export class User extends Schema.Class<User>("User")({
  id: UserId,
  email: Email,
  name: Schema.String.pipe(
    Schema.minLength(1, { message: () => "Name cannot be empty" })
  ),
  createdAt: Schema.Date,
}) {}

/**
 * TaskStatus - Using Schema.Literal for enums
 * 
 * WHY Literal instead of TypeScript enum?
 * - Serializes to actual strings (not numbers like enums)
 * - Runtime validation ensures only valid values
 * - More functional style
 * 
 * WHEN: For fixed sets of values (status, roles, categories)
 */
export const TaskStatus = Schema.Literal("pending", "in-progress", "completed")
export type TaskStatus = typeof TaskStatus.Type

/**
 * TaskPriority - Another example of Literal
 * 
 * NOTE: These compose nicely with Schema.Union for variants (see below)
 */
export const TaskPriority = Schema.Literal("low", "medium", "high")
export type TaskPriority = typeof TaskPriority.Type

/**
 * Task Schema - Complex domain model
 * 
 * DEMONSTRATES:
 * - Using branded types (TaskId, UserId)
 * - Using literal types (TaskStatus, TaskPriority)
 * - Optional fields (Schema.optional for completedAt)
 * - Default values (defaults from Date.now())
 * - Date handling (Schema.Date encodes as ISO strings, decodes back to Date objects)
 * 
 * WHY SO DETAILED?
 * - Catches bugs at runtime (can't create invalid tasks)
 * - Self-documenting (schema IS the documentation)
 * - Easy to serialize/deserialize for file storage
 */
export class Task extends Schema.Class<Task>("Task")({
  id: TaskId,
  title: Schema.String.pipe(
    Schema.minLength(1, { message: () => "Title cannot be empty" })
  ),
  description: Schema.optional(Schema.String),
  status: TaskStatus,
  priority: TaskPriority,
  assignedTo: Schema.optional(UserId),
  createdBy: UserId,
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
  completedAt: Schema.optional(Schema.Date),
}) {}

/**
 * Helper function to create new tasks
 * 
 * WHY A HELPER?
 * - Provides sensible defaults (status, priority, timestamps)
 * - Generates unique IDs
 * - Ensures consistency (all tasks created the same way)
 * 
 * PATTERN: Notice we use crypto.randomUUID() for IDs
 * In a real app, you might use a different ID generation strategy
 */
export const createTask = (params: {
  title: string
  description?: string
  createdBy: typeof UserId.Type
  priority?: TaskPriority
}): Task =>
  new Task({
    id: TaskId.make(`task-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    title: params.title,
    description: params.description,
    status: "pending",
    priority: params.priority ?? "medium",
    createdBy: params.createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

/**
 * JSON Schema Encoding/Decoding
 * 
 * WHY NEEDED?
 * - Schemas use branded types and Date objects at runtime
 * - JSON only supports primitives (string, number, boolean, null)
 * - We need to transform between these representations
 * 
 * HOW IT WORKS:
 * - Schema.encodeSync: Runtime object → JSON-safe object
 * - Schema.decodeSync: JSON-safe object → Runtime object
 * 
 * WHEN TO USE:
 * - Saving to files (JSON.stringify after encode)
 * - Loading from files (decode after JSON.parse)
 * - Sending over network (API responses)
 * 
 * Example:
 *   const task = createTask({ ... })
 *   const json = JSON.stringify(Schema.encodeSync(Task)(task))
 *   // ... save to file ...
 *   const loaded = Schema.decodeSync(Task)(JSON.parse(json))
 */
export const UserJson = Schema.encodedSchema(User)
export const TaskJson = Schema.encodedSchema(Task)

/**
 * LEARNING NOTES:
 * 
 * 1. COMPOSITION: Small schemas (Email, UserId) → Large schemas (User, Task)
 * 2. TYPE SAFETY: Brands prevent mixing incompatible types
 * 3. RUNTIME VALIDATION: Schemas catch invalid data at runtime
 * 4. SERIALIZATION: Can save/load from files and send over network
 * 5. DEFAULTS: Helper functions provide sensible defaults
 * 
 * Compare this to plain TypeScript:
 * 
 * ```typescript
 * // Plain TypeScript (NO runtime validation)
 * interface User {
 *   id: string
 *   email: string
 *   name: string
 * }
 * 
 * // Can create invalid data
 * const user: User = {
 *   id: "",           // ❌ Empty ID
 *   email: "notanemail",  // ❌ Invalid email
 *   name: ""          // ❌ Empty name
 * } // No errors! TypeScript doesn't validate at runtime
 * ```
 * 
 * With Schema:
 * ```typescript
 * const user = new User({
 *   id: UserId.make(""),
 *   email: Email.make("notanemail"),
 *   name: ""
 * }) // ✅ Throws error at runtime - validation fails!
 * ```
 */
