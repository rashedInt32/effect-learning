import { Context, Effect, Layer } from "effect";
import { WeatherApi } from "../infrastructure/weather-api";
import { Cache } from "../infrastructure/cache";
import { Storage } from "../infrastructure/storage";
import { Location, WeatherReading } from "../domain/models";
import {
  CacheExpiredError,
  CacheMissError,
  HttpError,
  InvalidResponseError,
  LocationNotFoundError,
  NetworkError,
  RateLimitError,
  TimeoutError,
} from "../errors";

/**
 * WEATHER SERVICE - Business Logic Layer
 *
 * This demonstrates:
 * - Composing multiple services (API, Cache, Storage)
 * - Cache-aside pattern (check cache → fetch → update cache)
 * - Fallback strategies (fresh → cached → error)
 * - Service-oriented architecture
 *
 * COMPARED TO TASK APP:
 * - Task app: Simple CRUD operations
 * - Weather app: Complex orchestration (API + Cache + Storage)
 *
 * KEY LEARNING: Business logic coordinates infrastructure
 * - WeatherService doesn't know about files or HTTP
 * - It just uses Cache, Storage, WeatherApi services
 * - Implementation details hidden behind interfaces
 *
 * PATTERN: Service composition
 * ```typescript
 * const result = yield* WeatherService.pipe(
 *   Effect.flatMap(service => service.getCurrentWeather(location))
 * )
 * ```
 */

/**
 * WeatherService Interface
 *
 * WHY A SERVICE?
 * - Encapsulates business logic
 * - Coordinates multiple infrastructure services
 * - Single entry point for weather operations
 * - Easy to test (mock dependencies)
 *
 * DEMONSTRATES:
 * - Context.Tag for service definition
 * - Methods that compose other services
 * - Clear error types for each operation
 *
 * OPERATIONS:
 * - getCurrentWeather: Get current weather (with caching)
 * - refreshWeather: Force refresh from API (bypass cache)
 * - addLocation: Start tracking a location
 * - removeLocation: Stop tracking a location
 * - getTrackedLocations: List all tracked locations
 * - getWeatherHistory: Get historical readings
 */
export class WeatherService extends Context.Tag("WeatherService")<
  WeatherService,
  {
    readonly getCurrentWeather: (
      location: Location,
    ) => Effect.Effect<
      WeatherReading,
      | NetworkError
      | HttpError
      | RateLimitError
      | InvalidResponseError
      | TimeoutError
    >;
    readonly refreshWeather: (
      location: Location,
    ) => Effect.Effect<
      WeatherReading,
      | NetworkError
      | HttpError
      | RateLimitError
      | InvalidResponseError
      | TimeoutError
    >;
    readonly addLocation: (
      location: Location,
    ) => Effect.Effect<void>;
    readonly removeLocation: (
      locationId: string,
    ) => Effect.Effect<void, LocationNotFoundError>;
    readonly getTrackedLocations: () => Effect.Effect<Location[]>;
    readonly getWeatherHistory: () => Effect.Effect<WeatherReading[]>;
  }
>() {}

/**
 * WeatherService Implementation
 *
 * DEMONSTRATES:
 * - Service composition (using Cache, Storage, WeatherApi)
 * - Cache-aside pattern
 * - Fallback strategies
 * - Error handling and recovery
 *
 * KEY PATTERN: Dependency injection via yield*
 * ```typescript
 * const api = yield* WeatherApi
 * const cache = yield* Cache
 * const storage = yield* Storage
 * ```
 */
