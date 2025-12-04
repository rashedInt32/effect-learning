import { Effect, Stream, pipe } from "effect";

console.log("=== Advanced Example: Streams ===\n");

console.log("1. Basic Stream Creation and Consumption");

const numbersStream = Stream.range(1, 5);

const printNumbers = pipe(
  numbersStream,
  Stream.runForEach((n) => Effect.sync(() => console.log("Number:", n)))
);

Effect.runPromise(printNumbers);

console.log("\n2. Stream Transformation");

const transformedStream = pipe(
  Stream.range(1, 10),
  Stream.filter((n) => n % 2 === 0),
  Stream.map((n) => n * 2),
  Stream.take(3)
);

setTimeout(() => {
  pipe(
    transformedStream,
    Stream.runCollect,
    Effect.map((chunk) => Array.from(chunk)),
    Effect.runPromise
  ).then((result) => console.log("\nFiltered & mapped:", result));
}, 100);

console.log("\n3. Stream from Array");

const users = ["Alice", "Bob", "Charlie"];
const userStream = Stream.fromIterable(users);

setTimeout(() => {
  pipe(
    userStream,
    Stream.map((name) => ({ name, email: `${name.toLowerCase()}@example.com` })),
    Stream.runCollect,
    Effect.map((chunk) => Array.from(chunk)),
    Effect.runPromise
  ).then((result) => console.log("\nUsers:", result));
}, 200);

console.log("\n4. Stream with Effects");

const fetchUser = (id: number) =>
  Effect.sync(() => {
    console.log(`Fetching user ${id}...`);
    return { id, name: `User${id}` };
  });

const userIds = Stream.range(1, 3);

setTimeout(() => {
  pipe(
    userIds,
    Stream.mapEffect((id) => fetchUser(id)),
    Stream.runCollect,
    Effect.map((chunk) => Array.from(chunk)),
    Effect.runPromise
  ).then((result) => console.log("\nFetched users:", result));
}, 300);

console.log("\n5. Infinite Stream with Take");

const infiniteNumbers = Stream.iterate(0, (n) => n + 1);

setTimeout(() => {
  pipe(
    infiniteNumbers,
    Stream.take(5),
    Stream.runCollect,
    Effect.map((chunk) => Array.from(chunk)),
    Effect.runPromise
  ).then((result) => console.log("\nFirst 5 from infinite:", result));
}, 400);

console.log("\n6. Stream Grouping");

type User = { name: string; age: number };
const usersWithAge: User[] = [
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
  { name: "Charlie", age: 30 },
  { name: "David", age: 25 },
];

setTimeout(() => {
  // Group users by age and collect into a Map
  const groupedByAge = new Map<number, User[]>();
  usersWithAge.forEach(user => {
    const existing = groupedByAge.get(user.age) || [];
    groupedByAge.set(user.age, [...existing, user]);
  });
  console.log("\nGrouped by age:", Object.fromEntries(groupedByAge));
}, 500);

console.log("\n7. Stream Error Handling");

const riskyStream = pipe(
  Stream.range(1, 5),
  Stream.mapEffect((n) =>
    n === 3
      ? Effect.fail(new Error("Failed at 3"))
      : Effect.succeed(n * 10)
  ),
  Stream.catchAll((error) => Stream.make(`Error: ${error.message}`))
);

setTimeout(() => {
  pipe(
    riskyStream,
    Stream.runCollect,
    Effect.map((chunk) => Array.from(chunk)),
    Effect.runPromise
  ).then((result) => console.log("\nWith error handling:", result));
}, 600);

console.log("\n8. Combining Streams");

const stream1 = Stream.make(1, 2, 3);
const stream2 = Stream.make(4, 5, 6);

setTimeout(() => {
  pipe(
    Stream.mergeAll([stream1, stream2], { concurrency: 2 }),
    Stream.runCollect,
    Effect.map((chunk) => Array.from(chunk)),
    Effect.runPromise
  ).then((result) => console.log("\nMerged streams:", result));
}, 700);

console.log("\n9. Stream Debouncing (simulated)");

const events = Stream.fromIterable([
  "event1",
  "event2",
  "event3",
  "event4",
  "event5",
]);

setTimeout(() => {
  pipe(
    events,
    Stream.take(3),
    Stream.runCollect,
    Effect.map((chunk) => Array.from(chunk)),
    Effect.runPromise
  ).then((result) => console.log("\nDebounced events:", result));
}, 800);

console.log("\n10. Real-World Example: Data Pipeline");

type RawData = { value: string };
type ProcessedData = { value: string; processed: boolean };
type ValidatedData = ProcessedData & { valid: boolean };

const rawDataStream = Stream.fromIterable([
  { value: "data1" },
  { value: "data2" },
  { value: "invalid" },
  { value: "data3" },
]);

const processData = (data: RawData): ProcessedData => ({
  ...data,
  processed: true,
});

const validateData = (data: ProcessedData): ValidatedData => ({
  ...data,
  valid: data.value !== "invalid",
});

setTimeout(() => {
  pipe(
    rawDataStream,
    Stream.map(processData),
    Stream.map(validateData),
    Stream.filter((data) => data.valid),
    Stream.runCollect,
    Effect.map((chunk) => Array.from(chunk)),
    Effect.runPromise
  ).then((result) => console.log("\nProcessed pipeline:", result));
}, 900);

setTimeout(() => {
  console.log("\n✨ Streams example complete!");
  console.log("\nKey Takeaways:");
  console.log("- Streams are lazy and composable");
  console.log("- Use Stream.mapEffect for async operations");
  console.log("- Streams can be infinite (use take to limit)");
  console.log("- Built-in operators: map, filter, take, merge, etc.");
  console.log("- Error handling with catchAll");
}, 1000);
