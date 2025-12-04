# Task Management System - Effect Learning Project

A practical application demonstrating all core Effect concepts through a complete task management system.

## 🎯 Learning Objectives

This app combines all the concepts from the tutorials into a real-world example:

1. **Data Modeling** (domain/models.ts)
   - Schema definitions with branded types
   - Runtime validation
   - JSON serialization/deserialization
   - Date handling

2. **Error Handling** (errors/index.ts)
   - Tagged errors for different failure modes
   - Type-safe error handling
   - Descriptive error messages

3. **Services & Dependency Injection** (infrastructure/storage.ts, services/index.ts)
   - Service definitions with Context.Tag
   - Layer composition
   - Automatic dependency injection
   - Clean separation of concerns

4. **Effects** (throughout)
   - Sequential operations with Effect.gen
   - Error propagation
   - Effect composition

## 📁 Project Structure

```
src/practical-app/
├── domain/
│   └── models.ts          # Domain models: User, Task with Schema
├── errors/
│   └── index.ts           # All error types (TaggedErrors)
├── infrastructure/
│   └── storage.ts         # File-based storage implementation
├── services/
│   └── index.ts           # Business logic (UserService, TaskService)
├── main.ts                # Application entry point & demo
└── README.md              # This file
```

## 🚀 Running the Application

**First time setup:**

```bash
# From the project root
pnpm install  # or npm install

# Run the demo
pnpm exec tsx src/practical-app/main.ts
```

**What happens:**
1. Creates two users (Alice and Bob)
2. Creates three tasks with different priorities
3. Assigns a task to Bob
4. Updates task status
5. Lists all tasks and user-specific tasks
6. Demonstrates error handling (duplicate users, authorization, etc.)

**Data persistence:**
- Data is saved to `./data/users.json` and `./data/tasks.json`
- On subsequent runs, you'll see a "duplicate email" error (expected!)
- To run a fresh demo: `rm -rf ./data && pnpm exec tsx src/practical-app/main.ts`

## 📚 How to Study This Code

### Step 1: Read the Files in Order

1. **domain/models.ts** - Start here to understand the data structures
   - See how Schema defines both types and validation
   - Learn about branded types (UserId, TaskId, Email)
   - Understand the difference between runtime and encoded types

2. **errors/index.ts** - See how errors are modeled
   - Tagged errors for pattern matching
   - Each error type has specific fields
   - Compare to traditional Error classes

3. **infrastructure/storage.ts** - Understand the persistence layer
   - Service definition (the "contract")
   - Implementation (how it actually works)
   - Layer creation (dependency injection setup)
   - Schema encoding/decoding for JSON

4. **services/index.ts** - Study the business logic
   - UserService: Registration and lookup
   - TaskService: CRUD operations with validation
   - Service dependencies (TaskService needs UserService)
   - Error handling patterns

5. **main.ts** - See it all come together
   - Layer composition
   - Running Effects
   - Error handling at the application boundary

### Step 2: Trace a Complete Operation

Pick an operation and trace it through all layers. For example, **creating a task**:

1. **main.ts:81** - Call `taskService.create(...)`
2. **services/index.ts:192** - Validate creator exists (uses UserService)
3. **domain/models.ts:142** - Create Task with helper function
4. **services/index.ts:200** - Save to storage
5. **infrastructure/storage.ts:180** - Encode and write to file
6. **domain/models.ts:116** - Task schema validates and encodes

### Step 3: Experiment

Try these modifications to deepen your understanding:

**Easy:**
- [ ] Add a new field to Task (e.g., `dueDate`)
- [ ] Create a new error type (e.g., `TaskNotFoundError`)
- [ ] Add a `deleteTask` function

**Medium:**
- [ ] Create an in-memory storage implementation for testing
- [ ] Add a `completeTask` function that sets status and completedAt
- [ ] Implement task filtering (by status, priority, assignee)

