import { pipe, Array, Option, Effect, Order } from "effect";

console.log("=== Pipe Challenges ===\n");

type Product = {
  id: number;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
};

const products: Product[] = [
  {
    id: 1,
    name: "Laptop",
    price: 1200,
    category: "Electronics",
    inStock: true,
  },
  { id: 2, name: "Phone", price: 800, category: "Electronics", inStock: false },
  { id: 3, name: "Desk", price: 300, category: "Furniture", inStock: true },
  { id: 4, name: "Chair", price: 150, category: "Furniture", inStock: true },
  {
    id: 5,
    name: "Monitor",
    price: 400,
    category: "Electronics",
    inStock: true,
  },
];

console.log("Challenge 1: Basic Pipe with Numbers");
console.log("Task: Use pipe to: add 10, multiply by 2, subtract 5.\n");

function calculate(n: number): number {
  return pipe(
    n,
    (x) => x + 10,
    (x) => x * 2,
    (x) => x - 5,
  );
}

console.log("Test:", calculate(5));
console.log("Expected: 25\n");

console.log("Challenge 2: Array Filtering with Pipe");
console.log(
  "Task: Get all products in stock, then filter only Electronics category.\n",
);

function getElectronicsInStock(): Product[] {
  return pipe(
    products,
    Array.filter((p) => p.inStock),
    Array.filter((p) => p.category === "Electronics"),
  );
}

console.log("Test:", getElectronicsInStock().length);
console.log("Expected: 2\n");

console.log("Challenge 3: Array Transformation Chain");
console.log(
  "Task: Get product names, convert to uppercase, sort alphabetically. Use pipe with Array methods.\n",
);

function getProductNamesUpperSorted(): string[] {
  return pipe(
    products,
    Array.map((p) => p.name),
    Array.map((name) => name.toUpperCase()),
    Array.sort((a, b) => a.localeCompare(b)),
  );
}

console.log("Test:", getProductNamesUpperSorted());
console.log("Expected: ['CHAIR', 'DESK', 'LAPTOP', 'MONITOR', 'PHONE']\n");

console.log("Challenge 4: Reduce with Pipe");
console.log("Task: Calculate total value of all in-stock products.\n");

function getTotalStockValue(): number {
  return pipe(
    products,
    Array.filter((p) => p.inStock),
    Array.map((p) => p.price),
    Array.reduce(0, (acc, price) => acc + price),
  );
}

console.log("Test:", getTotalStockValue());
console.log("Expected: 2050\n");

console.log("Challenge 5: Pipe with Option");
console.log(
  "Task: Find product by ID, get its price, apply 10% discount. Return Option<number>.\n",
);

function getPriceWithDiscount(id: number): Option.Option<number> {
  return pipe(
    products,
    Array.findFirst((p) => p.id === id),
    Option.map((p) => p.price),
    Option.map((price) => price * 0.9),
  );
}

console.log("Test:", Option.getOrNull(getPriceWithDiscount(1)));
console.log("Expected: 1080");
console.log("Test:", Option.getOrNull(getPriceWithDiscount(999)));
console.log("Expected: null\n");

console.log("Challenge 6: Complex Chain - Group and Count");
console.log("Task: Group products by category and count items in each.\n");

function countByCategory(): Record<string, number> {
  return pipe(
    products,
    Array.groupBy((p) => p.category),
    (grouped) =>
      Object.entries(grouped).map(([category, items]) => [
        category,
        items.length,
      ]),
    (result) => Object.fromEntries(result),
  );
}

console.log("Test:", countByCategory());
console.log("Expected: { Electronics: 3, Furniture: 2 }\n");

console.log("Challenge 7: Pipe with Multiple Transformations");
console.log(
  "Task: Get products under $500, map to {name, discountedPrice (80% of original)}, sort by price.\n",
);

type ProductSummary = { name: string; discountedPrice: number };

function getAffordableWithDiscount(): ProductSummary[] {
  return pipe(
    products,
    Array.filter((p) => p.price < 500),
    Array.map((p) => ({ name: p.name, discountedPrice: p.price * 0.8 })),
    Array.sort(
      Order.mapInput(
        Order.number,
        (p: Record<string, any>) => p.discountedPrice,
      ),
    ),
  );
}

console.log("Test:", getAffordableWithDiscount());
console.log(
  "Expected: [{name: 'Chair', discountedPrice: 120}, {name: 'Desk', discountedPrice: 240}, {name: 'Monitor', discountedPrice: 320}]\n",
);

console.log("Challenge 8: Nested Pipe Operations");
console.log(
  "Task: For each category, get average price of in-stock items. Return Record<string, number>.\n",
);

function getAveragePriceByCategory(): Record<string, number> {
  return pipe(
    products,
    Array.filter((p) => p.inStock),
    Array.groupBy((p) => p.category),
    (grouped) =>
      Object.entries(grouped).map(([category, items]) => [
        category,
        pipe(
          items,
          Array.reduce(0, (acc, p) => acc + p.price),
          (sum) => sum / items.length,
        ),
      ]),
    (result) => Object.fromEntries(result),
  );
}

console.log("Test:", getAveragePriceByCategory());
console.log("Expected: { Electronics: 800, Furniture: 225 }\n");

console.log("Challenge 9: Advanced - Custom Pipeline");
console.log(
  "Task: Create a reusable pipe that: filters by category, sorts by price desc, takes first N items.\n",
);

function getTopNByCategory(category: string, n: number): Product[] {
  return pipe(
    products,
    Array.filter((p) => p.category === category),
    Array.sort(
      Order.mapInput(Order.number, (p: Record<string, any>) => p.price),
    ),
    Array.take(n),
  );
}

console.log(
  "Test:",
  getTopNByCategory("Electronics", 2).map((p) => p.name),
);
console.log("Expected: ['Laptop', 'Phone'] or ['Laptop', 'Monitor']\n");

console.log("Challenge 10: Expert - Compose Multiple Pipes");
console.log(
  "Task: Create a data processing pipeline: normalize prices (0-1 range), filter > 0.3, return product names.\n",
);

function normalizeAndFilter(): string[] {
  const maxPrice = Math.max(...products.map((p) => p.price));
  const minPrice = Math.min(...products.map((p) => p.price));

  return pipe(
    products,
    Array.map((p) => ({
      ...p,
      normalizeprice: (p.price - minPrice) / (maxPrice - minPrice),
    })),
    Array.filter((p) => p.normalizeprice > 0.3),
    Array.map((p) => p.name),
  );
}

console.log("Test:", normalizeAndFilter());
console.log("Expected: Product names with normalized price > 0.3\n");

console.log("\n✨ Run the solution file to see the answers!");
