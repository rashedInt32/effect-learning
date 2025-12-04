import { Schema } from "effect";

console.log("=== Data Modeling & Schema Challenges ===\n");

console.log("Challenge 1: Basic Schema Definition");
console.log("Task: Create a Person schema with name (string) and age (number).\n");

const PersonSchema = Schema.Struct({
  name: Schema.String,
  age: Schema.Number,
});

console.log("✓ Schema defined\n");

console.log("Challenge 2: Parse Valid Data");
console.log("Task: Parse a valid person object using Schema.decodeUnknownSync.\n");

const validPerson = { name: "Alice", age: 30 };
const parsed = Schema.decodeUnknownSync(PersonSchema)(validPerson);
console.log("Parsed:", parsed);
console.log("✓\n");

console.log("Challenge 3: Handle Invalid Data");
console.log("Task: Try parsing invalid data and catch the error.\n");

const invalidPerson = { name: "Bob", age: "thirty" };

try {
  Schema.decodeUnknownSync(PersonSchema)(invalidPerson);
  console.log("Should have thrown!");
} catch (error) {
  console.log("Caught validation error ✓");
}
console.log();

console.log("Challenge 4: Branded Types");
console.log(
  "Task: Create UserId and Email branded types to prevent mixing them.\n"
);

type UserId = number & Schema.Brand<"UserId">;
const UserIdSchema = Schema.Number.pipe(Schema.brand("UserId"));

type Email = string & Schema.Brand<"Email">;
const EmailSchema = Schema.String.pipe(Schema.brand("Email"));

const userId = Schema.decodeUnknownSync(UserIdSchema)(42);
const email = Schema.decodeUnknownSync(EmailSchema)("test@example.com");

console.log("UserId:", userId);
console.log("Email:", email);
console.log("✓\n");

console.log("Challenge 5: Schema.Class");
console.log("Task: Create a User class with id, name, and email fields.\n");

class User extends Schema.Class<User>("User")({
  id: UserIdSchema,
  name: Schema.String,
  email: EmailSchema,
}) {}

console.log("✓ Class created\n");

console.log("Challenge 6: Literal Types for Status");
console.log(
  "Task: Create an OrderStatus schema that only accepts 'pending', 'shipped', or 'delivered'.\n"
);

const OrderStatusSchema = Schema.Literal("pending", "shipped", "delivered");

const validStatus = Schema.decodeUnknownSync(OrderStatusSchema)("pending");
console.log("Valid status:", validStatus, "✓");

try {
  Schema.decodeUnknownSync(OrderStatusSchema)("invalid");
  console.log("Should have thrown!");
} catch {
  console.log("Invalid status rejected ✓");
}
console.log();

console.log("Challenge 7: Optional and Default Values");
console.log(
  "Task: Create a Product schema with optional description and default inStock = true.\n"
);

const ProductSchema = Schema.Struct({
  name: Schema.String,
  price: Schema.Number,
  description: Schema.optional(Schema.String),
  inStock: Schema.propertySignature(Schema.Boolean).pipe(
    Schema.withConstructorDefault(() => true)
  ),
});

const product1 = Schema.decodeUnknownSync(ProductSchema)({
  name: "Laptop",
  price: 1200,
});
console.log("Product:", product1);
console.log("✓\n");

console.log("Challenge 8: Tagged Unions (Discriminated Unions)");
console.log("Task: Create Payment types: CreditCard | PayPal | Cash.\n");

class CreditCard extends Schema.TaggedClass<CreditCard>()("CreditCard", {
  cardNumber: Schema.String,
  cvv: Schema.String,
}) {}

class PayPal extends Schema.TaggedClass<PayPal>()("PayPal", {
  email: Schema.String,
}) {}

class Cash extends Schema.TaggedClass<Cash>()("Cash", {
  amount: Schema.Number,
}) {}

const PaymentSchema = Schema.Union(CreditCard, PayPal, Cash);

const payment = Schema.decodeUnknownSync(PaymentSchema)({
  _tag: "PayPal",
  email: "user@paypal.com",
});

console.log("Payment:", payment);
console.log("✓\n");

console.log("Challenge 9: Encoding/Decoding");
console.log("Task: Create a DateString schema that encodes Date to ISO string.\n");

const DateStringSchema = Schema.transform(
  Schema.String,
  Schema.Date,
  {
    strict: true,
    decode: (s) => new Date(s),
    encode: (d) => d.toISOString(),
  }
);

const now = new Date();
const encoded = Schema.encodeSync(DateStringSchema)(now);
const decoded = Schema.decodeUnknownSync(DateStringSchema)(encoded);

console.log("Original:", now);
console.log("Encoded:", encoded);
console.log("Decoded:", decoded);
console.log("✓\n");

console.log("Challenge 10: Expert - Complex Nested Schema");
console.log(
  "Task: Create an Order schema with User, Product array, Payment method, and status.\n"
);

const OrderSchema = Schema.Struct({
  id: Schema.Number,
  user: User,
  products: Schema.Array(ProductSchema),
  payment: PaymentSchema,
  status: OrderStatusSchema,
  createdAt: DateStringSchema,
});

const sampleOrder = {
  id: 1,
  user: {
    id: 42,
    name: "Alice",
    email: "alice@example.com",
  },
  products: [
    { name: "Laptop", price: 1200 },
    { name: "Mouse", price: 25, description: "Wireless" },
  ],
  payment: {
    _tag: "CreditCard",
    cardNumber: "1234-5678",
    cvv: "123",
  },
  status: "pending",
  createdAt: new Date().toISOString(),
};

const parsedOrder = Schema.decodeUnknownSync(OrderSchema)(sampleOrder);
console.log("Order ID:", parsedOrder.id);
console.log("User:", parsedOrder.user.name);
console.log("Products:", parsedOrder.products.length);
console.log("✓\n");

console.log("🎉 All data modeling challenges complete!");
console.log("\n✨ Run the solution file for detailed implementations!");