**Advanced:**
- [ ] Add a new service (e.g., `ProjectService` that groups tasks)
- [ ] Implement task dependencies (task A must complete before task B)
- [ ] Add user roles and permissions (admin vs regular user)

## 🔑 Key Patterns & Concepts

### Pattern 1: Schema for Type Safety + Runtime Validation

```typescript
// TypeScript interface (compile-time only)
interface User {
  id: string
  email: string
}

// Effect Schema (compile-time + runtime)
class User extends Schema.Class<User>("User")({
  id: UserId,          // Branded type - can't mix with other strings
  email: Email,        // Validated format
  createdAt: Schema.Date  // Handles serialization
}) {}
```

### Pattern 2: Tagged Errors for Precise Error Handling

```typescript
// Can catch specific errors
yield* taskService.create(...).pipe(
  Effect.catchTag("NotFoundError", (e) => {
    // Only handles user not found
  }),
  Effect.catchTag("DuplicateError", (e) => {
    // Only handles duplicates
  })
)
```

### Pattern 3: Dependency Injection with Layers

```typescript
// Define what you need
const program = Effect.gen(function*() {
  const storage = yield* Storage
  const userService = yield* UserService
  // ...
})

// Provide implementations
const runnable = program.pipe(
  Effect.provide(appLayer)  // All dependencies wired automatically
)
```

### Pattern 4: Effect Composition

```typescript
// Sequential operations
const program = Effect.gen(function*() {
  const user = yield* userService.register(...)
  const task = yield* taskService.create(...)  // Uses user.id
  return task
})

// Parallel operations
const programs = Effect.all([
  operation1,
  operation2,
  operation3
])
```

## 💡 Why Effect vs Traditional Approaches?

### Traditional Approach Problems:

```typescript
async function createTask(title: string, userId: string) {
  // 1. No type safety for errors
  const user = await userService.findById(userId)
  if (!user) throw new Error("User not found")  // Could be any error
  
  // 2. No dependency tracking
  const storage = getStorage()  // Global state or manual injection
  
  // 3. Validation happens late
  const task = { title, userId }  // Invalid data can slip through
  await storage.save(task)
  
  return task
}

// Caller has no idea what errors can happen
const task = await createTask("foo", "123")  // 🤷 What could go wrong?
```

### Effect Approach Benefits:

```typescript
const createTask = (title: string, userId: UserId) =>
  Effect.gen(function*() {
    // 1. Type-safe errors in return type
    const userService = yield* UserService
    const user = yield* userService.findById(userId)  
    // Effect<User, NotFoundError, never>
    
    // 2. Dependencies tracked in type
    const storage = yield* Storage
    
    // 3. Validation happens at construction
    const task = createTask({ title, createdBy: userId })  
    // Throws if invalid
    
    yield* storage.saveTasks([task])
    return task
  })

// Caller sees exact errors and dependencies
const program = createTask("foo", userId)
// Effect<Task, NotFoundError | FileSystemError, Storage | UserService>
//              ^^^^^^^^^^^^^^^^^^^^^^^^^^^ All possible errors
//                                          ^^^^^^^^^^^^^^^^^^^^^^^ All dependencies
```

## 🎓 Next Steps

After understanding this code:

1. **Build your own app** - Try a different domain (blog, e-commerce, etc.)
2. **Read Effect docs** - Dive deeper into specific topics
3. **Join the community** - Effect Discord for questions and discussions
4. **Explore advanced topics** - Streams, resource management, testing

## 📖 Related Tutorials

This app combines concepts from these tutorial files:

- `01-effect-basics.ts` - Effect creation and execution
- `02-effect-combinators.ts` - Chaining and composition
- `03-effect-errors.ts` - Error handling patterns
- `04-services-basics.ts` - Service definitions
- `05-services-layers.ts` - Layer composition
- `06-error-handling.ts` - Advanced error patterns
- `07-data-modeling.ts` - Schema and data types
- `08-tagged-errors.ts` - Tagged error types

---

**Happy Learning! 🚀**

Questions? Issues? Check the Effect documentation at https://effect.website
