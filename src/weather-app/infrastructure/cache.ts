import { Context, Effect, Layer, Ref } from "effect";
import { CacheExpiredError, CacheFullError, CacheMissError } from "../errors";
import type { CacheConfigType } from "../domain/config";

/**
 * CACHE SERVICE - In-Memory TTL Cache with Ref
 *
 * This demonstrates:
 * - Ref for mutable state in Effect
 * - TTL (time-to-live) expiration logic
 * - LRU eviction when cache is full
 * - Type-safe cache operations
 *
 * COMPARED TO TASK APP:
 * - Task app: No caching layer
 * - Weather app: Cache with TTL to reduce API calls
 *
 * KEY LEARNING: Managing mutable state with Ref
 * - Ref is Effect's answer to mutable variables
 * - All updates are atomic
 * - Type-safe, no race conditions
 * - Composable with other Effects
 *
 * WHY CACHE?
 * - Reduce API calls (save money, respect rate limits)
 * - Faster responses (no network roundtrip)
 * - Fallback when API is down
 * - Better UX (instant results)
 */

/**
 * Cache entry with metadata
 *
 * WHY METADATA?
 * - cachedAt: Know when data was stored
 * - expiresAt: Check if entry is stale
 * - accessCount: LRU eviction (least recently used)
 *
 * DEMONSTRATES:
 * - Generic type parameter (value can be any type)
 * - Timestamp tracking for TTL
 * - Access tracking for eviction
 */
interface CacheEntry<T> {
  value: T;
  cachedAt: Date;
  expiresAt: Date;
  accessCount: number;
}

/**
 * Cache state - Map of key → entry
 *
 * WHY Map?
 * - O(1) lookup by key
 * - Easy to iterate for eviction
 * - Built-in size tracking
 *
 * PATTERN: Ref<Map<K, V>> for mutable collections
 * - Atomic updates
 * - No race conditions
 * - Type-safe
 */
type CacheState = Map<string, CacheEntry<unknown>>;

/**
 * Cache Service Interface
 *
 * WHY A SERVICE?
 * - Can swap implementations (memory, Redis, etc.)
 * - Dependency injection
 * - Easy to mock for testing
 *
 * DEMONSTRATES:
 * - Generic methods (get<T>, set<T>)
 * - Effect return types with explicit errors
 * - Context.Tag for service definition
 *
 * METHODS:
 * - get: Retrieve value (fails with CacheMissError or CacheExpiredError)
 * - set: Store value with TTL
 * - clear: Remove all entries
 * - size: Get current cache size
 */
export class Cache extends Context.Tag("Cache")<
  Cache,
  {
    readonly get: <T>(key: string) => Effect.Effect<T, CacheMissError | CacheExpiredError>;
    readonly set: <T>(key: string, value: T) => Effect.Effect<void, CacheFullError>;
    readonly clear: () => Effect.Effect<void>;
    readonly size: () => Effect.Effect<number>;
  }
>() {}

/**
 * Cache Implementation
 *
 * DEMONSTRATES:
 * - Ref.make for mutable state
 * - Ref.get/set/update for atomic operations
 * - TTL expiration checking
 * - LRU eviction strategy
 *
 * KEY PATTERN: All state changes through Ref
 * ```typescript
 * // ❌ Don't mutate directly
 * cacheState.set(key, value)
 *
 * // ✅ Update through Ref
 * yield* Ref.update(cacheRef, state => {
 *   state.set(key, value)
 *   return state
 * })
 * ```
 */
