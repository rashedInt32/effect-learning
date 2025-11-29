import { Effect, Console } from "effect";

const fetchUser = Effect.fn("fetchUser")(function* (userId: string) {
  yield* Effect.logInfo(`Fetching user ${userId}`);
  yield* Effect.sleep("500 millis");
  return {
    id: userId,
    name: `User ${userId}`,
    email: `user${userId}@example.com`,
  };
});

const processUser = Effect.fn("processUser")(function* (user: {
  id: string;
  name: string;
  email: string;
}) {
  yield* Effect.logInfo(`Processing ${user.name}`);
  yield* Effect.sleep("200 millis");
  return `Processed: ${user.name} (${user.email})`;
});

const checkUser = Effect.fn("checkUser")(function* (userId: string) {
  yield* Effect.logInfo(`Processing user`);
  yield* Effect.sleep("500 millis");
});

const program = Effect.gen(function* () {
  yield* Effect.logInfo("Starting Effect program");

  const user = yield* fetchUser("123");
  const result = yield* processUser(user);

  yield* Effect.logInfo(`Result: ${result}`);

  return result;
});

const runnable = program.pipe(
  Effect.timeout("5 seconds"),
  Effect.withSpan("main-program"),
  Effect.tap((result) => Console.log(result)),
);

Effect.runPromise(runnable);
