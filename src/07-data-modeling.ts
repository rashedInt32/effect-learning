/**
 * ============================================================
 * DATA MODELING: Schema, Branded Types, Encoding/Decoding
 * ============================================================
 * 
 * WHAT IS SCHEMA?
 * Schema is Effect's way to define and validate data structures.
 * It provides type-safe parsing, validation, and serialization.
 * 
 * KEY FEATURES:
 * 1. Runtime validation (ensure data matches expected shape)
 * 2. Type inference (TypeScript types from schema)
 * 3. JSON encoding/decoding
 * 4. Branded types (prevent mixing similar primitives)
 * 5. Transformations (parse dates, normalize data)
 * 
 * WHY USE SCHEMA?
 * ❌ Traditional approach:
 *    - Manual validation everywhere
 *    - Type casts (as Type) bypass safety
 *    - No guarantee runtime data matches types
 *    - Mixing user IDs with post IDs (both strings)
 * 
 * ✅ Schema approach:
 *    - Single source of truth for types + validation
 *    - Automatic runtime checks
 *    - Type-safe encoding/decoding
 *    - Branded types prevent mixing similar values
 * 
 * WHEN TO USE:
 * - API request/response validation
 * - Database records
 * - File parsing (JSON, CSV)
 * - Configuration files
 * - User input validation
 * - Type-safe IDs
 * 
 * REAL-WORLD SCENARIOS:
 * 1. API responses (validate before using)
 * 2. Form data (ensure valid before saving)
 * 3. Config files (catch errors early)
 * 4. Database models (type-safe ORM)
 * 5. Message queues (validate payloads)
 * 6. Preventing ID mixups (userId vs postId)
 */

import { Effect, Match, Schema } from "effect"

console.log("=== DATA MODELING ===\n")

/**
 * BRANDED TYPES: Add semantic meaning to primitives
 * 
 * WHAT ARE BRANDED TYPES?
 * Normal strings/numbers with a "brand" attached.
 * Makes TypeScript treat them as distinct types.
 * 
 * THE PROBLEM:
 * type UserId = string
 * type PostId = string
 * 
 * function getUser(id: UserId) { ... }
 * const postId: PostId = "post-123"
 * getUser(postId) // ❌ Compiles! But wrong!
 * 
 * WITH BRANDING:
 * const UserId = Schema.String.pipe(Schema.brand("UserId"))
 * const PostId = Schema.String.pipe(Schema.brand("PostId"))
 * 
 * getUser(postId) // ✅ Type error! Can't mix them
 * 
 * WHEN TO USE:
 * - IDs (user, post, order, etc.)
 * - Email addresses
 * - URLs
 * - Money amounts
 * - Any primitive that needs semantic meaning
 * 
 * REAL-WORLD USE CASES:
 * - Prevent passing wrong ID to database queries
 * - Can't add price + quantity (both numbers)
 * - Can't use unvalidated email as Email type
 * - Type-safe domain modeling
 */
const UserId = Schema.String.pipe(Schema.brand("UserId"))
type UserId = typeof UserId.Type

const Email = Schema.String.pipe(Schema.brand("Email"))
type Email = typeof Email.Type

/**
 * SCHEMA.CLASS: Define data classes with methods
 * 
 * WHAT IS IT?
 * Combines data structure with behavior.
 * Like TypeScript classes but with validation.
 * 
 * BENEFITS:
 * - Auto validation on construction
 * - Can add getter methods
 * - JSON encoding/decoding built-in
 * - Type inference
 * 
 * WHEN TO USE:
 * - Domain models (User, Product, Order)
 * - Database entities
 * - API models
 * - Value objects
 * 
 * REAL-WORLD USE CASE:
 * User model with computed displayName property
 * Used in: database, API responses, UI rendering
 */
class User extends Schema.Class<User>("User")({
  id: UserId,
  name: Schema.String,
  email: Email,
  createdAt: Schema.Date,
}) {
  get displayName() {
    return `${this.name} <${this.email}>`
  }
}

/**
 * CREATING INSTANCES
 * 
 * USER.make(): Factory method
 * 
 * NOTE: For branded types, use TypeName.make()
 * Schema.Date: Handles Date <-> ISO string conversion
 * 
 * REAL-WORLD:
 * Creating user after registration
 */
const user = User.make({
  id: UserId.make("user-123"),
  name: "Alice",
  email: Email.make("alice@example.com"),
  createdAt: new Date(),
})

console.log("1. Records (Schema.Class):")
console.log(`  ${user.displayName}`)
console.log(`  Created: ${user.createdAt.toISOString()}\n`)

/**
 * LITERAL TYPES: Enum-like values
 * 
 * WHAT IS SCHEMA.LITERAL?
 * Creates a type that can only be specific values.
 * Like TypeScript's literal types but runtime-checked.
 * 
 * WHEN TO USE:
 * - Status fields (pending, active, completed)
 * - Roles (admin, user, guest)
 * - Environments (dev, staging, prod)
 * - Any fixed set of string/number values
 * 
 * DIFFERENCE FROM ENUM:
 * - Literals: Just the values
 * - Enums: Named constants
 * 
 * REAL-WORLD USE CASES:
 * - Order status (pending, shipped, delivered)
 * - Payment status (pending, succeeded, failed)
 * - User roles in RBAC
 * - Task priorities
 */
