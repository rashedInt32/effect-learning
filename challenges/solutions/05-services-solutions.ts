import { Effect, Context, Layer } from "effect";

console.log("=== Services & Dependency Injection Solutions ===\n");

console.log("Solution 1 & 2: Service Definition and Implementation");

class Logger extends Context.Tag("Logger")<
  Logger,
  {
    readonly log: (message: string) => Effect.Effect<void>;
  }
>() {}

const ConsoleLogger = Layer.succeed(Logger, {
  log: (message: string) =>
    Effect.sync(() => {
      console.log(`[LOG]: ${message}`);
    }),
});

console.log("✓ Created\n");

console.log("Solution 3: Use the Service");
const program = Effect.gen(function* () {
  const logger = yield* Logger;
  yield* logger.log("Hello from Service!");
});

Effect.runPromise(Effect.provide(program, ConsoleLogger));
console.log("✓\n");

console.log("Solution 4: Multiple Services");
class Database extends Context.Tag("Database")<
  Database,
  {
    readonly query: (sql: string) => Effect.Effect<string[]>;
  }
>() {}

const MockDatabase = Layer.succeed(Database, {
  query: (sql: string) => Effect.succeed([`Result for: ${sql}`]),
});

const programWithMultipleServices = Effect.gen(function* () {
  const logger = yield* Logger;
  const db = yield* Database;

  yield* logger.log("Executing query");
  const results = yield* db.query("SELECT * FROM users");
  return results;
});

setTimeout(() => {
  Effect.runPromise(
    Effect.provide(
      programWithMultipleServices,
      Layer.merge(ConsoleLogger, MockDatabase),
    ),
  ).then((results) => console.log("Results:", results, "✓\n"));
}, 100);

console.log("Solution 5: Service Dependencies");
class UserService extends Context.Tag("UserService")<
  UserService,
  {
    readonly getUser: (id: number) => Effect.Effect<string>;
  }
>() {}

const UserServiceLive = Layer.effect(
  UserService,
  Effect.gen(function* () {
    const logger = yield* Logger;
    const db = yield* Database;

    return {
      getUser: (id: number) =>
        Effect.gen(function* () {
          yield* logger.log(`Fetching user ${id}`);
          const results = yield* db.query(`SELECT * FROM users WHERE id=${id}`);
          return results[0] || "User not found";
        }),
    };
  }),
);

const userProgram = Effect.gen(function* () {
  const userService = yield* UserService;
  const user = yield* userService.getUser(42);
  return user;
});

const AppLayer = Layer.provide(
  UserServiceLive,
  Layer.merge(ConsoleLogger, MockDatabase),
);

setTimeout(() => {
  Effect.runPromise(Effect.provide(userProgram, AppLayer)).then((user) =>
    console.log("User:", user, "✓\n"),
  );
}, 200);

console.log("Solution 6: Swap Implementations");
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

setTimeout(() => {
  Effect.runPromise(Effect.provide(testProgram, TestLogger)).then(() => {
    console.log("Captured messages:", messages, "✓\n");
  });
}, 300);

console.log("Solution 7: Error Handling in Services");
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
  const db = yield* DatabaseWithErrors;
  return yield* db.query("SELECT INVALID");
});

setTimeout(() => {
  Effect.runPromise(Effect.provide(errorProgram, FailingDatabase)).catch(
    (err) => console.log("Caught:", err._tag, "✓\n"),
  );
}, 400);

console.log("Solution 8: Service Factory");
class Config extends Context.Tag("Config")<
  Config,
  {
    readonly getEnv: () => "dev" | "prod";
  }
>() {}

const DevConfig = Layer.succeed(Config, {
  getEnv: () => "dev",
});

const ConfigurableLogger = Layer.effect(
  Logger,
  Effect.gen(function* () {
    const config = yield* Config;
    const env = config.getEnv();

    return {
      log: (message: string) =>
        Effect.sync(() => {
          console.log(`[${env.toUpperCase()}]: ${message}`);
        }),
    };
  }),
);

const configProgram = Effect.gen(function* () {
  const logger = yield* Logger;
  yield* logger.log("Application started");
});

setTimeout(() => {
  Effect.runPromise(
    Effect.provide(configProgram, Layer.provide(ConfigurableLogger, DevConfig)),
  );
  console.log("✓\n");
}, 500);

console.log("Solution 9: Advanced - Compose Layers");
const FullAppLayer = Layer.mergeAll(
  ConsoleLogger,
  MockDatabase,
  Layer.provide(UserServiceLive, Layer.merge(ConsoleLogger, MockDatabase)),
);

const fullProgram = Effect.gen(function* () {
  const logger = yield* Logger;
  const userService = yield* UserService;

  yield* logger.log("App started");
  const user = yield* userService.getUser(1);
  return user;
});

setTimeout(() => {
  Effect.runPromise(Effect.provide(fullProgram, FullAppLayer)).then((user) =>
    console.log("Full app result:", user, "✓\n"),
  );
}, 600);

console.log("Solution 10: Expert - Test Entire Stack");
const testMessages: string[] = [];
const TestLoggerForStack = Layer.succeed(Logger, {
  log: (message: string) =>
    Effect.sync(() => {
      testMessages.push(message);
    }),
});

const TestDatabase = Layer.succeed(Database, {
  query: (sql: string) => Effect.succeed(["Test User"]),
});

const TestUserService = Layer.provide(
  UserServiceLive,
  Layer.merge(TestLoggerForStack, TestDatabase),
);

const testFullProgram = Effect.gen(function* () {
  const userService = yield* UserService;
  const user = yield* userService.getUser(1);
  return user;
});

setTimeout(() => {
  Effect.runPromise(Effect.provide(testFullProgram, TestUserService)).then(
    (user) => {
      console.log("Test result:", user);
      console.log("Test logs:", testMessages);
      console.log("✓");
    },
  );
}, 700);

setTimeout(() => {
  console.log("\n🎉 All solutions complete!");
}, 800);
