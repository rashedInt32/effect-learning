import { Schema } from "effect";

console.log("=== Data Modeling & Schema Solutions ===\n");

console.log("Solutions 1-3: Basic Schema & Validation");

const PersonSchema = Schema.Struct({
  name: Schema.String,
  age: Schema.Number,
});

const validPerson = { name: "Alice", age: 30 };
const parsed = Schema.decodeUnknownSync(PersonSchema)(validPerson);
console.log("Parsed:", parsed, "✓");

const invalidPerson = { name: "Bob", age: "thirty" };
try {
  Schema.decodeUnknownSync(PersonSchema)(invalidPerson);
  console.log("Should have thrown!");
} catch (error) {
  console.log("Caught validation error ✓");
}
console.log();

console.log("Solution 4: Branded Types");

type UserId = number & Schema.Brand<"UserId">;
const UserIdSchema = Schema.Number.pipe(Schema.brand("UserId"));

type Email = string & Schema.Brand<"Email">;
const EmailSchema = Schema.String.pipe(Schema.brand("Email"));

const userId = Schema.decodeUnknownSync(UserIdSchema)(42);
const email = Schema.decodeUnknownSync(EmailSchema)("test@example.com");

console.log("UserId:", userId, "✓");
console.log("Email:", email, "✓");
console.log();

console.log("Solution 5: Schema.Class");

class User extends Schema.Class<User>("User")({
  id: UserIdSchema,
  name: Schema.String,
  email: EmailSchema,
}) {}

const user = new User({
  id: Schema.decodeUnknownSync(UserIdSchema)(1),
  name: "Alice",
  email: Schema.decodeUnknownSync(EmailSchema)("alice@example.com"),
});

console.log("User:", user.name, "✓");
console.log();

console.log("Solution 6: Literal Types for Status");

const OrderStatusSchema = Schema.Literal("pending", "shipped", "delivered");

const validStatus = Schema.decodeUnknownSync(OrderStatusSchema)("pending");
console.log("Valid status:", validStatus, "✓");

try {
  Schema.decodeUnknownSync(OrderStatusSchema)("invalid");
} catch {
  console.log("Invalid status rejected ✓");
}
console.log();

console.log("Solution 7: Optional and Default Values");

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

console.log("Product:", product1.name, "- InStock:", product1.inStock, "✓");
console.log();

console.log("Solution 8: Tagged Unions");

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

console.log("Payment type:", payment._tag, "✓");

if (payment._tag === "PayPal") {
  console.log("PayPal email:", payment.email, "✓");
}
console.log();

console.log("Solution 9: Encoding/Decoding");

const DateStringSchema = Schema.transform(Schema.String, Schema.Date, {
  strict: true,
  decode: (s) => new Date(s),
  encode: (d) => d.toISOString(),
});

const now = new Date("2024-01-01T12:00:00Z");
const encoded = Schema.encodeSync(DateStringSchema)(now);
const decoded = Schema.decodeUnknownSync(DateStringSchema)(encoded);

console.log("Encoded:", encoded, "✓");
console.log("Decoded matches:", decoded.getTime() === now.getTime(), "✓");
console.log();

console.log("Solution 10: Expert - Complex Nested Schema");

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
  createdAt: "2024-01-01T12:00:00Z",
};

const parsedOrder = Schema.decodeUnknownSync(OrderSchema)(sampleOrder);

console.log("Order ID:", parsedOrder.id, "✓");
console.log("User:", parsedOrder.user.name, "✓");
console.log("Products:", parsedOrder.products.length, "✓");
console.log("Payment:", parsedOrder.payment._tag, "✓");
console.log("Status:", parsedOrder.status, "✓");
console.log();

console.log("Advanced: Pattern Matching on Payment");
const processPayment = (payment: typeof parsedOrder.payment) => {
  switch (payment._tag) {
    case "CreditCard":
      return `Processing credit card ending in ${payment.cardNumber.slice(-4)}`;
    case "PayPal":
      return `Processing PayPal payment for ${payment.email}`;
    case "Cash":
      return `Processing cash payment of $${payment.amount}`;
  }
};

console.log(processPayment(parsedOrder.payment), "✓");
console.log();

console.log("🎉 All data modeling solutions complete!");
