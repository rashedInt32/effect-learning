import { Effect, Fiber, pipe } from "effect";

console.log("=== Advanced Example: Fibers (Concurrency) ===\n");

console.log("What are Fibers?");
console.log(
  "Fibers are lightweight green threads managed by Effect runtime."
);
console.log("They enable structured concurrency and safe parallelism.\n");

console.log("1. Basic Fiber Creation and Joining");

const task1 = Effect.gen(function* () {
  console.log("Task 1 started");
  yield* Effect.sleep("100 millis");
  console.log("Task 1 completed");
  return "Result 1";
});

const task2 = Effect.gen(function* () {
  console.log("Task 2 started");
  yield* Effect.sleep("50 millis");
  console.log("Task 2 completed");
  return "Result 2";
});

const runBothSequentially = Effect.gen(function* () {
  console.log("\n--- Sequential Execution ---");
  const result1 = yield* task1;
  const result2 = yield* task2;
  return [result1, result2];
});

Effect.runPromise(runBothSequentially).then((results) =>
  console.log("Sequential results:", results)
);

console.log("\n2. Parallel Execution with Fibers");

setTimeout(() => {
  const runBothInParallel = Effect.gen(function* () {
    console.log("\n--- Parallel Execution ---");
    const fiber1 = yield* Effect.fork(task1);
    const fiber2 = yield* Effect.fork(task2);

    const result1 = yield* Fiber.join(fiber1);
    const result2 = yield* Fiber.join(fiber2);

    return [result1, result2];
  });

  Effect.runPromise(runBothInParallel).then((results) =>
    console.log("Parallel results:", results)
  );
}, 200);

console.log("\n3. Effect.all for Parallel Execution");

setTimeout(() => {
  const parallelWithAll = Effect.all([task1, task2], { concurrency: 2 });

  Effect.runPromise(parallelWithAll).then((results) =>
    console.log("\nEffect.all results:", results)
  );
}, 500);

console.log("\n4. Racing Fibers");

const slowTask = pipe(
  Effect.sleep("200 millis"),
  Effect.map(() => "Slow result")
);

const fastTask = pipe(
  Effect.sleep("50 millis"),
  Effect.map(() => "Fast result")
);

setTimeout(() => {
  const race = Effect.race(slowTask, fastTask);

  Effect.runPromise(race).then((winner) =>
    console.log("\nRace winner:", winner)
  );
}, 800);

console.log("\n5. Fiber Interruption");

const longRunningTask = Effect.gen(function* () {
  console.log("\nLong task started");
  yield* Effect.sleep("2 seconds");
  console.log("Long task completed (this won't print)");
  return "Done";
});

setTimeout(() => {
  const interruptExample = Effect.gen(function* () {
    const fiber = yield* Effect.fork(longRunningTask);
    yield* Effect.sleep("100 millis");
    console.log("Interrupting long task...");
    yield* Fiber.interrupt(fiber);
    return "Interrupted";
  });

  Effect.runPromise(interruptExample)
    .then((result) => console.log("Interruption result:", result))
    .catch(() => console.log("Interruption completed"));
}, 1000);

console.log("\n6. Timeout with Fibers");

const taskWithTimeout = pipe(
  Effect.sleep("500 millis"),
  Effect.map(() => "Completed"),
  Effect.timeout("100 millis"),
  Effect.catchAll(() => Effect.succeed(null))
);

setTimeout(() => {
  Effect.runPromise(taskWithTimeout).then((result) =>
    console.log("\nTimeout result (timed out):", result)
  );
}, 1200);

console.log("\n7. Scoped Concurrency");

setTimeout(() => {
  const scopedTasks = Effect.gen(function* () {
    console.log("\n--- Scoped Concurrency ---");

    const results = yield* Effect.all(
      [
        Effect.succeed("Task A"),
        Effect.succeed("Task B"),
        Effect.succeed("Task C"),
      ],
      { concurrency: 2 }
    );

    return results;
  });

  Effect.runPromise(scopedTasks).then((results) =>
    console.log("Scoped results:", results)
  );
}, 1400);

console.log("\n8. Error Handling in Parallel");

const successTask = Effect.succeed("Success");
const failTask = Effect.fail(new Error("Failed task"));

setTimeout(() => {
  const parallelWithError = pipe(
    Effect.all([successTask, failTask], { concurrency: 2 }),
    Effect.catchAll((error) =>
      Effect.succeed(["Caught error:", error.message])
    )
  );

  Effect.runPromise(parallelWithError).then((result) =>
    console.log("\nParallel with error:", result)
  );
}, 1500);

console.log("\n9. Fiber Supervision");

const supervisedTask = Effect.gen(function* () {
  console.log("\n--- Fiber Supervision ---");

  const fiber1 = yield* Effect.fork(
    Effect.gen(function* () {
      yield* Effect.sleep("50 millis");
      return "Fiber 1";
    })
  );

  const fiber2 = yield* Effect.fork(
    Effect.gen(function* () {
      yield* Effect.sleep("100 millis");
      return "Fiber 2";
    })
  );

  const result1 = yield* Fiber.join(fiber1);
  const result2 = yield* Fiber.join(fiber2);

  return { result1, result2 };
});

setTimeout(() => {
  Effect.runPromise(supervisedTask).then((result) =>
    console.log("Supervised results:", result)
  );
}, 1600);

console.log("\n10. Real-World Example: Batch Processing");

type Job = { id: number; data: string };

const processJob = (job: Job) =>
  Effect.gen(function* () {
    console.log(`\nProcessing job ${job.id}...`);
    yield* Effect.sleep("50 millis");
    return `Job ${job.id} processed`;
  });

const jobs: Job[] = [
  { id: 1, data: "data1" },
  { id: 2, data: "data2" },
  { id: 3, data: "data3" },
  { id: 4, data: "data4" },
];

setTimeout(() => {
  const batchProcess = Effect.gen(function* () {
    console.log("\n--- Batch Processing with Concurrency ---");

    const results = yield* Effect.all(jobs.map(processJob), {
      concurrency: 2,
    });

    return results;
  });

  Effect.runPromise(batchProcess).then((results) =>
    console.log("\nBatch results:", results)
  );
}, 1800);

setTimeout(() => {
  console.log("\n✨ Fibers example complete!");
  console.log("\nKey Takeaways:");
  console.log("- Use Effect.fork to create fibers");
  console.log("- Use Effect.join to wait for fiber completion");
  console.log("- Effect.all runs multiple effects in parallel");
  console.log("- Effect.race returns first completed result");
  console.log("- Fibers can be interrupted safely");
  console.log("- Timeout automatically interrupts long-running tasks");
  console.log("- Control concurrency with concurrency option");
}, 2200);