const Status = Schema.Literal("pending", "active", "completed")
type Status = typeof Status.Type

console.log("2. Simple Variants (Literal):")
const status: Status = "active"
console.log(`  Status: ${status}\n`)

/**
 * TAGGED CLASSES: Discriminated Unions
 * 
 * WHAT ARE TAGGED CLASSES?
 * Classes with a _tag field for discrimination.
 * Perfect for representing different cases (like Result type).
 * 
 * WHY USE THEM?
 * - Type-safe pattern matching
 * - Represent either/or scenarios
 * - Error handling (Success | Failure)
 * - State machines
 * 
 * WHEN TO USE:
 * - Result types (Success | Failure)
 * - API responses with different shapes
 * - Event types in event sourcing
 * - State machines (Idle | Loading | Success | Error)
 * - Payment methods (Card | PayPal | BankTransfer)
 * 
 * REAL-WORLD USE CASES:
 * - API call result (data or error)
 * - Form validation result
 * - Authentication result
 * - File upload result
 */
class Success extends Schema.TaggedClass<Success>()("Success", {
  value: Schema.Number,
}) {}

class Failure extends Schema.TaggedClass<Failure>()("Failure", {
  error: Schema.String,
}) {}

const Result = Schema.Union(Success, Failure);

const success = Success.make({ value: 42 })
const failure = Failure.make({ error: "oops" })

/**
 * MATCH.valueTags: Pattern matching on tagged unions
 * 
 * WHEN TO USE:
 * - Handle all cases of a union
 * - Transform tagged unions
 * - Exhaustive checking (compiler ensures all cases)
 * 
 * REAL-WORLD:
 * API response handling:
 * - Success → show data
 * - Failure → show error message
 */
console.log("3. Tagged Variants (Union):")

// Helper function to handle Result type
const handleResult = (result: Success | Failure): string => {
  switch (result._tag) {
    case "Success":
      return `Got: ${result.value}`;
    case "Failure":
      return `Error: ${result.error}`;
  }
};

console.log("  Success:", handleResult(success));
console.log("  Failure:", handleResult(failure));
console.log()

/**
 * COMPOSING SCHEMAS: Building complex types
 * 
 * DEMONSTRATES:
 * - Nested classes (Position inside Move)
 * - Reusing schema definitions
 * - Building domain-specific types
 * 
 * REAL-WORLD USE CASE:
 * Chess move: from position A1 to B2
 * Board positions must be valid (A-H, 1-8)
 * Schema ensures invalid moves can't be created
 * 
 * OTHER EXAMPLES:
 * - Address (Street, City, PostalCode)
 * - ShoppingCart (items: Product[])
 * - Invoice (customer: Customer, items: LineItem[])
 */
const Row = Schema.Literal("A", "B", "C", "D", "E", "F", "G", "H")
const Column = Schema.Literal("1", "2", "3", "4", "5", "6", "7", "8")

class Position extends Schema.Class<Position>("Position")({
  row: Row,
  column: Column,
}) {}

class Move extends Schema.Class<Move>("Move")({
  from: Position,
  to: Position,
}) {}

/**
 * JSON ENCODING/DECODING
 * 
 * SCHEMA.parseJson: Parse JSON string to typed object
 * SCHEMA.decodeUnknown: Validate and decode unknown data
 * SCHEMA.encode: Convert typed object back to JSON-safe format
 * 
 * HOW IT WORKS:
 * 1. JSON string → parse → unknown object
 * 2. Validate against schema → typed object (Move)
 * 3. Use in your code (type-safe)
 * 4. Encode back → JSON string (for API/DB)
 * 
 * WHEN TO USE:
 * - API requests/responses
 * - localStorage (JSON strings)
 * - File reading (config files)
 * - Message queues
 * - Database JSON columns
 * 
 * REAL-WORLD FLOW:
 * 1. Receive JSON from API
 * 2. Decode with Schema (validates + types)
 * 3. Work with typed data safely
 * 4. Encode back for sending to API
 * 
 * BENEFITS:
 * - Runtime validation (catch bad data)
 * - Type safety (TypeScript knows structure)
 * - Automatic transformations (Date strings → Date objects)
 * - Single schema for encode/decode
 */
const MoveFromJson = Schema.parseJson(Move)

const jsonString = '{"from":{"row":"A","column":"1"},"to":{"row":"B","column":"2"}}'

console.log("4. JSON Encoding/Decoding:")
console.log(`  Input JSON: ${jsonString}`)

const decodeAndEncode = Effect.gen(function* () {
  const move = yield* Schema.decodeUnknown(MoveFromJson)(jsonString)
  const encoded = yield* Schema.encode(MoveFromJson)(move)
  console.log(`  Decoded & Re-encoded: ${encoded}`)
  console.log("\n✓ Data Modeling complete\n")
})

Effect.runPromise(decodeAndEncode)