export const makeCache = (config: CacheConfigType) =>
  Effect.gen(function* () {
    /**
     * Create mutable cache state
     *
     * WHY Ref.make?
     * - Creates mutable reference
     * - Thread-safe (atomic updates)
     * - Composable with Effect
     *
     * DEMONSTRATES:
     * - Ref initialization
     * - Map as mutable state
     */
    const cacheRef = yield* Ref.make<CacheState>(new Map());

    /**
     * Get value from cache
     *
     * FLOW:
     * 1. Get current cache state
     * 2. Look up key
     * 3. Check if exists (CacheMissError if not)
     * 4. Check if expired (CacheExpiredError if yes)
     * 5. Increment access count (for LRU)
     * 6. Return value
     *
     * WHY FAIL WITH ERRORS?
     * - Type-safe control flow
     * - Caller can handle miss/expired differently
     * - Better than returning Option (has context)
     *
     * DEMONSTRATES:
     * - Ref.get to read state
     * - Ref.update to modify state
     * - Effect.fail for control flow
     * - Type casting (unknown → T)
     */
    const get = <T>(key: string): Effect.Effect<T, CacheMissError | CacheExpiredError> =>
      Effect.gen(function* () {
        const state = yield* Ref.get(cacheRef);
        const entry = state.get(key);

        if (!entry) {
          return yield* Effect.fail(CacheMissError.make({ key }));
        }

        const now = new Date();
        if (now > entry.expiresAt) {
          yield* Ref.update(cacheRef, (s) => {
            s.delete(key);
            return s;
          });
          return yield* Effect.fail(
            CacheExpiredError.make({
              key,
              cachedAt: entry.cachedAt,
              expiresAt: entry.expiresAt,
            }),
          );
        }

        yield* Ref.update(cacheRef, (s) => {
          const updated = s.get(key);
          if (updated) {
            updated.accessCount++;
          }
          return s;
        });

        return entry.value as T;
      });

    /**
     * Store value in cache
     *
     * FLOW:
     * 1. Check if cache is full
     * 2. If full, evict LRU entry
     * 3. Create new entry with TTL
     * 4. Store in cache
     *
     * WHY CHECK SIZE?
     * - Prevent unbounded memory growth
     * - Predictable memory usage
     * - Force cleanup of old entries
     *
     * DEMONSTRATES:
     * - TTL calculation (now + ttlSeconds)
     * - LRU eviction (find lowest accessCount)
     * - Ref.update for atomic state changes
     */
    const set = <T>(key: string, value: T): Effect.Effect<void, CacheFullError> =>
      Effect.gen(function* () {
        if (!config.enabled) {
          return;
        }

        const state = yield* Ref.get(cacheRef);

        if (state.size >= config.maxSize && !state.has(key)) {
          let lruKey: string | null = null;
          let minAccessCount = Infinity;

          for (const [k, entry] of state.entries()) {
            if (entry.accessCount < minAccessCount) {
              minAccessCount = entry.accessCount;
              lruKey = k;
            }
          }

          if (lruKey) {
            yield* Ref.update(cacheRef, (s) => {
              s.delete(lruKey!);
              return s;
            });
          } else {
            return yield* Effect.fail(
              CacheFullError.make({
                maxSize: config.maxSize,
                currentSize: state.size,
              }),
            );
          }
        }

        const now = new Date();
        const expiresAt = new Date(now.getTime() + config.ttlSeconds * 1000);

        const entry: CacheEntry<T> = {
          value,
          cachedAt: now,
          expiresAt,
          accessCount: 0,
        };

        yield* Ref.update(cacheRef, (s) => {
          s.set(key, entry as CacheEntry<unknown>);
          return s;
        });
      });

    /**
     * Clear all cache entries
     *
     * WHY CLEAR?
     * - Testing (start with clean state)
     * - Memory management (free up space)
     * - Force refresh (ignore stale data)
     *
     * DEMONSTRATES:
     * - Ref.set to replace state entirely
     * - Simple state replacement pattern
     */
    const clear = (): Effect.Effect<void> =>
      Ref.set(cacheRef, new Map());

    /**
     * Get current cache size
     *
     * WHY SIZE?
     * - Monitoring (track cache usage)
     * - Debugging (understand cache behavior)
     * - Metrics (cache hit rate)
     *
     * DEMONSTRATES:
     * - Ref.get for read-only access
     * - Effect.map for transformation
     */
    const size = (): Effect.Effect<number> =>
      Ref.get(cacheRef).pipe(Effect.map((s) => s.size));

    return Cache.of({
      get,
      set,
      clear,
      size,
    });
  });

/**
 * Cache Layer - Dependency injection
 *
 * WHY Layer.effect?
 * - makeCache is an Effect (uses Ref.make)
 * - Layer.effect unwraps Effect<Service>
 * - Composes with other layers
 *
 * DEMONSTRATES:
 * - Layer construction from Effect
 * - Dependency on CacheConfig
 * - Service provision
 *
 * HOW IT WORKS:
 * 1. Layer depends on CacheConfig
 * 2. Effect.flatMap extracts config
 * 3. makeCache creates service (uses Ref.make)
 * 4. Layer provides Cache to dependents
 */
export const makeCacheLayer = (config: CacheConfigType) =>
  Layer.effect(Cache, makeCache(config));

