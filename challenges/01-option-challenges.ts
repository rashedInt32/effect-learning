import { Array, Option, pipe } from "effect";

console.log("=== Option Challenges ===\n");

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

console.log("Challenge 1: Find User by ID");
console.log(
  "Task: Implement findUserById that returns Option<User>. Return None if not found.\n",
);

function findUserById(id: number): Option.Option<User> {
  return pipe(
    users,
    Array.findFirst((user) => user.id === id),
  );
}

console.log("Test:", Option.getOrNull(findUserById(1)));
console.log("Expected: { id: 1, name: 'Alice', ... }\n");

console.log("Challenge 2: Safe Property Access");
console.log(
  "Task: Get user's age with default value of 18 if age is undefined.\n",
);

function getUserAge(user: User): number {
  return pipe(
    Option.fromNullable(user.age),
    Option.getOrElse(() => 18),
  );
}

console.log("Test:", getUserAge(users[0]));
console.log("Expected: 30");
console.log("Test:", getUserAge(users[1]));
console.log("Expected: 18\n");

console.log("Challenge 3: Nested Optional Access");
console.log(
  "Task: Get user's city, return 'Unknown' if not available. Handle nested optionals.\n",
);

function getUserCity(user: User): string {
  return pipe(
    Option.fromNullable(user.address),
    Option.flatMap((a) => Option.fromNullable(a.city)),
    Option.getOrElse(() => "Unknown"),
  );
}

console.log("Test:", getUserCity(users[2]));
console.log("Expected: New York");
console.log("Test:", getUserCity(users[0]));
console.log("Expected: Unknown\n");

console.log("Challenge 4: Transform Optional Values");
console.log(
  "Task: Double the user's age if it exists, otherwise return None.\n",
);

function doubleAge(user: User): Option.Option<number> {
  return pipe(
    Option.fromNullable(user.age),
    Option.map((age) => age * 2),
  );
}

console.log("Test:", Option.getOrNull(doubleAge(users[0])));
console.log("Expected: 60");
console.log("Test:", Option.getOrNull(doubleAge(users[1])));
console.log("Expected: null\n");

console.log("Challenge 5: Chain Optional Operations");
console.log(
  "Task: Find user by ID, get their age, check if adult (>=18). Return Option<boolean>.\n",
);

function isUserAdult(id: number): Option.Option<boolean> {
  return Option.none();
}

console.log("Test:", Option.getOrNull(isUserAdult(1)));
console.log("Expected: true");
console.log("Test:", Option.getOrNull(isUserAdult(999)));
console.log("Expected: null\n");

console.log("Challenge 6: Filter Options");
console.log("Task: Get all users who have an age defined. Return User[].\n");

function getUsersWithAge(): User[] {
  return [];
}

console.log("Test:", getUsersWithAge().length);
console.log("Expected: 2\n");

console.log("Challenge 7: Combine Multiple Options");
console.log(
  "Task: Create a formatted address string only if ALL parts exist (street, city, zipCode).\n",
);

function getFullAddress(user: User): Option.Option<string> {
  return Option.none();
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

console.log("Test:", Option.getOrNull(getFullAddress(userWithFullAddress)));
console.log("Expected: 123 Main St, Boston, 02101");
console.log("Test:", Option.getOrNull(getFullAddress(users[2])));
console.log("Expected: null\n");

console.log("Challenge 8: Advanced - First Match");
console.log(
  "Task: Find the first user whose name starts with a given letter. Use Option.firstSomeOf or similar.\n",
);

function findFirstUserByNamePrefix(prefix: string): Option.Option<User> {
  return Option.none();
}

console.log("Test:", Option.getOrNull(findFirstUserByNamePrefix("B"))?.name);
console.log("Expected: Bob");
console.log("Test:", Option.getOrNull(findFirstUserByNamePrefix("Z")));
console.log("Expected: null\n");

console.log("Challenge 9: Advanced - Lift a Function");
console.log(
  "Task: Create a safe division function that returns None for division by zero.\n",
);

function safeDivide(a: number, b: number): Option.Option<number> {
  return Option.none();
}

console.log("Test:", Option.getOrNull(safeDivide(10, 2)));
console.log("Expected: 5");
console.log("Test:", Option.getOrNull(safeDivide(10, 0)));
console.log("Expected: null\n");

console.log("Challenge 10: Expert - Parse and Validate");
console.log(
  "Task: Parse a string to number, then check if it's positive. Return Option<number>.\n",
);

function parsePositiveNumber(str: string): Option.Option<number> {
  return Option.none();
}

console.log("Test:", Option.getOrNull(parsePositiveNumber("42")));
console.log("Expected: 42");
console.log("Test:", Option.getOrNull(parsePositiveNumber("-5")));
console.log("Expected: null");
console.log("Test:", Option.getOrNull(parsePositiveNumber("abc")));
console.log("Expected: null\n");

console.log("\n✨ Run the solution file to see the answers!");
