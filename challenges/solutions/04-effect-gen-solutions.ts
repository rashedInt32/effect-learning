import { Effect, Schedule } from "effect";

console.log("=== Effect.gen Solutions ===\n");

type User = {
  id: number;
  name: string;
  email: string;
  accountBalance: number;
};

type Order = {
  id: number;
  userId: number;
  amount: number;
  status: "pending" | "completed" | "failed";
};

const users: User[] = [
  { id: 1, name: "Alice", email: "alice@example.com", accountBalance: 1000 },
  { id: 2, name: "Bob", email: "bob@example.com", accountBalance: 500 },
];

const orders: Order[] = [
  { id: 101, userId: 1, amount: 200, status: "pending" },
  { id: 102, userId: 2, amount: 600, status: "pending" },
];

class UserNotFoundError {
  readonly _tag = "UserNotFoundError";
  constructor(readonly userId: number) {}
}

class InsufficientFundsError {
  readonly _tag = "InsufficientFundsError";
  constructor(readonly required: number, readonly available: number) {}
}

class OrderNotFoundError {
  readonly _tag = "OrderNotFoundError";
  constructor(readonly orderId: number) {}
}

console.log("Solution 1: Basic Effect.gen");
function addNumbers(a: number, b: number): Effect.Effect<number, never, never> {
  return Effect.gen(function* () {
    const sum = a + b;
    return sum;
  });
}

Effect.runPromise(addNumbers(5, 10)).then((result) =>
  console.log("Result:", result, "✓\n")
);

console.log("Solution 2: Sequential Operations");
function getUserEffect(
  userId: number
): Effect.Effect<User, UserNotFoundError, never> {
  const user = users.find((u) => u.id === userId);
  return user
    ? Effect.succeed(user)
    : Effect.fail(new UserNotFoundError(userId));
}

function getUserBalance(
  userId: number
): Effect.Effect<number, UserNotFoundError, never> {
  return Effect.gen(function* () {
    const user = yield* getUserEffect(userId);
    console.log(user.name);
    return user.accountBalance;
  });
}

setTimeout(() => {
  Effect.runPromise(getUserBalance(1)).then((result) =>
    console.log("Result:", result, "✓\n")
  );
}, 100);

console.log("Solution 3: Multiple Sequential Effects");
function getOrderEffect(
  orderId: number
): Effect.Effect<Order, OrderNotFoundError, never> {
  const order = orders.find((o) => o.id === orderId);
  return order
    ? Effect.succeed(order)
    : Effect.fail(new OrderNotFoundError(orderId));
}

function getOrderTotalWithTax(
  orderId: number
): Effect.Effect<number, OrderNotFoundError, never> {
  return Effect.gen(function* () {
    const order = yield* getOrderEffect(orderId);
    const total = order.amount * 1.1;
    return total;
  });
}

setTimeout(() => {
  Effect.runPromise(getOrderTotalWithTax(101)).then((result) =>
    console.log("Result:", result, "✓\n")
  );
}, 200);

console.log("Solution 4: Error Handling in Effect.gen");
function processPayment(
  userId: number,
  amount: number
): Effect.Effect<number, UserNotFoundError | InsufficientFundsError, never> {
  return Effect.gen(function* () {
    const user = yield* getUserEffect(userId);

    if (user.accountBalance < amount) {
      return yield* Effect.fail(
        new InsufficientFundsError(amount, user.accountBalance)
      );
    }

    const newBalance = user.accountBalance - amount;
    user.accountBalance = newBalance;
    return newBalance;
  });
}

setTimeout(() => {
  Effect.runPromise(processPayment(1, 300)).then((balance) =>
    console.log("New balance:", balance, "✓")
  );
  Effect.runPromise(processPayment(2, 600)).catch((err) =>
    console.log("Error:", err._tag, "✓\n")
  );
}, 300);