export const makeWeatherService = Effect.gen(function* () {
  const api = yield* WeatherApi;
  const cache = yield* Cache;
  const storage = yield* Storage;

  /**
   * Get current weather with caching
   *
   * FLOW (Cache-Aside Pattern):
   * 1. Try to get from cache
   * 2. If cache hit → return cached data
   * 3. If cache miss → fetch from API
   * 4. Store in cache
   * 5. Return fresh data
   *
   * ERROR HANDLING:
   * - CacheMissError → Fetch from API
   * - CacheExpiredError → Fetch from API
   * - API errors → Propagate to caller
   *
   * DEMONSTRATES:
   * - Cache-aside pattern
   * - Effect.catchTags for specific error handling
   * - Service composition
   *
   * KEY LEARNING: Graceful degradation
   * - Cache miss is not an error (expected flow)
   * - We handle it by fetching fresh data
   * - Type system ensures all errors are handled
   */
  const getCurrentWeather = (
    location: Location,
  ): Effect.Effect<
    WeatherReading,
    | NetworkError
    | HttpError
    | RateLimitError
    | InvalidResponseError
    | TimeoutError
  > =>
    Effect.gen(function* () {
      const cacheKey = `weather:${location.id}`;

      const cached = yield* cache.get<WeatherReading>(cacheKey).pipe(
        Effect.catchTags({
          CacheMissError: () => Effect.succeed(null),
          CacheExpiredError: () => Effect.succeed(null),
        }),
      );

      if (cached !== null) {
        return cached;
      }

      const fresh = yield* api.getCurrentWeather(location);

      yield* cache.set(cacheKey, fresh).pipe(
        Effect.catchAll(() => Effect.void),
      );

      return fresh;
    });

  /**
   * Refresh weather from API (bypass cache)
   *
   * WHY BYPASS CACHE?
   * - User explicitly requests fresh data
   * - Cache might be stale
   * - Force update after configuration change
   *
   * FLOW:
   * 1. Fetch from API (ignore cache)
   * 2. Update cache with fresh data
   * 3. Return fresh data
   *
   * DEMONSTRATES:
   * - Bypassing cache when needed
   * - Updating cache after fetch
   * - Ignoring cache errors (best effort)
   */
  const refreshWeather = (
    location: Location,
  ): Effect.Effect<
    WeatherReading,
    | NetworkError
    | HttpError
    | RateLimitError
    | InvalidResponseError
    | TimeoutError
  > =>
    Effect.gen(function* () {
      const fresh = yield* api.getCurrentWeather(location);

      const cacheKey = `weather:${location.id}`;
      yield* cache.set(cacheKey, fresh).pipe(
        Effect.catchAll(() => Effect.void),
      );

      return fresh;
    });

  /**
   * Add location to tracking list
   *
   * FLOW:
   * 1. Load current locations
   * 2. Check if already tracked
   * 3. Add if not present
   * 4. Save updated list
   *
   * DEMONSTRATES:
   * - Loading from storage
   * - Deduplication logic
   * - Saving to storage
   * - Ignoring storage errors (best effort)
   *
   * WHY IGNORE ERRORS?
   * - Adding location should not fail the whole operation
   * - Storage is secondary to API functionality
   * - Log error but don't propagate
   */
   const addLocation = (location: Location): Effect.Effect<void> =>
     Effect.gen(function* () {
       const locations: Location[] = yield* storage.loadLocations().pipe(
         Effect.catchAll(() => Effect.succeed([] as Location[])),
       );

       const exists = locations.some((loc) => loc.id === location.id);
       if (!exists) {
         locations.push(location);
         yield* storage.saveLocations(locations).pipe(
           Effect.catchAll(() => Effect.void),
         );
       }
     });

  /**
   * Remove location from tracking
   *
   * FLOW:
   * 1. Load current locations
   * 2. Find location by ID
   * 3. Remove if found
   * 4. Save updated list
   *
   * ERROR HANDLING:
   * - LocationNotFoundError if ID doesn't exist
   * - Storage errors ignored (best effort)
   *
   * DEMONSTRATES:
   * - Filtering data
   * - Custom error for not found
   * - Best-effort storage updates
   */
  const removeLocation = (
    locationId: string,
  ): Effect.Effect<void, LocationNotFoundError> =>
    Effect.gen(function* () {
      const locations = yield* storage.loadLocations().pipe(
        Effect.catchAll(() => Effect.succeed([])),
      );

      const exists = locations.some((loc) => loc.id === locationId);
      if (!exists) {
        return yield* Effect.fail(
          LocationNotFoundError.make({ locationId }),
        );
      }

      const filtered = locations.filter((loc) => loc.id !== locationId);
      yield* storage.saveLocations(filtered).pipe(
        Effect.catchAll(() => Effect.void),
      );
    });

  /**
   * Get all tracked locations
   *
   * FLOW:
   * 1. Load from storage
   * 2. Return list (or empty array if error)
   *
   * DEMONSTRATES:
   * - Simple storage read
   * - Default to empty array on error
   * - No complex error handling needed
   */
  const getTrackedLocations = (): Effect.Effect<Location[]> =>
    storage.loadLocations().pipe(
      Effect.catchAll(() => Effect.succeed([])),
    );

  /**
   * Get weather reading history
   *
   * FLOW:
   * 1. Load all readings from storage
   * 2. Return list (or empty array if error)
   *
   * DEMONSTRATES:
   * - Historical data retrieval
   * - Graceful error handling
   *
   * NOTE: In production, you'd want pagination, filtering by location, date range, etc.
   */
  const getWeatherHistory = (): Effect.Effect<WeatherReading[]> =>
    storage.loadReadings().pipe(
      Effect.catchAll(() => Effect.succeed([])),
    );

  return WeatherService.of({
    getCurrentWeather,
    refreshWeather,
    addLocation,
    removeLocation,
    getTrackedLocations,
    getWeatherHistory,
  });
});

