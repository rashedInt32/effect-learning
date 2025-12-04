import { Effect, Schedule, pipe } from "effect";

console.log("=== Effect Solutions ===\n");

type User = {
  id: number;
  name: string;
  email: string;
};

const mockDatabase: User[] = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" },
];

class UserNotFoundError {
  readonly _tag = "UserNotFoundError";
  constructor(readonly userId: number) {}
}

class DatabaseError {
  readonly _tag = "DatabaseError";
  constructor(readonly message: string) {}
}

class ValidationError {
  readonly _tag = "ValidationError";
  constructor(readonly field: string, readonly reason: string) {}
}

console.log("Solution 1: Create a Successful Effect");
function getAnswer(): Effect.Effect<number, never, never> {
  return Effect.succeed(42);
}

Effect.runPromise(getAnswer()).then((result) =>
  console.log("Result:", result, "✓")
);

console.log("\nSolution 2: Create a Failed Effect");
function getUserFailed(): Effect.Effect<User, UserNotFoundError, never> {
  return Effect.fail(new UserNotFoundError(999));
}

Effect.runPromise(getUserFailed()).catch((err) =>
  console.log("Result:", err._tag, "✓")
);

console.log("\nSolution 3: Transform Effect Values");
function getUserNameUppercase(
  userId: number
): Effect.Effect<string, UserNotFoundError, never> {
  return pipe(
    findUserEffect(userId),
    Effect.map((user) => user.name.toUpperCase())
  );
}

function findUserEffect(
  userId: number
): Effect.Effect<User, UserNotFoundError, never> {
  const user = mockDatabase.find((u) => u.id === userId);
  return user
    ? Effect.succeed(user)
    : Effect.fail(new UserNotFoundError(userId));
}

Effect.runPromise(getUserNameUppercase(1)).then((result) =>
  console.log("Result:", result, "✓")
);

console.log("\nSolution 4: Chain Effects (flatMap)");
function validateAndGetEmail(
  userId: number
): Effect.Effect<string, UserNotFoundError | ValidationError, never> {
  return pipe(
    findUserEffect(userId),
    Effect.flatMap((user) =>
      user.email.length === 0
        ? Effect.fail(new ValidationError("email", "Email cannot be empty"))
        : Effect.succeed(user.email)
    )
  );
}

Effect.runPromise(validateAndGetEmail(1)).then((result) =>
  console.log("Result:", result, "✓")
);

console.log("\nSolution 5: Error Recovery");
const guestUser: User = { id: 0, name: "Guest", email: "guest@example.com" };

function getUserOrGuest(userId: number): Effect.Effect<User, never, never> {
  return pipe(
    findUserEffect(userId),
    Effect.catchAll(() => Effect.succeed(guestUser))
  );
}

Effect.runPromise(getUserOrGuest(999)).then((u) =>
  console.log("Result:", u.name, "✓")
);

console.log("\nSolution 6: From Promise");
function mockApiCall(userId: number): Promise<User> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const user = mockDatabase.find((u) => u.id === userId);
      if (user) resolve(user);
      else reject(new Error("User not found"));
    }, 100);
  });
}

function getUserFromApi(userId: number): Effect.Effect<User, Error, never> {
  return Effect.tryPromise({
    try: () => mockApiCall(userId),
    catch: (error) => error as Error,
  });
}

Effect.runPromise(getUserFromApi(1)).then((u) =>
  console.log("Result:", u.name, "✓")
);

console.log("\nSolution 7: Multiple Sequential Effects");
const step1 = Effect.sync(() => {
  console.log("Step 1 executed");
  return 10;
});

const step2 = (n: number) =>
  Effect.sync(() => {
    console.log("Step 2 executed");
    return n * 2;
  });

const step3 = (n: number) =>
  Effect.sync(() => {
    console.log("Step 3 executed");
    return n + 5;
  });

function runSteps(): Effect.Effect<number, never, never> {
  return pipe(
    step1,
    Effect.flatMap((n) => step2(n)),
    Effect.flatMap((n) => step3(n))
  );
}

Effect.runPromise(runSteps()).then((result) =>
  console.log("Final result:", result, "✓")
);

console.log("\nSolution 8: Conditional Effects");
function getAge(userId: number): Effect.Effect<number, UserNotFoundError, never> {
  const ages: Record<number, number> = { 1: 30, 2: 15 };
  return ages[userId]
    ? Effect.succeed(ages[userId])
    : Effect.fail(new UserNotFoundError(userId));
}

function checkAdultStatus(
  userId: number
): Effect.Effect<string, UserNotFoundError, never> {
  return pipe(
    getAge(userId),
    Effect.map((age) => (age > 18 ? "adult" : "minor"))
  );
}

setTimeout(() => {
  Effect.runPromise(checkAdultStatus(1)).then((result) =>
    console.log("Result:", result, "✓")
  );
  Effect.runPromise(checkAdultStatus(2)).then((result) =>
    console.log("Result:", result, "✓")
  );
}, 200);

console.log("\nSolution 9: Error Handling - Catch Specific Error");
function riskyOperation(
  shouldFail: boolean
): Effect.Effect<string, DatabaseError | ValidationError, never> {
  return shouldFail
    ? Effect.fail(new DatabaseError("Connection failed"))
    : Effect.succeed("Success");
}

function handleDatabaseError(
  shouldFail: boolean
): Effect.Effect<string, ValidationError, never> {
  return pipe(
    riskyOperation(shouldFail),
    Effect.catchTag("DatabaseError", (error) => {
      console.log("Caught database error:", error.message);
      return Effect.succeed("Recovered from database error");
    })
  );
}

setTimeout(() => {
  Effect.runPromise(handleDatabaseError(true)).then((result) =>
    console.log("Result:", result, "✓")
  );
}, 300);

console.log("\nSolution 10: Expert - Retry Logic");
let attemptCount = 0;
function unreliableOperation(): Effect.Effect<string, Error, never> {
  return Effect.sync(() => {
    attemptCount++;
    if (attemptCount < 3) {
      throw new Error(`Attempt ${attemptCount} failed`);
    }
    return "Success after retries";
  });
}

const withRetry = pipe(
  Effect.try(() => {
    if (attemptCount < 3) {
      attemptCount++;
      throw new Error(`Attempt ${attemptCount} failed`);
    }
    return "Success after retries";
  }),
  Effect.retry(Schedule.recurs(2))
);

setTimeout(() => {
  attemptCount = 0;
  Effect.runPromise(withRetry).then((result) =>
    console.log("Result:", result, "✓")
  );
}, 400);

console.log("\n🎉 All solutions complete!");
