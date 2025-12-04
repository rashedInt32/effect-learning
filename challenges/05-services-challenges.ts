import { Effect, Context, Layer } from "effect";

console.log("=== Services & Dependency Injection Challenges ===\n");

console.log("Challenge 1: Create a Simple Service");
console.log("Task: Define a Logger service interface with a log method.\n");

class Logger extends Context.Tag("Logger")<
  Logger,
  {
    readonly log: (message: string) => Effect.Effect<void>;
  }
>() {}

console.log("✓ Service interface created\n");

console.log("Challenge 2: Implement the Service");
console.log("Task: Create a ConsoleLogger implementation.\n");

const ConsoleLogger = Layer.succeed(Logger, {
  log: (message: string) =>
    Effect.sync(() => {
      console.log(`[LOG]: ${message}`);
    }),
});

console.log("✓ Implementation created\n");

console.log("Challenge 3: Use the Service");
console.log(
  "Task: Create a program that uses Logger to log 'Hello from Service!'.\n"
);

const program = Effect.gen(function* () {
  return yield* Effect.succeed("not implemented");
});

Effect.runPromise(Effect.provide(program, ConsoleLogger));
console.log("Expected: [LOG]: Hello from Service!\n");

console.log("Challenge 4: Multiple Services");
console.log("Task: Create Database and Logger services, use both together.\n");

class Database extends Context.Tag("Database")<
  Database,
  {
    readonly query: (sql: string) => Effect.Effect<string[]>;
  }
>() {}

const MockDatabase = Layer.succeed(Database, {
  query: (sql: string) =>
    Effect.succeed([`Result for: ${sql}`]),
});

const programWithMultipleServices = Effect.gen(function* () {
  return yield* Effect.succeed([]);
});

Effect.runPromise(
  Effect.provide(
    programWithMultipleServices,
    Layer.merge(ConsoleLogger, MockDatabase)
  )
);
console.log(
  "Expected: [LOG]: Executing query, then returns query results\n"
);

console.log("Challenge 5: Service Dependencies");
console.log("Task: Create UserService that depends on Database and Logger.\n");

class UserService extends Context.Tag("UserService")<
  UserService,
  {
    readonly getUser: (id: number) => Effect.Effect<string>;
  }
>() {}

const UserServiceLive = Layer.succeed(UserService, {
  getUser: (id: number) => Effect.succeed(`User ${id}`),
});

console.log("Hint: Use Layer.effect to access other services\n");

console.log("Challenge 6: Swap Implementations");
console.log(
  "Task: Create a TestLogger that doesn't print, for testing purposes.\n"
);

const messages: string[] = [];
const TestLogger = Layer.succeed(Logger, {
  log: (message: string) =>
    Effect.sync(() => {
      messages.push(message);
    }),
});

const testProgram = Effect.gen(function* () {
  const logger = yield* Logger;
  yield* logger.log("Test message");
});

Effect.runPromise(Effect.provide(testProgram, TestLogger)).then(() => {
  console.log("Captured messages:", messages);
});
console.log("Expected: ['Test message']\n");

console.log("Challenge 7: Error Handling in Services");
console.log("Task: Create a Database service that can fail with DBError.\n");

class DBError {
  readonly _tag = "DBError";
  constructor(readonly message: string) {}
}

class DatabaseWithErrors extends Context.Tag("DatabaseWithErrors")<
  DatabaseWithErrors,
  {
    readonly query: (sql: string) => Effect.Effect<string[], DBError>;
  }
>() {}

const FailingDatabase = Layer.succeed(DatabaseWithErrors, {
  query: (sql: string) =>
    sql.includes("INVALID")
      ? Effect.fail(new DBError("Invalid query"))
      : Effect.succeed(["data"]),
});

const errorProgram = Effect.gen(function* () {
  return yield* Effect.succeed([]);
});

Effect.runPromise(
  Effect.provide(errorProgram, FailingDatabase)
).catch((err) => console.log("Caught:", err._tag));

console.log("Expected: Caught: DBError\n");

console.log("Challenge 8: Service Factory");
console.log("Task: Create a Config service and use it to configure Logger.\n");

class Config extends Context.Tag("Config")<
  Config,
  {
    readonly getEnv: () => "dev" | "prod";
  }
>() {}

const DevConfig = Layer.succeed(Config, {
  getEnv: () => "dev",
});

console.log("Hint: Create Logger layer that depends on Config layer\n");

console.log("Challenge 9: Advanced - Compose Layers");
console.log(
  "Task: Build app layer that provides Logger, Database, and UserService in correct order.\n"
);

console.log("Hint: Use Layer.provide and Layer.merge\n");

console.log("Challenge 10: Expert - Test Entire Stack");
console.log(
  "Task: Create test versions of all services and verify UserService works correctly.\n"
);

console.log(
  "Hint: Mock Database to return specific user, verify Logger captured messages\n"
);

console.log("\n✨ Run the solution file to see the answers!");
