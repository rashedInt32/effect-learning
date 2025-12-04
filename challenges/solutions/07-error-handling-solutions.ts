import { Effect, Exit, Schedule, pipe } from "effect";

console.log("=== Error Handling Solutions ===\n");

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

console.log("Solution 1: Basic Error Handling");

const failingEffect = Effect.fail(new NetworkError("Connection timeout"));

const solution1 = pipe(
  failingEffect,
  Effect.catchAll(() => Effect.succeed("Recovered from network error"))
);

Effect.runPromise(solution1).then((result) =>
  console.log("Result:", result, "✓\n")
);

console.log("Solution 2: Catch Specific Error by Tag");

const multiErrorEffect = (type: "network" | "validation") =>
  type === "network"
    ? Effect.fail(new NetworkError("Timeout"))
    : Effect.fail(new ValidationError("email", "Invalid format"));

const solution2 = (type: "network" | "validation") =>
  pipe(
    multiErrorEffect(type),
    Effect.catchTag("NetworkError", () =>
      Effect.succeed("Handled network error")
    )
  );

setTimeout(() => {
  Effect.runPromise(solution2("network")).then((result) =>
    console.log("Result:", result, "✓")
  );
  Effect.runPromise(solution2("validation")).catch((err) =>
    console.log("Uncaught:", err._tag, "✓\n")
  );
}, 100);

console.log("Solution 3: Catch Multiple Specific Errors");

const riskyOperation = (errorType: "network" | "database" | "none") => {
  if (errorType === "network")
    return Effect.fail(new NetworkError("Timeout"));
  if (errorType === "database")
    return Effect.fail(new DatabaseError(500));
  return Effect.succeed("Success");
};

const solution3 = (errorType: "network" | "database" | "none") =>
  pipe(
    riskyOperation(errorType),
    Effect.catchTags({
      NetworkError: () => Effect.succeed("Network issue"),
      DatabaseError: (err) => Effect.succeed(`DB code ${err.code}`),
    })
  );

setTimeout(() => {
  Effect.runPromise(solution3("network")).then((result) =>
    console.log("Result:", result, "✓")
  );
  Effect.runPromise(solution3("database")).then((result) =>
    console.log("Result:", result, "✓")
  );
  Effect.runPromise(solution3("none")).then((result) =>
    console.log("Result:", result, "✓\n")
  );
}, 200);

console.log("Solution 4: CatchAll - Handle Any Error");

const solution4 = pipe(
  riskyOperation("network"),
  Effect.catchAll(() => Effect.succeed("An error occurred"))
);

setTimeout(() => {
  Effect.runPromise(solution4).then((result) =>
    console.log("Result:", result, "✓\n")
  );
}, 300);

console.log("Solution 5: OrDie - Convert to Defect");
console.log("Skipped (would crash): Effect.orDie(failingEffect)");
console.log("✓\n");

console.log("Solution 6: Either - Safe Error Handling");

const solution6 = Effect.gen(function* () {
  const result = yield* Effect.either(riskyOperation("network"));

  if (result._tag === "Left") {
    return `Error: ${result.left._tag}`;
  }
  return `Success: ${result.right}`;
});

setTimeout(() => {
  Effect.runPromise(solution6).then((result) =>
    console.log("Result:", result, "✓\n")
  );
}, 400);

console.log("Solution 7: Retry on Failure");

let attemptCount = 0;
const unreliableOp = Effect.sync(() => {
  attemptCount++;
  if (attemptCount < 3) throw new Error(`Attempt ${attemptCount} failed`);
  return "Success";
});

const solution7 = pipe(unreliableOp, Effect.retry(Schedule.recurs(2)));

setTimeout(() => {
  attemptCount = 0;
  Effect.runPromise(solution7).then((result) =>
    console.log("Result:", result, "✓\n")
  );
}, 500);

console.log("Solution 8: Error Recovery with Fallback Chain");

const primarySource = Effect.fail(new NetworkError("Primary down"));
const backupSource = Effect.fail(new NetworkError("Backup down"));
const cacheSource = Effect.succeed("Cached data");

const solution8 = pipe(
  primarySource,
  Effect.catchAll(() => backupSource),
  Effect.catchAll(() => cacheSource)
);

setTimeout(() => {
  Effect.runPromise(solution8).then((result) =>
    console.log("Result:", result, "✓\n")
  );
}, 600);

console.log("Solution 9: Sandbox - Inspect Cause");

const solution9 = Effect.gen(function* () {
  const exit = yield* Effect.exit(riskyOperation("network"));

  if (Exit.isFailure(exit)) {
    return `Failure detected`;
  }
  return `Success: ${exit.value}`;
});

setTimeout(() => {
  Effect.runPromise(solution9).then((result) =>
    console.log("Result:", result, "✓\n")
  );
}, 700);

console.log("Solution 10: Expert - Custom Error Recovery Strategy");

const complexOperation = (
  errorType: "network" | "validation" | "database"
) => {
  if (errorType === "network")
    return Effect.fail(new NetworkError("Timeout"));
  if (errorType === "validation")
    return Effect.fail(new ValidationError("email", "Invalid"));
  return Effect.fail(new DatabaseError(500));
};

const solution10 = (errorType: "network" | "validation" | "database") =>
  pipe(
    complexOperation(errorType),
    Effect.retry(Schedule.recurs(2)),
    Effect.catchTag("ValidationError", () =>
      Effect.succeed("Recovered from validation error")
    )
  );

setTimeout(() => {
  Effect.runPromise(solution10("validation")).then((result) =>
    console.log("Result:", result, "✓\n")
  );
}, 800);

setTimeout(() => {
  console.log("🎉 All error handling solutions complete!");
}, 900);