/**
 * WeatherService Layer - Dependency injection
 *
 * WHY Layer.effect?
 * - makeWeatherService is an Effect (yields from other services)
 * - Needs WeatherApi, Cache, Storage services
 * - Layer.effect composes Effects
 *
 * DEMONSTRATES:
 * - Layer with multiple dependencies
 * - Automatic dependency resolution
 * - Service composition
 *
 * HOW IT WORKS:
 * 1. Layer depends on WeatherApi, Cache, Storage
 * 2. makeWeatherService yields from all three
 * 3. Layer provides WeatherService to dependents
 *
 * PATTERN: Layers compose automatically
 * ```typescript
 * const program = Effect.gen(function*() {
 *   const service = yield* WeatherService
 *   const weather = yield* service.getCurrentWeather(location)
 * })
 * // Type: Effect<..., WeatherService>
 *
 * const runnable = program.pipe(
 *   Effect.provide(
 *     Layer.mergeAll(
 *       WeatherServiceLive,
 *       WeatherApiLive,
 *       CacheLive,
 *       StorageLive
 *     )
 *   )
 * )
 * // All dependencies provided automatically
 * ```
 */
export const WeatherServiceLive = Layer.effect(
  WeatherService,
  makeWeatherService,
);

/**
 * LEARNING NOTES - Service Composition:
 *
 * 1. CACHE-ASIDE PATTERN:
 *
 *    ```typescript
 *    const getData = (key: string) =>
 *      Effect.gen(function*() {
 *        // 1. Try cache
 *        const cached = yield* cache.get(key).pipe(
 *          Effect.catchTags({
 *            CacheMissError: () => Effect.succeed(null),
 *            CacheExpiredError: () => Effect.succeed(null)
 *          })
 *        )
 *
 *        if (cached !== null) {
 *          return cached  // 2. Cache hit
 *        }
 *
 *        // 3. Cache miss → fetch
 *        const fresh = yield* api.fetch(key)
 *
 *        // 4. Update cache
 *        yield* cache.set(key, fresh).pipe(
 *          Effect.catchAll(() => Effect.void)  // Ignore cache errors
 *        )
 *
 *        // 5. Return fresh
 *        return fresh
 *      })
 *    ```
 *
 * 2. FALLBACK STRATEGIES:
 *
 *    Try fresh, fall back to stale:
 *    ```typescript
 *    const weather = api.getCurrentWeather(location).pipe(
 *      Effect.orElse(() => cache.get(`weather:${location.id}`)),
 *      Effect.orElse(() => storage.loadReadings().pipe(
 *        Effect.map(readings => readings[0])
 *      ))
 *    )
 *    ```
 *
 *    Timeout with fallback:
 *    ```typescript
 *    const weather = api.getCurrentWeather(location).pipe(
 *      Effect.timeout("5 seconds"),
 *      Effect.catchTag("TimeoutException", () =>
 *        cache.get(`weather:${location.id}`)
 *      )
 *    )
 *    ```
 *
 * 3. SERVICE COMPOSITION:
 *
 *    ```typescript
 *    const makeMyService = Effect.gen(function*() {
 *      // Depend on other services
 *      const api = yield* ApiService
 *      const cache = yield* CacheService
 *      const storage = yield* StorageService
 *
 *      // Use them in methods
 *      const getData = (id: string) =>
 *        Effect.gen(function*() {
 *          const cached = yield* cache.get(id)
 *          if (cached) return cached
 *
 *          const fresh = yield* api.fetch(id)
 *          yield* cache.set(id, fresh)
 *          yield* storage.save(id, fresh)
 *          return fresh
 *        })
 *
 *      return MyService.of({ getData })
 *    })
 *    ```
 *
 * 4. ERROR HANDLING STRATEGIES:
 *
 *    Ignore errors (best effort):
 *    ```typescript
 *    yield* cache.set(key, value).pipe(
 *      Effect.catchAll(() => Effect.void)
 *    )
 *    ```
 *
 *    Provide default on error:
 *    ```typescript
 *    const locations = yield* storage.loadLocations().pipe(
 *      Effect.catchAll(() => Effect.succeed([]))
 *    )
 *    ```
 *
 *    Transform specific errors:
 *    ```typescript
 *    yield* cache.get(key).pipe(
 *      Effect.catchTags({
 *        CacheMissError: () => fetchFromApi(key),
 *        CacheExpiredError: () => fetchFromApi(key)
 *      })
 *    )
 *    ```
 *
 * 5. WHEN TO IGNORE ERRORS:
 *
 *    ✅ Caching failures (cache is optimization)
 *    ✅ Logging failures (don't fail operation)
 *    ✅ Metrics failures (observability is secondary)
 *    ✅ Background updates (fire and forget)
 *    ❌ Core business logic errors
 *    ❌ Data integrity issues
 *    ❌ Authentication/authorization failures
 *
 * 6. LAYER COMPOSITION:
 *
 *    ```typescript
 *    // Define dependencies
 *    const WeatherServiceLive = Layer.effect(WeatherService, makeWeatherService)
 *    // Depends on: WeatherApi, Cache, Storage
 *
 *    // Provide all layers
 *    const AppLive = Layer.mergeAll(
 *      WeatherServiceLive,
 *      WeatherApiLive,      // Provides WeatherApi
 *      CacheLive,           // Provides Cache
 *      StorageLive          // Provides Storage
 *    )
 *
 *    // Use in program
 *    const program = Effect.gen(function*() {
 *      const service = yield* WeatherService
 *      return yield* service.getCurrentWeather(location)
 *    })
 *
 *    Effect.runPromise(program.pipe(Effect.provide(AppLive)))
 *    ```
 *
 * 7. BENEFITS OF SERVICE LAYER:
 *    ✅ Separation of concerns (business logic ≠ infrastructure)
 *    ✅ Testable (mock dependencies)
 *    ✅ Composable (services use other services)
 *    ✅ Type-safe (compiler checks dependencies)
 *    ✅ Flexible (swap implementations)
 *    ✅ Clear error handling (explicit error types)
 *
 * 8. COMPARED TO TASK APP:
 *
 *    Task app (simple):
 *    - TaskService uses only Storage
 *    - Direct CRUD operations
 *    - No caching, no external APIs
 *
 *    Weather app (complex):
 *    - WeatherService uses API + Cache + Storage
 *    - Cache-aside pattern
 *    - Fallback strategies
 *    - Multiple error sources
 *
 * 9. REAL-WORLD PATTERNS:
 *
 *    Write-through cache:
 *    ```typescript
 *    const update = (id: string, data: Data) =>
 *      Effect.gen(function*() {
 *        yield* storage.save(id, data)
 *        yield* cache.set(id, data)
 *        return data
 *      })
 *    ```
 *
 *    Write-behind cache:
 *    ```typescript
 *    const update = (id: string, data: Data) =>
 *      Effect.gen(function*() {
 *        yield* cache.set(id, data)
 *        Effect.runFork(storage.save(id, data))  // Async
 *        return data
 *      })
 *    ```
 *
 *    Read-through cache:
 *    ```typescript
 *    const get = (id: string) =>
 *      cache.get(id).pipe(
 *        Effect.catchTag("CacheMissError", () =>
 *          storage.load(id).pipe(
 *            Effect.tap(data => cache.set(id, data))
 *          )
 *        )
 *      )
 *    ```
 */