/**
 * LEARNING NOTES - Ref and Mutable State:
 *
 * 1. WHY Ref INSTEAD OF let/var?
 *
 *    Traditional (race conditions):
 *    ```typescript
 *    let count = 0
 *    async function increment() {
 *      count++  // ❌ Not atomic! Race condition!
 *    }
 *    await Promise.all([increment(), increment()])
 *    console.log(count)  // Could be 1 or 2!
 *    ```
 *
 *    Effect Ref (atomic):
 *    ```typescript
 *    const countRef = yield* Ref.make(0)
 *    const increment = Ref.update(countRef, n => n + 1)
 *    yield* Effect.all([increment, increment])
 *    const count = yield* Ref.get(countRef)
 *    // Always 2! Atomic updates!
 *    ```
 *
 * 2. Ref OPERATIONS:
 *
 *    ```typescript
 *    // Create
 *    const ref = yield* Ref.make(initialValue)
 *
 *    // Read
 *    const value = yield* Ref.get(ref)
 *
 *    // Write
 *    yield* Ref.set(ref, newValue)
 *
 *    // Update (atomic read-modify-write)
 *    yield* Ref.update(ref, current => current + 1)
 *
 *    // Get and update (returns old value)
 *    const old = yield* Ref.getAndUpdate(ref, n => n + 1)
 *
 *    // Update and get (returns new value)
 *    const new_ = yield* Ref.updateAndGet(ref, n => n + 1)
 *
 *    // Conditional update
 *    yield* Ref.modify(ref, current => [result, newState])
 *    ```
 *
 * 3. TTL PATTERN:
 *
 *    ```typescript
 *    interface Entry<T> {
 *      value: T
 *      expiresAt: Date
 *    }
 *
 *    const get = <T>(key: string) =>
 *      Effect.gen(function*() {
 *        const entry = yield* lookupEntry(key)
 *        if (new Date() > entry.expiresAt) {
 *          yield* removeEntry(key)
 *          return yield* Effect.fail(CacheExpiredError.make(...))
 *        }
 *        return entry.value
 *      })
 *    ```
 *
 * 4. LRU EVICTION:
 *
 *    ```typescript
 *    // Track access count
 *    interface Entry<T> {
 *      value: T
 *      accessCount: number
 *    }
 *
 *    // Find least accessed
 *    let lruKey = null
 *    let minCount = Infinity
 *    for (const [key, entry] of cache.entries()) {
 *      if (entry.accessCount < minCount) {
 *        minCount = entry.accessCount
 *        lruKey = key
 *      }
 *    }
 *
 *    // Evict
 *    if (lruKey) {
 *      cache.delete(lruKey)
 *    }
 *    ```
 *
 * 5. CACHE-ASIDE PATTERN:
 *
 *    ```typescript
 *    const getData = (key: string) =>
 *      Effect.gen(function*() {
 *        const cache = yield* Cache
 *
 *        // Try cache first
 *        const cached = yield* cache.get(key).pipe(
 *          Effect.catchTags({
 *            CacheMissError: () => Effect.succeed(null),
 *            CacheExpiredError: () => Effect.succeed(null)
 *          })
 *        )
 *
 *        if (cached !== null) {
 *          return cached
 *        }
 *
 *        // Fetch from source
 *        const fresh = yield* fetchFromApi(key)
 *
 *        // Update cache
 *        yield* cache.set(key, fresh)
 *
 *        return fresh
 *      })
 *    ```
 *
 * 6. STALE-WHILE-REVALIDATE:
 *
 *    ```typescript
 *    const getData = (key: string) =>
 *      Effect.gen(function*() {
 *        const cache = yield* Cache
 *
 *        const cached = yield* cache.get(key).pipe(
 *          Effect.catchTag("CacheMissError", () => Effect.succeed(null))
 *        )
 *
 *        // Return stale data immediately
 *        if (cached !== null) {
 *          // Refresh in background (fire and forget)
 *          Effect.runFork(
 *            fetchFromApi(key).pipe(
 *              Effect.flatMap(fresh => cache.set(key, fresh))
 *            )
 *          )
 *          return cached
 *        }
 *
 *        // No cache, wait for fresh
 *        const fresh = yield* fetchFromApi(key)
 *        yield* cache.set(key, fresh)
 *        return fresh
 *      })
 *    ```
 *
 * 7. MONITORING & METRICS:
 *
 *    ```typescript
 *    const makeCache = (config: CacheConfig) =>
 *      Effect.gen(function*() {
 *        const cacheRef = yield* Ref.make<CacheState>(new Map())
 *        const hitsRef = yield* Ref.make(0)
 *        const missesRef = yield* Ref.make(0)
 *
 *        const get = <T>(key: string) =>
 *          Effect.gen(function*() {
 *            const entry = yield* lookupEntry(key)
 *            if (entry) {
 *              yield* Ref.update(hitsRef, n => n + 1)
 *              return entry.value
 *            }
 *            yield* Ref.update(missesRef, n => n + 1)
 *            return yield* Effect.fail(CacheMissError.make({ key }))
 *          })
 *
 *        const getStats = Effect.gen(function*() {
 *          const hits = yield* Ref.get(hitsRef)
 *          const misses = yield* Ref.get(missesRef)
 *          const hitRate = hits / (hits + misses)
 *          return { hits, misses, hitRate }
 *        })
 *
 *        return { get, set, clear, getStats }
 *      })
 *    ```
 *
 * 8. BENEFITS OF Ref:
 *    ✅ Atomic updates (no race conditions)
 *    ✅ Type-safe (compiler checks state type)
 *    ✅ Composable (works with Effect operations)
 *    ✅ Testable (can inspect state)
 *    ✅ No locks needed (atomic by design)
 *    ✅ Works with concurrent operations
 *
 * 9. WHEN TO USE Ref:
 *    ✅ Counters and statistics
 *    ✅ Caches and memoization
 *    ✅ State machines
 *    ✅ Connection pools
 *    ✅ Rate limiters
 *    ❌ Distributed state (use database)
 *    ❌ Persistent state (use storage)
 *    ❌ Pure computations (use functions)
 *
 * 10. COMPARED TO ALTERNATIVES:
 *
 *     let/var (not safe):
 *     - Race conditions
 *     - Hard to test
 *     - Not composable
 *
 *     Ref (safe):
 *     - Atomic operations
 *     - Type-safe
 *     - Composable with Effect
 *
 *     STM (more powerful):
 *     - Multiple refs in transaction
 *     - Retry on conflict
 *     - More complex
 */
