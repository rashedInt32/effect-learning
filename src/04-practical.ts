import { Effect, Option, pipe } from "effect";

console.log("=== PRACTICAL: User Registration System ===\n");

type User = {
  id: number;
  email: string;
  name: string;
  age: number;
};

class ValidationError {
  readonly _tag = "ValidationError";
  constructor(
    readonly field: string,
    readonly message: string,
  ) {}
}

class DatabaseError {
  readonly _tag = "DatabaseError";
  constructor(readonly message: string) {}
}

const inMemoryDB: User[] = [
  { id: 1, email: "alice@example.com", name: "Alice", age: 30 },
];

const validateEmail = (
  email: string,
): Effect.Effect<string, ValidationError> => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email)
    ? Effect.succeed(email)
    : Effect.fail(new ValidationError("email", "Invalid email format"));
};

const validateAge = (age: number): Effect.Effect<number, ValidationError> => {
  return age >= 18 && age <= 120
    ? Effect.succeed(age)
    : Effect.fail(new ValidationError("age", "Age must be between 18 and 120"));
};

const validateName = (name: string): Effect.Effect<string, ValidationError> => {
  return name.length >= 2
    ? Effect.succeed(name.trim())
    : Effect.fail(
        new ValidationError("name", "Name must be at least 2 characters"),
      );
};

const checkEmailExists = (
  email: string,
): Effect.Effect<boolean, DatabaseError> => {
  return Effect.sync(() => inMemoryDB.some((u) => u.email === email));
};

const createUser = (
  email: string,
  name: string,
  age: number,
): Effect.Effect<User, ValidationError | DatabaseError> => {
  const newUser: User = {
    id: inMemoryDB.length + 1,
    email,
    name,
    age,
  };

  return pipe(
    checkEmailExists(email),
    Effect.flatMap((exists) =>
      exists
        ? Effect.fail(new ValidationError("email", "Email already registered"))
        : Effect.succeed(undefined),
    ),
    Effect.flatMap(() => validateEmail(email)),
    Effect.flatMap(() => validateName(name)),
    Effect.flatMap(() => validateAge(age)),
    Effect.flatMap(() =>
      Effect.sync(() => {
        inMemoryDB.push(newUser);
        return newUser;
      }),
    ),
  );
};

const findUserByEmail = (email: string): Option.Option<User> => {
  return Option.fromNullable(inMemoryDB.find((u) => u.email === email));
};

const registerUser = (email: string, name: string, age: number) =>
  pipe(
    createUser(email, name, age),
    Effect.map((user) => `✓ Registered: ${user.name} (${user.email})`),
    Effect.catchAll((error) => {
      if (error._tag === "ValidationError") {
        return Effect.succeed(
          `✗ Validation failed [${error.field}]: ${error.message}`,
        );
      }
      return Effect.succeed(`✗ Database error: ${error.message}`);
    }),
  );

const getUserInfo = (email: string): string =>
  pipe(
    findUserByEmail(email),
    Option.map((user) => `User: ${user.name}, ${user.age} years old`),
    Option.getOrElse(() => "User not found"),
  );

console.log("Existing user:", getUserInfo("alice@example.com"));
console.log();

Effect.runPromise(registerUser("bob@example.com", "Bob", 25)).then(console.log);
Effect.runPromise(registerUser("invalid-email", "Charlie", 30)).then(
  console.log,
);
Effect.runPromise(registerUser("dave@example.com", "D", 20)).then(console.log);
Effect.runPromise(registerUser("eve@example.com", "Eve", 15)).then(console.log);
Effect.runPromise(registerUser("bob@example.com", "Bob2", 28)).then(
  console.log,
);

setTimeout(() => {
  console.log("\n=== Final Database ===");
  inMemoryDB.forEach((user) => {
    console.log(`- ${user.name} (${user.email}), age ${user.age}`);
  });
}, 100);
