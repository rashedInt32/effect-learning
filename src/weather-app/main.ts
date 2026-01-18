import { Effect, Layer, Console, Stream } from "effect";
import { WeatherService, WeatherServiceLive } from "./services/weather-service";
import { StreamService, StreamServiceLive } from "./services/stream-service";
import { makeWeatherApiLayer } from "./infrastructure/weather-api";
import { makeCacheLayer } from "./infrastructure/cache";
import { makeStorageLayer } from "./infrastructure/storage";
import { createLocation } from "./domain/models";
import {
  WeatherApiConfig,
  CacheConfig,
  StorageConfig,
  StreamConfig,
} from "./domain/config";

/**
 * WEATHER APP MAIN - Effect.Stream Demo
 *
 * THIS IS WHERE WE SHOWCASE STREAMING!
 *
 * WHAT THIS DEMONSTRATES:
 * 1. Layer composition (API + Cache + Storage + Services)
 * 2. Effect.Stream for real-time updates
 * 3. Config-driven application
 * 4. Graceful interruption handling
 * 5. Stream consumption patterns
 *
 * COMPARED TO PRACTICAL-APP:
 * - Practical-app: Simple CRUD demo (register, create, update)
 * - Weather-app: Streaming demo (continuous updates, concurrent processing)
 *
 * KEY DIFFERENCES:
 * - External API integration (vs file-only storage)
 * - Caching layer (TTL, LRU eviction)
 * - Effect.Config (environment-driven configuration)
 * - Effect.Stream (continuous data flows)
 * - Concurrency control (multiple locations in parallel)
 *
 * LEARNING FOCUS:
 * - How to compose complex layer dependencies
 * - How to build streaming applications with Effect
 * - How to handle real-time data flows
 * - How to use Config for environment variables
 */

/**
 * Application Layer - Complete Dependency Graph
 *
 * DEPENDENCY TREE:
 * ```
 * Config Layer (WeatherApiConfig, CacheConfig, StorageConfig)
 *   ↓
 * Infrastructure Layer (WeatherApi, Cache, Storage)
 *   ↓
 * Service Layer (WeatherService)
 *   ↓
 * Stream Layer (StreamService)
 *   ↓
 * Main Program
 * ```
 *
 * WHY THIS ORDERING?
 * - Bottom-up: Start with infrastructure, build up to business logic
 * - Each layer depends only on layers below it
 * - Type-safe: Compiler ensures all dependencies are satisfied
 *
 * DEMONSTRATES:
 * - Layer.unwrapEffect: Create layer from Effect that yields config
 * - Layer.provideMerge: Combine and satisfy dependencies
 * - Service composition: Building complex apps from simple services
 */
const infraLayer = Layer.unwrapEffect(
  Effect.all({
    apiConfig: WeatherApiConfig,
    cacheConfig: CacheConfig,
    storageConfig: StorageConfig,
  }).pipe(
    Effect.map(({ apiConfig, cacheConfig, storageConfig }) =>
      Layer.mergeAll(
        makeWeatherApiLayer(apiConfig),
        makeCacheLayer(cacheConfig),
        makeStorageLayer(storageConfig),
      ),
    ),
  ),
);

const weatherLayer = Layer.provide(WeatherServiceLive, infraLayer);
const streamLayer = Layer.provide(StreamServiceLive, Layer.merge(infraLayer, weatherLayer));
const servicesLayer = Layer.mergeAll(weatherLayer, streamLayer);

/**
 * Demo Program - Streaming Weather Updates
 *
 * WHAT THIS DOES:
 * 1. Adds a few locations to track
 * 2. Starts streaming weather updates
 * 3. Logs each update as it arrives
 * 4. Runs until interrupted (Ctrl+C)
 *
 * DEMONSTRATES:
 * - Adding locations to track
 * - Creating a weather update stream
 * - Stream.runForEach: Consuming stream elements
 * - Graceful interruption (Ctrl+C)
 *
 * STREAMING PATTERN:
 * ```typescript
 * const stream = streamService.weatherUpdates()
 * yield* Stream.runForEach(stream, (element) => {
 *   // Process each element
 * })
 * ```
 *
 * WHY STREAMING?
 * - Models continuous data (weather updates over time)
 * - Automatic backpressure handling
 * - Clean interruption (stop cleanly on Ctrl+C)
 * - Composable (can map, filter, merge streams)
 */
