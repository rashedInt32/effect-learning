import { Effect } from "effect";
import { yieldNowWith } from "effect/Micro";

console.log("=== Effect.gen Challenges ===\n");

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
  constructor(
    readonly required: number,
    readonly available: number,
  ) {}
}

class OrderNotFoundError {
  readonly _tag = "OrderNotFoundError";
  constructor(readonly orderId: number) {}
}

console.log("Challenge 1: Basic Effect.gen");
console.log("Task: Use Effect.gen to add two numbers and return the result.\n");

function addNumbers(a: number, b: number): Effect.Effect<number, never, never> {
  return Effect.gen(function* () {
    return a + b;
  });
}

Effect.runPromise(addNumbers(5, 10)).then(console.log);
console.log("Expected: 15\n");

console.log("Challenge 2: Sequential Operations");
console.log(
  "Task: Use Effect.gen to: fetch user, log their name, return their balance.\n",
);

function getUserEffect(
  userId: number,
): Effect.Effect<User, UserNotFoundError, never> {
  const user = users.find((u) => u.id === userId);
  return user
    ? Effect.succeed(user)
    : Effect.fail(new UserNotFoundError(userId));
}

function getUserBalance(
  userId: number,
): Effect.Effect<number, UserNotFoundError, never> {
  return Effect.gen(function* () {
    const user = yield* getUserEffect(userId);
    yield* Effect.log(user.name);
    return user.accountBalance;
  });
}

Effect.runPromise(getUserBalance(1)).then(console.log);
console.log("Expected: Logs 'Alice' then returns 1000\n");

console.log("Challenge 3: Multiple Sequential Effects");
console.log(
  "Task: Get user, get their order, calculate order total with tax (10%). Use Effect.gen.\n",
);

function getOrderEffect(
  orderId: number,
): Effect.Effect<Order, OrderNotFoundError, never> {
  const order = orders.find((o) => o.id === orderId);
  return order
    ? Effect.succeed(order)
    : Effect.fail(new OrderNotFoundError(orderId));
}

function getOrderTotalWithTax(
  orderId: number,
): Effect.Effect<number, OrderNotFoundError, never> {
  return Effect.gen(function* () {
    const order = yield* getOrderEffect(orderId);
    const total = order.amount * 1.1;
    return total;
  });
}

Effect.runPromise(getOrderTotalWithTax(101)).then(console.log);
console.log("Expected: 220\n");

console.log("Challenge 4: Error Handling in Effect.gen");
console.log(
  "Task: Process payment - check if user has enough balance, deduct amount, return new balance.\n",
);

function processPayment(
  userId: number,
  amount: number,
): Effect.Effect<number, UserNotFoundError | InsufficientFundsError, never> {
  return Effect.gen(function* () {
    const user = yield* getUserEffect(userId);
    if (user.accountBalance < amount) {
      return yield* Effect.fail(
        new InsufficientFundsError(amount, user.accountBalance),
      );
    }

    const updatedbalance = user.accountBalance - amount;
    user.accountBalance = updatedbalance;
    return updatedbalance;
  });
}

Effect.runPromise(processPayment(1, 300)).then((balance) =>
  console.log("New balance:", balance),
);
Effect.runPromise(processPayment(2, 600)).catch((err) =>
  console.log("Error:", err._tag),
);
console.log("Expected: New balance: 700, then Error: InsufficientFundsError\n");

console.log("Challenge 5: Conditional Logic");
console.log(
  "Task: Apply discount: if balance > 500, give 10% off, else 5% off. Use Effect.gen.\n",
);

function calculateDiscountedPrice(
  userId: number,
  price: number,
): Effect.Effect<number, UserNotFoundError, never> {
  return Effect.succeed(0);
}

Effect.runPromise(calculateDiscountedPrice(1, 100)).then(console.log);
Effect.runPromise(calculateDiscountedPrice(2, 100)).then(console.log);
console.log("Expected: 90, then 95\n");

console.log("Challenge 6: Side Effects with Effect.tap");
console.log(
  "Task: Get user, log 'Processing...', return user email. Use tap for logging.\n",
);

function getUserEmailWithLogging(
  userId: number,
): Effect.Effect<string, UserNotFoundError, never> {
  return Effect.succeed("");
}

Effect.runPromise(getUserEmailWithLogging(1)).then(console.log);
console.log("Expected: Logs 'Processing...' then returns alice@example.com\n");

console.log("Challenge 7: Parallel Effects");
console.log(
  "Task: Fetch two users in parallel, return sum of their balances. Use Effect.all.\n",
);

function getTotalBalance(
  userId1: number,
  userId2: number,
): Effect.Effect<number, UserNotFoundError, never> {
  return Effect.succeed(0);
}

Effect.runPromise(getTotalBalance(1, 2)).then(console.log);
console.log("Expected: 1500\n");

console.log("Challenge 8: Error Recovery in Effect.gen");
console.log(
  "Task: Try to get user, if fails, create guest user with balance 0.\n",
);

const guestUser: User = {
  id: 0,
  name: "Guest",
  email: "guest@example.com",
  accountBalance: 0,
};

function getUserOrGuest(userId: number): Effect.Effect<User, never, never> {
  return Effect.succeed(guestUser);
}

Effect.runPromise(getUserOrGuest(999)).then((u) => console.log(u.name));
console.log("Expected: Guest\n");

console.log("Challenge 9: Advanced - Transaction Simulation");
console.log(
  "Task: Transfer money between users: deduct from sender, add to receiver, return both new balances.\n",
);

function transferMoney(
  fromUserId: number,
  toUserId: number,
  amount: number,
): Effect.Effect<
  { senderBalance: number; receiverBalance: number },
  UserNotFoundError | InsufficientFundsError,
  never
> {
  return Effect.succeed({ senderBalance: 0, receiverBalance: 0 });
}

Effect.runPromise(transferMoney(1, 2, 200)).then(console.log);
console.log("Expected: { senderBalance: 800, receiverBalance: 700 }\n");

console.log("Challenge 10: Expert - Retry with Timeout");
console.log(
  "Task: Simulate API call that fails 2 times then succeeds. Add retry logic and timeout.\n",
);

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

console.log(
  "Hint: Use Effect.retry and Effect.timeout inside Effect.gen. Import Schedule for retry.\n",
);

console.log("\n✨ Run the solution file to see the answers!");
