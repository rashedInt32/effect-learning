import { pipe, Array, Option } from "effect";

console.log("=== Pipe Solutions ===\n");

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

console.log("Solution 1: Basic Pipe with Numbers");
function calculate(n: number): number {
  return pipe(
    n,
    (x) => x + 10,
    (x) => x * 2,
    (x) => x - 5,
  );
}

console.log("Result:", calculate(5), "✓\n");

console.log("Solution 2: Array Filtering with Pipe");
function getElectronicsInStock(): Product[] {
  return pipe(
    products,
    Array.filter((p) => p.inStock),
    Array.filter((p) => p.category === "Electronics"),
  );
}

console.log("Result:", getElectronicsInStock().length, "✓\n");

console.log("Solution 3: Array Transformation Chain");
function getProductNamesUpperSorted(): string[] {
  return pipe(
    products,
    Array.map((p) => p.name),
    Array.map((name) => name.toUpperCase()),
    Array.sort((a, b) => a.localeCompare(b)),
  );
}

console.log("Result:", getProductNamesUpperSorted(), "✓\n");

console.log("Solution 4: Reduce with Pipe");
function getTotalStockValue(): number {
  return pipe(
    products,
    Array.filter((p) => p.inStock),
    Array.reduce(0, (acc, p) => acc + p.price),
  );
}

console.log("Result:", getTotalStockValue(), "✓\n");

console.log("Solution 5: Pipe with Option");
function getPriceWithDiscount(id: number): Option.Option<number> {
  return pipe(
    products,
    Array.findFirst((p) => p.id === id),
    Option.map((p) => p.price),
    Option.map((price) => price * 0.9),
  );
}

console.log("Result:", Option.getOrNull(getPriceWithDiscount(1)), "✓");
console.log("Result:", Option.getOrNull(getPriceWithDiscount(999)), "✓\n");

console.log("Solution 6: Complex Chain - Group and Count");
function countByCategory(): Record<string, number> {
  return pipe(
    products,
    Array.groupBy((p) => p.category),
    (grouped) =>
      Object.fromEntries(
        Object.entries(grouped).map(([category, items]) => [
          category,
          items.length,
        ]),
      ),
  );
}

console.log("Result:", countByCategory(), "✓\n");

console.log("Solution 7: Pipe with Multiple Transformations");
type ProductSummary = { name: string; discountedPrice: number };

function getAffordableWithDiscount(): ProductSummary[] {
  return pipe(
    products,
    Array.filter((p) => p.price < 500),
    Array.map((p) => ({ name: p.name, discountedPrice: p.price * 0.8 })),
    Array.sort((a, b) => a.discountedPrice - b.discountedPrice),
  );
}

console.log("Result:", getAffordableWithDiscount(), "✓\n");

console.log("Solution 8: Nested Pipe Operations");
function getAveragePriceByCategory(): Record<string, number> {
  return pipe(
    products,
    Array.filter((p) => p.inStock),
    Array.groupBy((p) => p.category),
    (grouped) =>
      Object.fromEntries(
        Object.entries(grouped).map(([category, items]) => [
          category,
          pipe(
            items,
            Array.reduce(0, (acc, p) => acc + p.price),
            (sum) => sum / items.length,
          ),
        ]),
      ),
  );
}

console.log("Result:", getAveragePriceByCategory(), "✓\n");

console.log("Solution 9: Advanced - Custom Pipeline");
function getTopNByCategory(category: string, n: number): Product[] {
  return pipe(
    products,
    Array.filter((p) => p.category === category),
    Array.sort((a, b) => b.price - a.price),
    Array.take(n),
  );
}

console.log(
  "Result:",
  getTopNByCategory("Electronics", 2).map((p) => p.name),
  "✓\n",
);

console.log("Solution 10: Expert - Compose Multiple Pipes");
function normalizeAndFilter(): string[] {
  const maxPrice = Math.max(...products.map((p) => p.price));
  const minPrice = Math.min(...products.map((p) => p.price));

  return pipe(
    products,
    Array.map((p) => ({
      ...p,
      normalizedPrice: (p.price - minPrice) / (maxPrice - minPrice),
    })),
    Array.filter((p) => p.normalizedPrice > 0.3),
    Array.map((p) => p.name),
  );
}

console.log("Result:", normalizeAndFilter(), "✓\n");

console.log("🎉 All solutions complete!");