const demoProgram = Effect.gen(function* () {
  const weatherService = yield* WeatherService;
  const streamService = yield* StreamService;

  yield* Console.log("=== Weather Monitoring System ===\n");

  yield* Console.log("📍 Adding locations to track...");

  const nyc = createLocation({
    name: "New York",
    country: "US",
    latitude: 40.7128,
    longitude: -74.006,
  });

  const london = createLocation({
    name: "London",
    country: "GB",
    latitude: 51.5074,
    longitude: -0.1278,
  });

  const tokyo = createLocation({
    name: "Tokyo",
    country: "JP",
    latitude: 35.6762,
    longitude: 139.6503,
  });

  yield* weatherService.addLocation(nyc);
  yield* Console.log(`  ✓ Added ${nyc.name}, ${nyc.country}`);

  yield* weatherService.addLocation(london);
  yield* Console.log(`  ✓ Added ${london.name}, ${london.country}`);

  yield* weatherService.addLocation(tokyo);
  yield* Console.log(`  ✓ Added ${tokyo.name}, ${tokyo.country}`);

  yield* Console.log("\n🌦️  Starting weather stream...");
  yield* Console.log("(Press Ctrl+C to stop)\n");

  const updates = streamService.weatherUpdates();

  yield* Stream.runForEach(updates, (reading) =>
    Console.log(
      `[${new Date(reading.timestamp).toLocaleTimeString()}] ` +
        `${reading.location.name}: ${reading.temperature}°C, ` +
        `Humidity: ${reading.humidity}%, ` +
        `Wind: ${reading.windSpeed} m/s - ${reading.condition}`,
    ),
  );
});

/**
 * Running the Program
 *
 * WHAT HAPPENS:
 * 1. Config is loaded from environment variables
 * 2. All layers are constructed (Config → Infrastructure → Services → Stream)
 * 3. Demo program runs with all dependencies
 * 4. Stream starts emitting updates
 * 5. Ctrl+C gracefully interrupts the stream
 * 6. Resources are cleaned up automatically
 *
 * GRACEFUL INTERRUPTION:
 * - Effect.Stream handles interruption signals
 * - Resources are cleaned up (files, connections)
 * - No dangling promises or timers
 * - Clean shutdown
 */
const main = demoProgram.pipe(Effect.provide(servicesLayer));

Effect.runPromise(main).catch((error) => {
  console.error("\n❌ Unexpected error:", error);
  process.exit(1);
});

