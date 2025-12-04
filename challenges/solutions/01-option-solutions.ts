import { Array, Option, pipe } from "effect";

console.log("=== Option Solutions ===\n");

type User = {
  id: number;
  name: string;
  email: string;
  age?: number;
  address?: {
    street?: string;
    city?: string;
    zipCode?: string;
  };
};

const users: User[] = [
  { id: 1, name: "Alice", email: "alice@example.com", age: 30 },
  { id: 2, name: "Bob", email: "bob@example.com" },
  {
    id: 3,
    name: "Charlie",
    email: "charlie@example.com",
    age: 25,
    address: { city: "New York", zipCode: "10001" },
  },
];

console.log("Solution 1: Find User by ID");
function findUserById(id: number): Option.Option<User> {
  return pipe(
    users,
    Array.findFirst((user) => user.id === id)
  );
}

console.log("Result:", Option.getOrNull(findUserById(1)));
console.log("✓ Correct\n");

console.log("Solution 2: Safe Property Access");
function getUserAge(user: User): number {
  return pipe(Option.fromNullable(user.age), Option.getOrElse(() => 18));
}

console.log("Result:", getUserAge(users[0]));
console.log("Result:", getUserAge(users[1]));
console.log("✓ Correct\n");

console.log("Solution 3: Nested Optional Access");
function getUserCity(user: User): string {
  return pipe(
    Option.fromNullable(user.address),
    Option.flatMap((addr) => Option.fromNullable(addr.city)),
    Option.getOrElse(() => "Unknown")
  );
}

console.log("Result:", getUserCity(users[2]));
console.log("Result:", getUserCity(users[0]));
console.log("✓ Correct\n");

console.log("Solution 4: Transform Optional Values");
function doubleAge(user: User): Option.Option<number> {
  return pipe(
    Option.fromNullable(user.age),
    Option.map((age) => age * 2)
  );
}

console.log("Result:", Option.getOrNull(doubleAge(users[0])));
console.log("Result:", Option.getOrNull(doubleAge(users[1])));
console.log("✓ Correct\n");

console.log("Solution 5: Chain Optional Operations");
function isUserAdult(id: number): Option.Option<boolean> {
  return pipe(
    findUserById(id),
    Option.flatMap((user) => Option.fromNullable(user.age)),
    Option.map((age) => age >= 18)
  );
}

console.log("Result:", Option.getOrNull(isUserAdult(1)));
console.log("Result:", Option.getOrNull(isUserAdult(999)));
console.log("✓ Correct\n");

console.log("Solution 6: Filter Options");
function getUsersWithAge(): User[] {
  return pipe(
    users,
    Array.filter((user) => Option.isSome(Option.fromNullable(user.age)))
  );
}

console.log("Result:", getUsersWithAge().length);
console.log("✓ Correct\n");

console.log("Solution 7: Combine Multiple Options");
function getFullAddress(user: User): Option.Option<string> {
  return pipe(
    Option.fromNullable(user.address),
    Option.flatMap((addr) =>
      pipe(
        Option.all([
          Option.fromNullable(addr.street),
          Option.fromNullable(addr.city),
          Option.fromNullable(addr.zipCode),
        ]),
        Option.map(([street, city, zip]) => `${street}, ${city}, ${zip}`)
      )
    )
  );
}

const userWithFullAddress: User = {
  id: 4,
  name: "David",
  email: "david@example.com",
  address: {
    street: "123 Main St",
    city: "Boston",
    zipCode: "02101",
  },
};

console.log("Result:", Option.getOrNull(getFullAddress(userWithFullAddress)));
console.log("Result:", Option.getOrNull(getFullAddress(users[2])));
console.log("✓ Correct\n");

console.log("Solution 8: Advanced - First Match");
function findFirstUserByNamePrefix(prefix: string): Option.Option<User> {
  return pipe(
    users,
    Array.findFirst((user) => user.name.startsWith(prefix))
  );
}

console.log("Result:", Option.getOrNull(findFirstUserByNamePrefix("B"))?.name);
console.log("Result:", Option.getOrNull(findFirstUserByNamePrefix("Z")));
console.log("✓ Correct\n");

console.log("Solution 9: Advanced - Lift a Function");
function safeDivide(a: number, b: number): Option.Option<number> {
  return b === 0 ? Option.none() : Option.some(a / b);
}

console.log("Result:", Option.getOrNull(safeDivide(10, 2)));
console.log("Result:", Option.getOrNull(safeDivide(10, 0)));
console.log("✓ Correct\n");

console.log("Solution 10: Expert - Parse and Validate");
function parsePositiveNumber(str: string): Option.Option<number> {
  return pipe(
    Option.liftPredicate((s: string) => !isNaN(Number(s)))(str),
    Option.map(Number),
    Option.filter((n) => n > 0)
  );
}

console.log("Result:", Option.getOrNull(parsePositiveNumber("42")));
console.log("Result:", Option.getOrNull(parsePositiveNumber("-5")));
console.log("Result:", Option.getOrNull(parsePositiveNumber("abc")));
console.log("✓ Correct\n");

console.log("🎉 All solutions complete!");
