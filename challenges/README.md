# Effect Challenges & Advanced Examples

A comprehensive collection of hands-on challenges and advanced examples to master Effect-TS.

## 📚 Structure

```
challenges/
├── 01-option-challenges.ts           # Option type exercises
├── 02-effect-challenges.ts           # Effect basics exercises
├── 03-pipe-challenges.ts             # Pipe composition exercises
├── 04-effect-gen-challenges.ts       # Effect.gen exercises
├── 05-services-challenges.ts         # Services & DI exercises
├── 06-data-modeling-challenges.ts    # Schema & branded types exercises
├── 07-error-handling-challenges.ts   # Error handling strategies exercises
├── solutions/                        # Solutions for all challenges
│   ├── 01-option-solutions.ts
│   ├── 02-effect-solutions.ts
│   ├── 03-pipe-solutions.ts
│   ├── 04-effect-gen-solutions.ts
│   ├── 05-services-solutions.ts
│   ├── 06-data-modeling-solutions.ts
│   └── 07-error-handling-solutions.ts
└── advanced-examples/               # Advanced topics
    ├── 01-streams.ts                # Stream processing
    ├── 02-fibers.ts                 # Concurrency with Fibers
    └── 03-stm.ts                    # Software Transactional Memory
```

## 🎯 How to Use

### For Challenges:

1. **Start with a challenge file** (e.g., `01-option-challenges.ts`)
2. **Read the task description** for each challenge
3. **Implement the solution** in the provided function stubs
4. **Run the file** to test your implementation:
   ```bash
   tsx challenges/01-option-challenges.ts
   ```
5. **Check the solution** when stuck:
   ```bash
   tsx challenges/solutions/01-option-solutions.ts
   ```

### For Advanced Examples:

**Run the advanced examples** to see concepts in action:
```bash
tsx challenges/advanced-examples/01-streams.ts
tsx challenges/advanced-examples/02-fibers.ts
tsx challenges/advanced-examples/03-stm.ts
```

## 📖 Challenge Topics

### 1. Option (10 Challenges)
**Difficulty:** ⭐ Beginner

Master safe nullable handling with Option type:
- Finding values safely
- Nested optional access
- Transforming optional values
- Chaining operations
- Filtering and combining Options

**Key Skills:**
- `Option.fromNullable`, `Option.map`, `Option.flatMap`
- `Option.getOrElse`, `Option.match`
- `Option.filter`, `Option.all`

**Run:**
```bash
tsx challenges/01-option-challenges.ts
```

---

### 2. Effect Basics (10 Challenges)
**Difficulty:** ⭐⭐ Beginner-Intermediate

Learn Effect fundamentals and error handling:
- Creating successful/failed Effects
- Transforming Effect values
- Chaining Effects with flatMap
- Error recovery strategies
- Converting Promises to Effects
- Retry logic

**Key Skills:**
- `Effect.succeed`, `Effect.fail`
- `Effect.map`, `Effect.flatMap`
- `Effect.catchAll`, `Effect.catchTag`
- `Effect.retry`, `Effect.tryPromise`

**Run:**
```bash
tsx challenges/02-effect-challenges.ts
```

---

### 3. Pipe (10 Challenges)
**Difficulty:** ⭐⭐ Intermediate

Master functional composition with pipe:
- Basic transformations
- Array operations
- Complex data pipelines
- Nested transformations
- Custom pipeline creation

**Key Skills:**
- `pipe` function
- `Array.filter`, `Array.map`, `Array.reduce`
- Composing multiple operations
- Data transformation patterns

**Run:**
```bash
tsx challenges/03-pipe-challenges.ts
```

---

### 4. Effect.gen (10 Challenges)
**Difficulty:** ⭐⭐ Intermediate

Write imperative-style async code with Effect.gen:
- Sequential operations
- Error handling in generators
- Conditional logic
- Side effects with tap
- Parallel execution
- Complex transactions

**Key Skills:**
- `Effect.gen` syntax
- `yield*` for Effects
- `Effect.all` for parallelism
- `Effect.either` for safe error handling
- Transaction patterns

**Run:**
```bash
tsx challenges/04-effect-gen-challenges.ts
```

---

### 5. Services & Dependency Injection (10 Challenges)
**Difficulty:** ⭐⭐⭐ Advanced

Build testable, composable applications with DI:
- Service interface definition
- Layer implementation
- Using multiple services
- Service dependencies
- Swapping implementations for testing
- Error handling in services
- Layer composition

**Key Skills:**
- `Context.Tag` for service definition
- `Layer.succeed`, `Layer.effect`
- `Effect.provide` for dependency injection
- `Layer.merge`, `Layer.provide`
- Test doubles and mocking

**Run:**
```bash
tsx challenges/05-services-challenges.ts
```

---

### 6. Data Modeling & Schema (10 Challenges)
**Difficulty:** ⭐⭐⭐ Advanced

Create type-safe domain models with Schema:
- Basic schema definition
- Parsing and validation
- Branded types for type safety
- Schema.Class for domain models
- Literal types
- Optional and default values
- Tagged unions (discriminated unions)
- Encoding/Decoding transformations
- Complex nested schemas

**Key Skills:**
- `Schema.Struct`, `Schema.Class`
- `Schema.brand` for type branding
- `Schema.Literal`, `Schema.Union`
- `Schema.TaggedClass` for discriminated unions
- `Schema.transform` for encoding/decoding
- `Schema.decodeUnknownSync`, `Schema.encodeSync`

