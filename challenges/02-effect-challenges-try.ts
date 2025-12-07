import { Array, Effect, pipe } from "effect";
import { mock } from "node:test";

console.log("=== Effect Challenges ===\n");

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
  constructor(
    readonly field: string,
    readonly reason: string,
  ) {}
}

console.log("Challenge 1: Create a Successful Effect");
console.log("Task: Create an Effect that succeeds with the number 42.\n");

function getAnswer(): Effect.Effect<number, never, never> {
  return Effect.succeed(42);
}

Effect.runPromise(getAnswer()).then(console.log);
console.log("Expected: 42\n");

console.log("Challenge 2: Create a Failed Effect");
console.log("Task: Create an Effect that fails with UserNotFoundError.\n");

function getUserFailed(): Effect.Effect<User, UserNotFoundError, never> {
  return Effect.fail(new UserNotFoundError(999));
}

Effect.runPromise(getUserFailed()).catch((err) => console.log(err._tag));
console.log("Expected: UserNotFoundError\n");

console.log("Challenge 3: Transform Effect Values");
console.log(
  "Task: Create an Effect that returns a user's name in uppercase. Use Effect.map.\n",
);

function getUserNameUppercase(
  userId: number,
): Effect.Effect<string, UserNotFoundError, never> {
  return pipe(
    findUserEffect(userId),
    Effect.map((user) => user.name.toUpperCase()),
  );
}

Effect.runPromise(getUserNameUppercase(1)).then(console.log);
console.log("Expected: ALICE\n");

console.log("Challenge 4: Chain Effects (flatMap)");
console.log(
  "Task: Find user, then validate their email is not empty. Return the email or fail with ValidationError.\n",
);

function findUserEffect(
  userId: number,
): Effect.Effect<User, UserNotFoundError, never> {
  const user = mockDatabase.find((u) => u.id === userId);
  return user
    ? Effect.succeed(user)
    : Effect.fail(new UserNotFoundError(userId));
}

function validateAndGetEmail(
  userId: number,
): Effect.Effect<string, UserNotFoundError | ValidationError, never> {
  return pipe(
    findUserEffect(userId),
    Effect.flatMap((user) =>
      user.email.length > 0
        ? Effect.succeed(user.email)
        : Effect.fail(new ValidationError("email", "Email cannot be empty")),
    ),
  );
}

Effect.runPromise(validateAndGetEmail(1)).then(console.log);
console.log("Expected: alice@example.com\n");

console.log("Challenge 5: Error Recovery");
console.log(
  "Task: Try to find a user, if not found, return a default guest user instead.\n",
);

const guestUser: User = { id: 0, name: "Guest", email: "guest@example.com" };

function getUserOrGuest(userId: number): Effect.Effect<User, never, never> {
  return Effect.succeed(guestUser);
}

Effect.runPromise(getUserOrGuest(999)).then((u) => console.log(u.name));
console.log("Expected: Guest\n");

console.log("Challenge 6: From Promise");
console.log(
  "Task: Wrap a Promise-based API call in an Effect. Handle both success and rejection.\n",
);

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
  return Effect.fail(new Error("not implemented"));
}

Effect.runPromise(getUserFromApi(1)).then((u) => console.log(u.name));
console.log("Expected: Alice\n");

console.log("Challenge 7: Multiple Sequential Effects");
console.log(
  "Task: Create 3 effects that log steps, then return a final value. Use flatMap to chain them.\n",
);

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
  return Effect.succeed(0);
}

Effect.runPromise(runSteps()).then((result) =>
  console.log("Final result:", result),
);
console.log("Expected: Step 1, Step 2, Step 3, then 25\n");

console.log("Challenge 8: Conditional Effects");
console.log(
  "Task: If user age > 18, return 'adult', else return 'minor'. Age comes from an Effect.\n",
);

function getAge(
  userId: number,
): Effect.Effect<number, UserNotFoundError, never> {
  const ages: Record<number, number> = { 1: 30, 2: 15 };
  return ages[userId]
    ? Effect.succeed(ages[userId])
    : Effect.fail(new UserNotFoundError(userId));
}

function checkAdultStatus(
  userId: number,
): Effect.Effect<string, UserNotFoundError, never> {
  return Effect.succeed("");
}

Effect.runPromise(checkAdultStatus(1)).then(console.log);
Effect.runPromise(checkAdultStatus(2)).then(console.log);
console.log("Expected: adult, then minor\n");

console.log("Challenge 9: Error Handling - Catch Specific Error");
console.log(
  "Task: Catch only DatabaseError and log it, but let other errors fail.\n",
);

function riskyOperation(
  shouldFail: boolean,
): Effect.Effect<string, DatabaseError | ValidationError, never> {
  return shouldFail
    ? Effect.fail(new DatabaseError("Connection failed"))
    : Effect.succeed("Success");
}

function handleDatabaseError(
  shouldFail: boolean,
): Effect.Effect<string, ValidationError, never> {
  return Effect.succeed("");
}

Effect.runPromise(handleDatabaseError(true)).then(console.log);
console.log("Expected: Recovered from database error\n");

console.log("Challenge 10: Expert - Retry Logic");
console.log(
  "Task: Create an effect that fails twice, then succeeds on third attempt. Use Effect.retry (research needed).\n",
);

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

console.log(
  "Hint: Use Effect.retry with a Schedule (import { Schedule } from 'effect')\n",
);

console.log("\n✨ Run the solution file to see the answers!");
