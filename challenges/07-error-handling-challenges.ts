import { Effect, Exit } from "effect";

console.log("=== Error Handling Challenges ===\n");

class NetworkError {
  readonly _tag = "NetworkError";
  constructor(readonly message: string) {}
}

class ValidationError {
  readonly _tag = "ValidationError";
  constructor(readonly field: string, readonly reason: string) {}
}

class DatabaseError {
  readonly _tag = "DatabaseError";
  constructor(readonly code: number) {}
}

console.log("Challenge 1: Basic Error Handling");
console.log("Task: Create an effect that fails with NetworkError, then catch it.\n");

const failingEffect = Effect.fail(new NetworkError("Connection timeout"));

const challenge1 = Effect.succeed("not implemented");

Effect.runPromise(challenge1).then(console.log);
console.log("Expected: Recovered from network error\n");

console.log("Challenge 2: Catch Specific Error by Tag");
console.log("Task: Handle only NetworkError, let others propagate.\n");

const multiErrorEffect = (type: "network" | "validation") =>
  type === "network"
    ? Effect.fail(new NetworkError("Timeout"))
    : Effect.fail(new ValidationError("email", "Invalid format"));

const challenge2 = (type: "network" | "validation") =>
  Effect.succeed("not implemented");

Effect.runPromise(challenge2("network")).then(console.log);
Effect.runPromise(challenge2("validation")).catch((err) =>
  console.log("Uncaught:", err._tag)
);
console.log("Expected: Handled network error, then Uncaught: ValidationError\n");

console.log("Challenge 3: Catch Multiple Specific Errors");
console.log("Task: Handle NetworkError and DatabaseError differently.\n");

const riskyOperation = (errorType: "network" | "database" | "none") => {
  if (errorType === "network") return Effect.fail(new NetworkError("Timeout"));
  if (errorType === "database")
    return Effect.fail(new DatabaseError(500));
  return Effect.succeed("Success");
};

const challenge3 = (errorType: "network" | "database" | "none") =>
  Effect.succeed("not implemented");

Effect.runPromise(challenge3("network")).then(console.log);
Effect.runPromise(challenge3("database")).then(console.log);
Effect.runPromise(challenge3("none")).then(console.log);
console.log(
  "Expected: Network issue, DB code 500, Success\n"
);

console.log("Challenge 4: CatchAll - Handle Any Error");
console.log("Task: Catch all errors and return a generic error message.\n");

const challenge4 = riskyOperation("network");

Effect.runPromise(challenge4).then(console.log);
console.log("Expected: An error occurred\n");

console.log("Challenge 5: OrDie - Convert to Defect");
console.log(
  "Task: Use orDie to treat NetworkError as unrecoverable (will crash).\n"
);

console.log("Hint: This would crash the program, so we skip running it.");
console.log("Code: Effect.orDie(failingEffect)\n");

console.log("Challenge 6: Either - Safe Error Handling");
console.log("Task: Convert an Effect to Either to inspect success/failure.\n");

const challenge6 = Effect.gen(function* () {
  const result = yield* Effect.either(riskyOperation("network"));

  if (result._tag === "Left") {
    return `Error: ${result.left._tag}`;
  }
  return `Success: ${result.right}`;
});

Effect.runPromise(challenge6).then(console.log);
console.log("Expected: Error: NetworkError\n");

console.log("Challenge 7: Retry on Failure");
console.log("Task: Retry a failing operation 3 times before giving up.\n");

let attemptCount = 0;
const unreliableOp = Effect.sync(() => {
  attemptCount++;
  if (attemptCount < 3) throw new Error(`Attempt ${attemptCount} failed`);
  return "Success";
});

console.log("Hint: Use Effect.retry with Schedule.recurs(2)\n");

console.log("Challenge 8: Error Recovery with Fallback Chain");
console.log("Task: Try primary source, if fails try backup, if fails use cache.\n");

const primarySource = Effect.fail(new NetworkError("Primary down"));
const backupSource = Effect.fail(new NetworkError("Backup down"));
const cacheSource = Effect.succeed("Cached data");

const challenge8 = Effect.succeed("not implemented");

Effect.runPromise(challenge8).then(console.log);
console.log("Expected: Cached data\n");

console.log("Challenge 9: Sandbox - Inspect Cause");
console.log("Task: Use sandbox to inspect error cause and log it.\n");

const challenge9 = Effect.gen(function* () {
  const exit = yield* Effect.exit(riskyOperation("network"));

  if (Exit.isFailure(exit)) {
    return `Failure cause: ${exit.cause}`;
  }
  return `Success: ${exit.value}`;
});

Effect.runPromise(challenge9).then(console.log);
console.log("Expected: Logs the cause\n");

console.log("Challenge 10: Expert - Custom Error Recovery Strategy");
console.log(
  "Task: Retry network errors 3 times, recover from validation errors, let DB errors fail.\n"
);

const complexOperation = (errorType: "network" | "validation" | "database") => {
  if (errorType === "network") return Effect.fail(new NetworkError("Timeout"));
  if (errorType === "validation")
    return Effect.fail(new ValidationError("email", "Invalid"));
  return Effect.fail(new DatabaseError(500));
};

const challenge10 = (errorType: "network" | "validation" | "database") =>
  Effect.succeed("not implemented");

Effect.runPromise(challenge10("validation")).then(console.log);
console.log("Expected: Recovered from validation error\n");

console.log("\n✨ Run the solution file to see the answers!");
