import { Effect, TRef, STM } from "effect";

console.log("=== Advanced Example: STM (Software Transactional Memory) ===\n");

console.log("What is STM?");
console.log(
  "STM provides atomic, composable transactions for managing shared state."
);
console.log(
  "Transactions are automatically retried on conflicts, ensuring consistency.\n"
);

console.log("1. Basic TRef (Transactional Reference)");

const example1 = Effect.gen(function* () {
  const counter = yield* TRef.make(0);

  yield* STM.commit(TRef.update(counter, (n) => n + 1));
  yield* STM.commit(TRef.update(counter, (n) => n + 1));

  const value = yield* STM.commit(TRef.get(counter));

  console.log("Counter value:", value);
});

Effect.runPromise(example1);

console.log("\n2. Atomic Transactions");

setTimeout(() => {
  const example2 = Effect.gen(function* () {
    const ref1 = yield* TRef.make(100);
    const ref2 = yield* TRef.make(50);

    yield* STM.commit(
      STM.gen(function* () {
        const val1 = yield* TRef.get(ref1);
        const val2 = yield* TRef.get(ref2);

        yield* TRef.set(ref1, val1 - 30);
        yield* TRef.set(ref2, val2 + 30);
      })
    );

    const newVal1 = yield* STM.commit(TRef.get(ref1));
    const newVal2 = yield* STM.commit(TRef.get(ref2));

    console.log("\nAtomic transfer:");
    console.log("Ref1:", newVal1);
    console.log("Ref2:", newVal2);
  });

  Effect.runPromise(example2);
}, 100);

console.log("\n3. Bank Account Transfer (Classic STM Example)");

type Account = {
  balance: TRef.TRef<number>;
  name: string;
};

const createAccount = (name: string, initialBalance: number) =>
  Effect.gen(function* () {
    const balance = yield* TRef.make(initialBalance);
    return { balance, name };
  });

const transfer = (from: Account, to: Account, amount: number) =>
  STM.gen(function* () {
    const fromBalance = yield* TRef.get(from.balance);
    const toBalance = yield* TRef.get(to.balance);

    if (fromBalance < amount) {
      yield* STM.die("Insufficient funds");
    }

    yield* TRef.set(from.balance, fromBalance - amount);
    yield* TRef.set(to.balance, toBalance + amount);
  });

setTimeout(() => {
  const bankExample = Effect.gen(function* () {
    console.log("\n--- Bank Transfer Example ---");

    const alice = yield* createAccount("Alice", 1000);
    const bob = yield* createAccount("Bob", 500);

    console.log("Before transfer:");
    console.log("Alice:", yield* STM.commit(TRef.get(alice.balance)));
    console.log("Bob:", yield* STM.commit(TRef.get(bob.balance)));

    yield* STM.commit(transfer(alice, bob, 200));

    console.log("\nAfter transfer:");
    console.log("Alice:", yield* STM.commit(TRef.get(alice.balance)));
    console.log("Bob:", yield* STM.commit(TRef.get(bob.balance)));
  });

  Effect.runPromise(bankExample);
}, 200);

console.log("\n4. STM with Retry");

setTimeout(() => {
  const retryExample = Effect.gen(function* () {
    console.log("\n--- STM Retry Example ---");

    const flag = yield* TRef.make(false);

    setTimeout(() => {
      Effect.runPromise(
        Effect.gen(function* () {
          yield* Effect.sleep("200 millis");
          yield* STM.commit(TRef.set(flag, true));
          console.log("Flag set to true");
        })
      );
    }, 100);

    const waitForFlag = STM.gen(function* () {
      const value = yield* TRef.get(flag);
      if (!value) {
        yield* STM.retry;
      }
      return value;
    });

    console.log("Waiting for flag...");
    const result = yield* STM.commit(waitForFlag);
    console.log("Flag is now:", result);
  });

  Effect.runPromise(retryExample);
}, 400);

console.log("\n5. Composing Transactions");

setTimeout(() => {
  const composeExample = Effect.gen(function* () {
    console.log("\n--- Composing Transactions ---");

    const counter1 = yield* TRef.make(0);
    const counter2 = yield* TRef.make(0);

    const incrementBoth = STM.gen(function* () {
      yield* TRef.update(counter1, (n) => n + 1);
      yield* TRef.update(counter2, (n) => n + 2);
    });

    yield* STM.commit(incrementBoth);
    yield* STM.commit(incrementBoth);

    const val1 = yield* STM.commit(TRef.get(counter1));
    const val2 = yield* STM.commit(TRef.get(counter2));

    console.log("Counter1:", val1);
    console.log("Counter2:", val2);
  });

  Effect.runPromise(composeExample);
}, 800);

console.log("\n6. TArray (Transactional Array)");

setTimeout(() => {
  console.log("\nNote: TArray is available but simplified example shown");
}, 900);

console.log("\n7. Conditional Transactions");

