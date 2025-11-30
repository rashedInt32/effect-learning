/**
 * ============================================================
 * OPTION: Safe Nullable/Optional Value Handling
 * ============================================================
 * 
 * WHAT IS OPTION?
 * Option is a type that represents a value that may or may not exist.
 * It's a type-safe alternative to null/undefined, preventing runtime errors.
 * 
 * TWO VARIANTS:
 * - Some(value): Contains a value
 * - None: Represents absence of value
 * 
 * WHY USE OPTION?
 * ❌ Traditional approach:
 *    - null/undefined checks scattered everywhere
 *    - Easy to forget null checks → runtime errors
 *    - TypeScript can't always catch these bugs
 * 
 * ✅ Option approach:
 *    - Forces you to handle both cases (Some/None)
 *    - Type-safe: compiler ensures you handle missing values
 *    - Composable: chain operations safely
 *    - No more "Cannot read property 'x' of undefined"
 * 
 * WHEN TO USE:
 * - Database queries that might not find a result
 * - Array.find() operations
 * - Configuration values that might be missing
 * - User input that's optional
 * - Parsing operations that can fail
 * - Reading from caches (might have expired)
 * 
 * REAL-WORLD SCENARIOS:
 * 1. User lookup in database (may not exist)
 * 2. Finding item in shopping cart
 * 3. Getting cached values (might be expired)
 * 4. Parsing environment variables (might be missing)
 * 5. Accessing nested object properties safely
 * 6. First/last element of array (might be empty)
 */

import { Option, pipe } from "effect"

console.log("=== OPTION: Safe Nullable Handling ===\n")

/**
 * OPTION.fromNullable: Convert nullable values to Option
 * 
 * WHEN TO USE:
 * - Working with APIs that return null/undefined
 * - Converting legacy code to Option-based approach
 * - Wrapping array.find(), Map.get(), etc.
 * 
 * HOW IT WORKS:
 * - If value is null/undefined → None
 * - Otherwise → Some(value)
 * 
 * REAL-WORLD USE CASE:
 * Finding a user in database - user may not exist
 */
const findUserById = (id: number): Option.Option<{ name: string; age: number }> => {
  const users = [
    { id: 1, name: "Alice", age: 30 },
    { id: 2, name: "Bob", age: 25 },
  ]
  const user = users.find(u => u.id === id)
  return Option.fromNullable(user)
}

/**
 * OPTION.match: Pattern match to handle both Some and None
 * 
 * WHEN TO USE:
 * - Need to convert Option to a concrete value
 * - Want different behavior for Some vs None
 * - Final step in your Option chain
 * 
 * WHY USE IT:
 * Forces you to handle both cases explicitly
 * No risk of forgetting to check for None
 * 
 * REAL-WORLD USE CASE:
 * Displaying user profile or "User not found" message
 */
const userId1 = 1
const result1 = pipe(
  findUserById(userId1),
  Option.match({
    onNone: () => "User not found",
    onSome: (user) => `Found: ${user.name}, age ${user.age}`
  })
)
console.log(`User ${userId1}:`, result1)

const userId3 = 3
const result2 = pipe(
  findUserById(userId3),
  Option.match({
    onNone: () => "User not found",
    onSome: (user) => `Found: ${user.name}, age ${user.age}`
  })
)
console.log(`User ${userId3}:`, result2)

/**
 * OPTION.map: Transform the value inside Some (if it exists)
 * 
 * WHEN TO USE:
 * - Need to transform the wrapped value
 * - Want to apply a function only if value exists
 * - Don't want to unwrap the Option yet
 * 
 * HOW IT WORKS:
 * - Some(value) → Some(fn(value))
 * - None → None (skips the transformation)
 * 
 * OPTION.getOrElse: Provide default value for None
 * 
 * WHEN TO USE:
 * - Want to unwrap Option with a fallback
 * - Need a concrete value, not an Option
 * - Simpler than match when you just need a default
 * 
 * REAL-WORLD USE CASE:
 * Display username in uppercase, or "UNKNOWN" if user not found
 */
const upperName = pipe(
  findUserById(1),
  Option.map(user => user.name.toUpperCase()),
  Option.getOrElse(() => "UNKNOWN")
)
console.log("\nUppercase name:", upperName)

/**
 * OPTION.flatMap: Chain operations that return Option
 * 
 * WHEN TO USE:
 * - Next operation also returns Option
 * - Avoid nested Options (Option<Option<T>>)
 * - Chain multiple optional operations
 * 
 * DIFFERENCE FROM MAP:
 * - map: fn returns T → Option<T>
 * - flatMap: fn returns Option<T> → Option<T> (flattened)
 * 
 * REAL-WORLD USE CASE:
 * User exists → get their email (which might not exist)
 * 
 * SCENARIO:
 * 1. Find user by ID (may not exist)
 * 2. Get user's email (may not have email)
 * Without flatMap: Option<Option<string>>
 * With flatMap: Option<string>
 */
const getEmail = (name: string): Option.Option<string> =>
  name === "Alice" ? Option.some("alice@example.com") : Option.none()

const userEmail = pipe(
  findUserById(1),
  Option.map(user => user.name),
  Option.flatMap(getEmail),
  Option.getOrElse(() => "no-email@example.com")
)
console.log("Email:", userEmail)