/**
 * LEARNING NOTES - Weather App vs Practical App
 *
 * 1. PRACTICAL APP (Task Management):
 *    - Focus: Schema, Services, Layers basics
 *    - Operations: CRUD (Create, Read, Update, Delete)
 *    - Storage: File-based only
 *    - Errors: Business logic errors (duplicate, not found, unauthorized)
 *    - Execution: One-shot (run, complete, exit)
 *
 * 2. WEATHER APP (Real-time Monitoring):
 *    - Focus: Streams, Config, External APIs, Caching
 *    - Operations: Poll, Stream, Cache, Update
 *    - Storage: API + Cache + Files
 *    - Errors: Network, HTTP, Rate Limit, Timeout
 *    - Execution: Long-running (continuous until interrupted)
 *
 * 3. NEW CONCEPTS IN WEATHER APP:
 *    ✅ Effect.Config: Environment-driven configuration
 *    ✅ Effect.Stream: Continuous data flows
 *    ✅ HTTP API: External service integration
 *    ✅ Caching: TTL-based in-memory cache
 *    ✅ Concurrency: Multiple locations in parallel
 *    ✅ Backpressure: Buffer to handle bursts
 *    ✅ Retry: Exponential backoff on failures
 *    ✅ Interruption: Graceful shutdown on Ctrl+C
 *
 * 4. LAYER COMPOSITION COMPARISON:
 *
 *    Practical App:
 *    ```typescript
 *    const app = TaskService.layer.pipe(
 *      Layer.provideMerge(UserService.layer),
 *      Layer.provideMerge(makeStorageLayer("./data"))
 *    )
 *    ```
 *    - Simple linear dependency chain
 *    - Storage → UserService → TaskService
 *
 *    Weather App:
 *    ```typescript
 *    const app = Effect.gen(function*() {
 *      const config = yield* Config
 *      return Layer.mergeAll(
 *        makeWeatherApiLayer(config.api),
 *        makeCacheLayer(config.cache),
 *        makeStorageLayer(config.storage)
 *      ).pipe(
 *        Layer.provideMerge(WeatherServiceLive),
 *        Layer.provideMerge(StreamServiceLive)
 *      )
 *    }).pipe(Layer.unwrapEffect)
 *    ```
 *    - Complex dependency tree
 *    - Multiple infrastructure services
 *    - Config drives everything
 *
 * 5. STREAMING PATTERNS:
 *
 *    Create stream:
 *    ```typescript
 *    Stream.fromSchedule(Schedule.fixed("30 seconds"))
 *    ```
 *
 *    Transform:
 *    ```typescript
 *    stream.pipe(
 *      Stream.mapEffect(fetchData),
 *      Stream.filter(isValid),
 *      Stream.buffer(10)
 *    )
 *    ```
 *
 *    Consume:
 *    ```typescript
 *    Stream.runForEach(stream, process)
 *    ```
 *
 * 6. CONFIG PATTERNS:
 *
 *    Define:
 *    ```typescript
 *    const MyConfig = Config.all({
 *      apiKey: Config.string("API_KEY"),
 *      timeout: Config.number("TIMEOUT").pipe(
 *        Config.withDefault(5000)
 *      )
 *    })
 *    ```
 *
 *    Use:
 *    ```typescript
 *    const config = yield* MyConfig
 *    const client = makeClient(config.apiKey, config.timeout)
 *    ```
 *
 * 7. WHEN TO USE STREAMS:
 *    ✅ Real-time data (sensor readings, stock prices, weather)
 *    ✅ Continuous processing (log analysis, monitoring)
 *    ✅ Event streams (user actions, notifications)
 *    ✅ Polling (regular API checks)
 *    ✅ Fan-out (one input, multiple processors)
 *
 *    ❌ One-shot operations (use Effect)
 *    ❌ Simple batch processing (use Array operations)
 *    ❌ No time component (use plain data structures)
 *
 * 8. ADVANCED TOPICS TO EXPLORE:
 *    - Stream.groupBy: Group stream elements by key
 *    - Stream.debounce: Skip rapid updates
 *    - Stream.throttle: Limit update rate
 *    - Stream.merge: Combine multiple streams
 *    - Stream.broadcast: Share one stream with multiple consumers
 *    - Stream.retry: Automatic retry with backoff
 *    - Stream.interruptWhen: Stop stream on condition
 *
 * 9. PRACTICAL EXERCISES:
 *    1. Add more locations (Paris, Sydney, Mumbai)
 *    2. Filter stream (only show temps above 20°C)
 *    3. Add alerts (notify when temp drops/rises)
 *    4. Implement rate limiting (respect API quotas)
 *    5. Add historical analysis (track temperature trends)
 *    6. Create a different stream (hourly summaries)
 *    7. Add weather forecasts (future predictions)
 *
 * 10. NEXT STEPS:
 *     - Try the alternative demos (single location, multi-location)
 *     - Modify stream intervals (faster/slower polling)
 *     - Add new weather parameters (pressure, visibility)
 *     - Implement different caching strategies
 *     - Add persistence (save streams to DB)
 *     - Create a web dashboard (consume stream via WebSocket)
 */
