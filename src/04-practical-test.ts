import { Data, pipe, Effect, Option } from "effect";

console.log("=== PRACTICAL: User Registration System ===\n");

type User = {
  id: number;
  email: string;
  name: string;
  age: number;
};

const inMemoryDB: User[] = [
  { id: 1, email: "alice@example.com", name: "Alice", age: 30 },
];

class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string;
  readonly message: string;
}> {}

class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly message: string;
}> {}

const validateEmail = (
  email: string,
): Effect.Effect<string, ValidationError> => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email)
    ? Effect.succeed(email)
    : Effect.fail(
        new ValidationError({
          field: "email",
          message: "Invalid email format",
        }),
      );
};

const validateAge = (age: number): Effect.Effect<number, ValidationError> =>
  age >= 18 && age <= 120
    ? Effect.succeed(age)
    : Effect.fail(
        new ValidationError({
          field: "age",
          message: "Age must be between 18 and 120",
        }),
      );

const validateName = (name: string): Effect.Effect<string, ValidationError> =>
  name.length >= 2
    ? Effect.succeed(name)
    : Effect.fail(
        new ValidationError({
          field: "name",
          message: "Name must be at least 2 characters",
        }),
      );

const checkEmailExists = (
  email: string,
): Effect.Effect<boolean, DatabaseError> =>
  Effect.sync(() => inMemoryDB.some((u) => u.email === email));