console.log("Solution 5: Conditional Logic");
function calculateDiscountedPrice(
  userId: number,
  price: number
): Effect.Effect<number, UserNotFoundError, never> {
  return Effect.gen(function* () {
    const user = yield* getUserEffect(userId);
    const discount = user.accountBalance > 500 ? 0.1 : 0.05;
    return price * (1 - discount);
  });
}

setTimeout(() => {
  Effect.runPromise(calculateDiscountedPrice(1, 100)).then((result) =>
    console.log("Result:", result, "✓")
  );
  Effect.runPromise(calculateDiscountedPrice(2, 100)).then((result) =>
    console.log("Result:", result, "✓\n")
  );
}, 400);

console.log("Solution 6: Side Effects with Effect.tap");
function getUserEmailWithLogging(
  userId: number
): Effect.Effect<string, UserNotFoundError, never> {
  return Effect.gen(function* () {
    const user = yield* getUserEffect(userId);
    yield* Effect.sync(() => console.log("Processing..."));
    return user.email;
  });
}

setTimeout(() => {
  Effect.runPromise(getUserEmailWithLogging(1)).then((result) =>
    console.log("Result:", result, "✓\n")
  );
}, 500);

console.log("Solution 7: Parallel Effects");
function getTotalBalance(
  userId1: number,
  userId2: number
): Effect.Effect<number, UserNotFoundError, never> {
  return Effect.gen(function* () {
    const [user1, user2] = yield* Effect.all([
      getUserEffect(userId1),
      getUserEffect(userId2),
    ]);
    return user1.accountBalance + user2.accountBalance;
  });
}

setTimeout(() => {
  Effect.runPromise(getTotalBalance(1, 2)).then((result) =>
    console.log("Result:", result, "✓\n")
  );
}, 600);

console.log("Solution 8: Error Recovery in Effect.gen");
const guestUser: User = {
  id: 0,
  name: "Guest",
  email: "guest@example.com",
  accountBalance: 0,
};

function getUserOrGuest(userId: number): Effect.Effect<User, never, never> {
  return Effect.gen(function* () {
    const result = yield* Effect.either(getUserEffect(userId));
    if (result._tag === "Left") {
      return guestUser;
    }
    return result.right;
  });
}

setTimeout(() => {
  Effect.runPromise(getUserOrGuest(999)).then((u) =>
    console.log("Result:", u.name, "✓\n")
  );
}, 700);

console.log("Solution 9: Advanced - Transaction Simulation");
function transferMoney(
  fromUserId: number,
  toUserId: number,
  amount: number
): Effect.Effect<
  { senderBalance: number; receiverBalance: number },
  UserNotFoundError | InsufficientFundsError,
  never
> {
  return Effect.gen(function* () {
    const sender = yield* getUserEffect(fromUserId);
    const receiver = yield* getUserEffect(toUserId);

    if (sender.accountBalance < amount) {
      return yield* Effect.fail(
        new InsufficientFundsError(amount, sender.accountBalance)
      );
    }

    sender.accountBalance -= amount;
    receiver.accountBalance += amount;

    return {
      senderBalance: sender.accountBalance,
      receiverBalance: receiver.accountBalance,
    };
  });
}

setTimeout(() => {
  Effect.runPromise(transferMoney(1, 2, 200)).then((result) =>
    console.log("Result:", result, "✓\n")
  );
}, 800);

console.log("Solution 10: Expert - Retry with Timeout");
let attemptCount = 0;
function unreliableApi(): Effect.Effect<string, Error, never> {
  return Effect.sync(() => {
    attemptCount++;
    if (attemptCount < 3) {
      throw new Error(`Attempt ${attemptCount} failed`);
    }
    return "Success";
  });
}

const withRetryAndTimeout = Effect.gen(function* () {
  const result = yield* Effect.retry(
    unreliableApi(),
    Schedule.recurs(3)
  );
  return result;
});

setTimeout(() => {
  attemptCount = 0;
  Effect.runPromise(withRetryAndTimeout).then((result) =>
    console.log("Result:", result, "✓")
  );
}, 900);

setTimeout(() => {
  console.log("\n🎉 All solutions complete!");
}, 1000);