**Run:**
```bash
tsx challenges/06-data-modeling-challenges.ts
```

---

### 7. Error Handling (10 Challenges)
**Difficulty:** ⭐⭐⭐ Advanced

Master comprehensive error handling strategies:
- Basic error catching
- Catching specific errors by tag
- Handling multiple error types
- CatchAll for any error
- OrDie for unrecoverable errors
- Either for safe inspection
- Retry strategies
- Fallback chains
- Inspecting error causes
- Custom recovery strategies

**Key Skills:**
- `Effect.catchAll`, `Effect.catchTag`, `Effect.catchTags`
- `Effect.orDie`
- `Effect.either`, `Effect.exit`
- `Effect.retry` with `Schedule`
- `Exit` type for cause inspection
- Error recovery patterns

**Run:**
```bash
tsx challenges/07-error-handling-challenges.ts
```

---

## 🚀 Advanced Examples

### 1. Streams
**Complexity:** ⭐⭐⭐ Advanced

Learn reactive stream processing:
- Creating and consuming streams
- Transformations (map, filter, take)
- Stream from arrays/iterables
- Effects within streams
- Infinite streams
- Grouping and aggregation
- Error handling in streams
- Combining streams
- Data processing pipelines

**Topics Covered:**
- `Stream.range`, `Stream.make`, `Stream.fromIterable`
- `Stream.map`, `Stream.filter`, `Stream.take`
- `Stream.mapEffect` for async operations
- `Stream.iterate` for infinite streams
- `Stream.groupByKey`
- `Stream.catchAll`
- `Stream.mergeAll`

**Run:**
```bash
tsx challenges/advanced-examples/01-streams.ts
```

---

### 2. Fibers (Concurrency)
**Complexity:** ⭐⭐⭐⭐ Expert

Master structured concurrency with Fibers:
- Sequential vs parallel execution
- Creating and joining fibers
- Parallel execution with Effect.all
- Racing fibers
- Fiber interruption
- Timeouts
- Scoped concurrency
- Error handling in parallel
- Fiber supervision
- Batch processing with concurrency control

**Topics Covered:**
- `Effect.fork`, `Effect.join`
- `Effect.all` with concurrency option
- `Effect.race`
- `Effect.interrupt`
- `Effect.timeout`
- Structured concurrency patterns
- Fiber lifecycle management

**Run:**
```bash
tsx challenges/advanced-examples/02-fibers.ts
```

---

### 3. STM (Software Transactional Memory)
**Complexity:** ⭐⭐⭐⭐ Expert

Manage shared state safely with STM:
- Transactional references (TRef)
- Atomic transactions
- Bank account transfers
- STM retry mechanism
- Composing transactions
- Conditional transactions
- Multi-variable coordination
- Error handling in STM
- Inventory management system

**Topics Covered:**
- `TRef.make`, `TRef.get`, `TRef.set`, `TRef.update`
- `STM.commit` for executing transactions
- `STM.gen` for transaction composition
- `STM.retry` for waiting on conditions
- `STM.fail` for transaction errors
- Atomic multi-step operations
- Producer-consumer patterns

**Run:**
```bash
tsx challenges/advanced-examples/03-stm.ts
```

---

## 💡 Learning Path

### Beginner Track
1. Start with **Option challenges** (01)
2. Move to **Effect basics** (02)
3. Learn **Pipe** for composition (03)

### Intermediate Track
4. Master **Effect.gen** (04)
5. Understand **Error Handling** (07)
6. Explore **Data Modeling** (06)

### Advanced Track
7. Learn **Services & DI** (05)
8. Study **Streams** (advanced-examples/01)
9. Master **Fibers** (advanced-examples/02)
10. Understand **STM** (advanced-examples/03)

## 🎓 Tips for Success

### For Challenges:
1. **Try before looking at solutions** - Struggle is part of learning
2. **Run the code frequently** - See immediate feedback
3. **Experiment** - Modify challenges to test your understanding
4. **Read error messages** - TypeScript will guide you
5. **Use the solutions as reference** - Not as a crutch

### For Advanced Examples:
1. **Read the comments** - They explain key concepts
2. **Run and observe** - Watch the output carefully
3. **Modify and experiment** - Change parameters, add logging
4. **Compare patterns** - Notice similarities across examples
5. **Build your own** - Create variations using learned concepts

## 🔗 Related Resources

- **Main Examples**: `../effect-learning/src/` - Annotated learning examples
- **Practical App**: `../effect-learning/src/practical-app/` - Full task management system
- **Effect Documentation**: https://effect.website/docs/introduction
- **Effect Discord**: Join the community for help

## 📈 Progress Tracking

Use this checklist to track your progress:

**Challenges:**
- [ ] Option (01)
- [ ] Effect Basics (02)
- [ ] Pipe (03)
- [ ] Effect.gen (04)
- [ ] Services & DI (05)
- [ ] Data Modeling (06)
- [ ] Error Handling (07)

**Advanced Examples:**
- [ ] Streams
- [ ] Fibers
- [ ] STM

## 🤝 Contributing

Found a bug or have an idea for a new challenge? The learning materials are open for improvement!

---

**Happy Learning! 🚀**

Remember: The best way to learn Effect is by writing Effect code. Don't just read - code along!
