import { Schema } from "effect";

/**
 * DOMAIN ERRORS - Tagged Errors for Type-Safe Error Handling
 *
 * WHY Schema.TaggedError instead of Error or string?
 * - TYPE-SAFE: Errors tracked in Effect type (Effect<A, E, R>)
 * - SERIALIZABLE: Can save to logs, send over network
 * - PATTERN MATCHING: Use catchTag/catchTags to handle specific errors
 * - STRUCTURED: Include context (which user, which task, etc.)
 *
 * WHEN TO USE:
 * - Domain errors that callers should handle (validation, not found, unauthorized)
 * - Errors that need context (IDs, field names, etc.)
 * - Errors that cross boundaries (API, file I/O)
 *
 * WHEN NOT TO USE:
 * - Programming bugs (use Effect.die or assert instead)
 * - Unrecoverable errors (use defects)
 */

/**
 * Validation Errors
 *
 * WHY: Represents data that failed validation rules
 *
 *
 * WHEN: User input is invalid (empty fields, wrong format, etc.)
 * CONTEXT: Which field failed and why
 *
 * Example usage:
 *   const email = "notanemail"
 *   if (!email.includes("@")) {
 *     return ValidationError.make({
 *       field: "email",
 *       message: "Email must contain @"
 *     })
 *   }
 */
export class ValidationError extends Schema.TaggedError<ValidationError>()(
  "ValidationError",
  {
    field: Schema.String,
    message: Schema.String,
  },
) {}

/**
 * Not Found Errors
 *
 * WHY: Represents resources that don't exist
 * WHEN: Looking up user/task by ID that doesn't exist
 * CONTEXT: What resource type and which ID
 *
 * Example usage:
 *   const user = users.find(u => u.id === id)
 *   if (!user) {
 *     return NotFoundError.make({
 *       resource: "User",
 *       id: id
 *     })
 *   }
 */
export class NotFoundError extends Schema.TaggedError<NotFoundError>()(
  "NotFoundError",
  {
    resource: Schema.String,
    id: Schema.String,
  },
) {}

/**
 * Unauthorized Errors
 *
 * WHY: Represents permission/authentication failures
 * WHEN: User not logged in or lacks permission for action
 * CONTEXT: What action was attempted
 *
 * Example usage:
 *   if (!currentUser) {
 *     return UnauthorizedError.make({
 *       action: "create task"
 *     })
 *   }
 */
export class UnauthorizedError extends Schema.TaggedError<UnauthorizedError>()(
  "UnauthorizedError",
  {
    action: Schema.String,
  },
) {}

/**
 * Duplicate Errors
 *
 * WHY: Represents constraint violations (unique email, etc.)
 * WHEN: Trying to create resource that already exists
 * CONTEXT: What resource and which field is duplicate
 *
 * Example usage:
 *   const existing = users.find(u => u.email === email)
 *   if (existing) {
 *     return DuplicateError.make({
 *       resource: "User",
 *       field: "email",
 *       value: email
 *     })
 *   }
 */
export class DuplicateError extends Schema.TaggedError<DuplicateError>()(
  "DuplicateError",
  {
    resource: Schema.String,
    field: Schema.String,
    value: Schema.String,
  },
) {}

/**
 * File System Errors (with Schema.Defect)
 *
 * WHY Schema.Defect?
 * - Wraps unknown errors from external libraries (Node fs module)
 * - Makes external errors serializable
 * - Preserves original error info for debugging
 *
 * WHEN:
 * - Working with file system, network, databases
 * - Calling external libraries that throw
 * - Need to preserve stack traces
 *
 * HOW IT WORKS:
 * - Schema.Defect converts Error → { name, message }
 * - Converts unknown values → string representation
 * - Always serializable for logging/storage
 *
 * Example usage:
 *   try {
 *     await fs.readFile(path)
 *   } catch (error) {
 *     return FileSystemError.make({
 *       operation: "read",
 *       path: path,
 *       error: error  // Schema.Defect handles any error type
 *     })
 *   }
 */
export class FileSystemError extends Schema.TaggedError<FileSystemError>()(
  "FileSystemError",
  {
    operation: Schema.String,
    path: Schema.String,
    error: Schema.Defect,
  },
) {}

/**
 * Union of all errors
 *
 * WHY: Provides a single type for "any app error"
 * WHEN: Want to handle all domain errors at once
 * HOW: Use catchAll or catchTags to handle multiple errors
 *
 * Example usage:
 *   declare const program: Effect.Effect<User, AppError>
 *
 *   program.pipe(
 *     Effect.catchTags({
 *       ValidationError: (e) => ...,
 *       NotFoundError: (e) => ...,
 *       UnauthorizedError: (e) => ...,
 *     })
 *   )
 */
export type AppError =
  | ValidationError
  | NotFoundError
  | UnauthorizedError
  | DuplicateError
  | FileSystemError;

/**
 * LEARNING NOTES - Error Handling Strategy:
 *
 * 1. EXPECTED ERRORS (use TaggedError):
 *    - User provides invalid input → ValidationError
 *    - Resource doesn't exist → NotFoundError
 *    - User lacks permission → UnauthorizedError
 *    - Constraint violation → DuplicateError
 *    - External failure → FileSystemError with Schema.Defect
 *
 * 2. UNEXPECTED ERRORS (use Effect.die):
 *    - Programming bugs (null pointer, type errors)
 *    - Invariant violations (should never happen)
 *    - Unrecoverable system failures
 *
 * 3. RECOVERY PATTERNS:
 *    - catchTag: Handle specific error type
 *    - catchTags: Handle multiple error types
 *    - catchAll: Handle any error
 *    - orElse: Try alternative on failure
 *
 * 4. COMPARED TO EXCEPTIONS:
 *
 *    Traditional try/catch:
 *    ```typescript
 *    try {
 *      const user = await getUser(id)
 *      // What errors can this throw? Unknown!
 *    } catch (error) {
 *      // What type is error? unknown!
 *      // Have to check error.message or error.code
 *    }
 *    ```
 *
 *    With Effect:
 *    ```typescript
 *    const getUser: Effect.Effect<User, NotFoundError | UnauthorizedError>
 *    // Errors are in the type signature!
 *
 *    getUser.pipe(
 *      Effect.catchTags({
 *        NotFoundError: (e) => // type-safe access to e.resource, e.id
 *        UnauthorizedError: (e) => // type-safe access to e.action
 *      })
 *    )
 *    ```
 *
 * 5. YIELDABLE ERRORS:
 *    TaggedErrors are yieldable, so you can use them directly:
 *
 *    ✅ Good:
 *    return NotFoundError.make({ resource: "User", id })
 *
 *    ❌ Redundant:
 *    return Effect.fail(NotFoundError.make({ resource: "User", id }))
 */
