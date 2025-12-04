/**
 * ============================================================
 * PIPE: Functional Composition & Data Transformation
 * ============================================================
 * 
 * WHAT IS PIPE?
 * pipe() is a utility for composing functions in a readable, left-to-right flow.
 * Takes a value and passes it through a series of transformations.
 * 
 * SYNTAX:
 * pipe(
 *   initialValue,
 *   transform1,
 *   transform2,
 *   transform3
 * )
 * 
 * WHY USE PIPE?
 * ❌ Without pipe (nested/imperative):
 *    const result = transform3(transform2(transform1(value)))
 *    OR
 *    const temp1 = transform1(value)
 *    const temp2 = transform2(temp1)
 *    const result = transform3(temp2)
 * 
 * ✅ With pipe:
 *    const result = pipe(value, transform1, transform2, transform3)
 * 
 * BENEFITS:
 * - Readable: Top-to-bottom data flow
 * - Composable: Easy to add/remove steps
 * - Functional: No intermediate variables
 * - Type-safe: TypeScript infers types through chain
 * - Debuggable: Easy to comment out steps
 * 
 * WHEN TO USE:
 * - Multiple transformations in sequence
 * - Working with Option, Effect, Array
 * - Building data processing pipelines
 * - Any time you'd nest function calls
 * 
 * REAL-WORLD SCENARIOS:
 * 1. Data processing pipelines (ETL)
 * 2. API response transformations
 * 3. Form validation chains
 * 4. Database query results processing
 * 5. Business logic composition
 * 6. React/Vue state transformations
 */

import { Effect, Option, pipe } from "effect"

console.log("=== PIPE: Functional Composition ===\n")

/**
 * EXAMPLE 1: Simple Value Transformations
 * 
 * DEMONSTRATES:
 * - Curried functions (returns function)
 * - Chaining numeric operations
 * - Type inference through pipe
 * 
 * WHEN TO USE:
 * - Building math/calculation pipelines
 * - Applying multiple transformations
 * - Creating reusable computation chains
 * 
 * REAL-WORLD USE CASE:
 * Calculating prices: base price → add tax → apply discount → format
 */
const add = (x: number) => (y: number) => x + y
const multiply = (x: number) => (y: number) => x * y
const toString = (x: number) => `Result: ${x}`

const calculation = pipe(
  10,
  add(5),
  multiply(2),
  toString
)
console.log("Calculation:", calculation)

/**
 * EXAMPLE 2: Array Processing Pipeline
 * 
 * DEMONSTRATES:
 * - Filtering data
 * - Mapping transformations
 * - Aggregating results
 * 
 * WHEN TO USE:
 * - Processing lists of data
 * - Applying business rules in sequence
 * - Building reports from raw data
 * 
 * REAL-WORLD USE CASES:
 * - Get active users → extract names → join with comma
 * - Filter products → calculate total → apply discount
 * - Process order items → sum prices → add shipping
 * 
 * TRADITIONAL APPROACH:
 * const activeUsers = users.filter(u => u.active)
 * const names = activeUsers.map(u => u.name)
 * const result = names.join(", ")
 * 
 * PIPE APPROACH: Single expression, clear flow
 */
type User = { name: string; age: number; active: boolean }

const users: User[] = [
  { name: "Alice", age: 30, active: true },
  { name: "Bob", age: 25, active: false },
  { name: "Charlie", age: 35, active: true },
]

const result = pipe(
  users,
  (users) => users.filter(u => u.active),
  (users) => users.map(u => u.name),
  (names) => names.join(", ")
)
console.log("\nActive users:", result)

/**
 * EXAMPLE 3: Pipe with Option
 * 
 * DEMONSTRATES:
 * - Combining pipe with Option
 * - Handling potentially missing values
 * - Transforming optional data
 * 
 * WHEN TO USE:
 * - Multi-step transformations that can fail
 * - Processing data that might not exist
 * - Safe navigation through transformations
 * 
 * REAL-WORLD USE CASE:
 * Find oldest active user and get their name
 * Each step could fail: no users, no active users
 * 
 * WITHOUT PIPE:
 * const active = users.filter(u => u.active)
 * const oldest = findOldest(active)
 * if (oldest.isSome()) {
 *   return oldest.value.name
 * } else {
 *   return "No active users"
 * }
 */
const findOldest = (users: User[]): Option.Option<User> => 
  users.length === 0 
    ? Option.none()
    : Option.some(users.reduce((a, b) => a.age > b.age ? a : b))

const oldestActiveName = pipe(
  users,
  (users) => users.filter(u => u.active),
  findOldest,
  Option.map(u => u.name),
  Option.getOrElse(() => "No active users")
)
console.log("Oldest active user:", oldestActiveName)

/**
 * EXAMPLE 4: Pipe with Effect (Error Handling)
 * 
 * DEMONSTRATES:
 * - Composing Effects with pipe
 * - Error propagation through pipeline
 * - Type-safe error handling
 * 
 * WHEN TO USE:
 * - Multi-step operations that can fail
 * - API calls → validation → processing
 * - File read → parse → transform → save
 * 
 * REAL-WORLD USE CASES:
 * - Parse JSON → validate schema → save to database
 * - Fetch user → check permissions → perform action
 * - Read file → decrypt → parse → process
 * - Upload file → virus scan → process → store
 * 
 * PIPELINE FLOW:
 * 1. Parse JSON (can fail with ParseError)
 * 2. Validate structure (can fail with ParseError)
 * 3. Transform data (always succeeds)
 * 4. Handle any errors gracefully
 * 
 * WHY USE PIPE HERE?
 * - Each step depends on previous
 * - Clear progression of data
 * - Easy to add validation steps
 * - Error handling at the end
 */
class ParseError {
  readonly _tag = "ParseError"
  constructor(readonly message: string) {}
}

const parseJSON = (json: string): Effect.Effect<unknown, ParseError> =>
  Effect.try({
    try: () => JSON.parse(json),
    catch: (error) => new ParseError(`Invalid JSON: ${error}`)
  })

const validateUser = (data: unknown): Effect.Effect<User, ParseError> => {
  if (
    typeof data === "object" &&
    data !== null &&
    "name" in data &&
    "age" in data &&
    "active" in data
  ) {
    return Effect.succeed(data as User)
  }
  return Effect.fail(new ParseError("Invalid user data"))
}

const processUserJSON = (json: string) =>
  pipe(
    parseJSON(json),
    Effect.flatMap(validateUser),
    Effect.map(user => `Processed: ${user.name}, age ${user.age}`),
    Effect.catchAll(error => Effect.succeed(`Error: ${error.message}`))
  )

Effect.runPromise(
  processUserJSON('{"name":"Dave","age":40,"active":true}')
).then(result => console.log("\n" + result))

Effect.runPromise(
  processUserJSON('invalid json')
).then(result => console.log(result))