setTimeout(() => {
  const conditionalExample = Effect.gen(function* () {
    console.log("\n--- Conditional Transactions ---");

    const stock = yield* TRef.make(10);
    const orders = yield* TRef.make(0);

    const placeOrder = (quantity: number) =>
      STM.gen(function* () {
        const available = yield* TRef.get(stock);

        if (available >= quantity) {
          yield* TRef.update(stock, (n) => n - quantity);
          yield* TRef.update(orders, (n) => n + 1);
          return "Order placed";
        } else {
          return "Out of stock";
        }
      });

    const result1 = yield* STM.commit(placeOrder(5));
    const result2 = yield* STM.commit(placeOrder(8));

    console.log("First order:", result1);
    console.log("Second order:", result2);
    console.log(
      "Remaining stock:",
      yield* STM.commit(TRef.get(stock))
    );
  });

  Effect.runPromise(conditionalExample);
}, 1000);

console.log("\n8. Multi-Variable Coordination");

setTimeout(() => {
  const coordinationExample = Effect.gen(function* () {
    console.log("\n--- Multi-Variable Coordination ---");

    const producer = yield* TRef.make(0);
    const consumer = yield* TRef.make(0);
    const buffer = yield* TRef.make<number[]>([]);

    const produce = (item: number) =>
      STM.gen(function* () {
        yield* TRef.update(buffer, (items) => [...items, item]);
        yield* TRef.update(producer, (n) => n + 1);
      });

    const consume = STM.gen(function* () {
      const items = yield* TRef.get(buffer);
      if (items.length === 0) {
        return yield* STM.retry;
      }
      const [first, ...rest] = items;
      yield* TRef.set(buffer, rest);
      yield* TRef.update(consumer, (n) => n + 1);
      return first;
    });

    yield* STM.commit(produce(1));
    yield* STM.commit(produce(2));
    yield* STM.commit(produce(3));

    const item1 = yield* STM.commit(consume);
    const item2 = yield* STM.commit(consume);

    console.log("Consumed:", item1, item2);
    console.log(
      "Produced:",
      yield* STM.commit(TRef.get(producer))
    );
    console.log(
      "Consumed:",
      yield* STM.commit(TRef.get(consumer))
    );
  });

  Effect.runPromise(coordinationExample);
}, 1200);

console.log("\n9. Error Handling in STM");

setTimeout(() => {
  const errorExample = Effect.gen(function* () {
    console.log("\n--- STM Error Handling ---");

    const balance = yield* TRef.make(100);

    const withdraw = (amount: number) =>
      STM.gen(function* () {
        const current = yield* TRef.get(balance);
        if (current < amount) {
          return yield* STM.fail("Insufficient balance");
        }
        yield* TRef.set(balance, current - amount);
        return current - amount;
      });

    const result = yield* Effect.either(STM.commit(withdraw(150)));

    if (result._tag === "Left") {
      console.log("Error:", result.left);
    } else {
      console.log("Success:", result.right);
    }
  });

  Effect.runPromise(errorExample);
}, 1400);

console.log("\n10. Real-World Example: Inventory Management");

type Product = {
  id: number;
  stock: TRef.TRef<number>;
  reserved: TRef.TRef<number>;
};

const createProduct = (id: number, initialStock: number) =>
  Effect.gen(function* () {
    const stock = yield* TRef.make(initialStock);
    const reserved = yield* TRef.make(0);
    return { id, stock, reserved };
  });

const reserveProduct = (product: Product, quantity: number) =>
  STM.gen(function* () {
    const available = yield* TRef.get(product.stock);
    const currentReserved = yield* TRef.get(product.reserved);

    if (available < quantity) {
      return yield* STM.fail("Not enough stock");
    }

    yield* TRef.set(product.stock, available - quantity);
    yield* TRef.set(product.reserved, currentReserved + quantity);

    return "Reserved";
  });

const confirmReservation = (product: Product, quantity: number) =>
  STM.gen(function* () {
    const currentReserved = yield* TRef.get(product.reserved);

    if (currentReserved < quantity) {
      return yield* STM.fail("Not enough reserved");
    }

    yield* TRef.set(product.reserved, currentReserved - quantity);
    return "Confirmed";
  });

setTimeout(() => {
  const inventoryExample = Effect.gen(function* () {
    console.log("\n--- Inventory Management Example ---");

    const laptop = yield* createProduct(1, 10);

    console.log("Initial stock:", yield* STM.commit(TRef.get(laptop.stock)));

    yield* STM.commit(reserveProduct(laptop, 3));
    console.log(
      "After reservation - Stock:",
      yield* STM.commit(TRef.get(laptop.stock)),
      "Reserved:",
      yield* STM.commit(TRef.get(laptop.reserved))
    );

    yield* STM.commit(confirmReservation(laptop, 3));
    console.log(
      "After confirmation - Reserved:",
      yield* STM.commit(TRef.get(laptop.reserved))
    );
  });

  Effect.runPromise(inventoryExample);
}, 1600);

setTimeout(() => {
  console.log("\n✨ STM example complete!");
  console.log("\nKey Takeaways:");
  console.log("- STM provides atomic, composable transactions");
  console.log("- TRef.make creates transactional references");
  console.log("- STM.commit executes transactions");
  console.log("- STM.retry waits until conditions are met");
  console.log("- All operations in a transaction are atomic");
  console.log("- Failed transactions are automatically rolled back");
  console.log("- Great for coordinating shared state safely");
}, 1900);
