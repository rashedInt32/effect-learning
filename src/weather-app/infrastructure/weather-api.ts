import { Context, Effect, Layer } from "effect";
import { Schema } from "effect";
import {
  HttpError,
  InvalidResponseError,
  NetworkError,
  RateLimitError,
  TimeoutError,
} from "../errors";
import { WeatherReading, Location, createWeatherReading } from "../domain/models";
import type { WeatherApiConfigType } from "../domain/config";

/**
 * WEATHER API CLIENT - External HTTP API Integration
 *
 * This demonstrates:
 * - HTTP requests with Effect.tryPromise
 * - Response parsing with Schema.decode
 * - Error mapping (network errors, HTTP errors, parsing errors)
 * - Retry strategies (exponential backoff, rate limiting)
 * - Timeout handling
 *
 * COMPARED TO TASK APP:
 * - Task app: File-based storage only (no external APIs)
 * - Weather app: External API integration with complex error handling
 *
 * KEY LEARNING: Wrapping external APIs in Effect
 * - fetch returns Promise<Response> (untyped, can throw)
 * - We convert to Effect<A, E> (typed, explicit errors)
 * - Schema validates and transforms response data
 * - Custom errors provide context for error handling
 */

/**
 * Raw API response from OpenWeatherMap
 *
 * WHY SEPARATE SCHEMA?
 * - API response shape ≠ our domain model
 * - API uses snake_case, different field names
 * - We transform and validate into our domain model
 * - Decouples our code from API changes
 *
 * DEMONSTRATES:
 * - Schema for external API data
 * - Nested structures (main, wind, clouds)
 * - Optional fields (rain, snow, visibility)
 */
const OpenWeatherMapResponse = Schema.Struct({
  coord: Schema.Struct({
    lon: Schema.Number,
    lat: Schema.Number,
  }),
  weather: Schema.Array(
    Schema.Struct({
      id: Schema.Number,
      main: Schema.String,
      description: Schema.String,
    }),
  ),
  main: Schema.Struct({
    temp: Schema.Number,
    feels_like: Schema.Number,
    humidity: Schema.Number,
    pressure: Schema.optional(Schema.Number),
  }),
  visibility: Schema.optional(Schema.Number),
  wind: Schema.Struct({
    speed: Schema.Number,
    deg: Schema.optional(Schema.Number),
  }),
  rain: Schema.optional(
    Schema.Struct({
      "1h": Schema.optional(Schema.Number),
    }),
  ),
  name: Schema.String,
  dt: Schema.Number,
});

type OpenWeatherMapResponse = typeof OpenWeatherMapResponse.Type;

/**
 * Map weather condition ID to our domain type
 *
 * WHY THIS MAPPING?
 * - OpenWeatherMap uses numeric IDs (800 = clear, 801 = cloudy)
 * - We use string literals ("clear", "cloudy")
 * - Type-safe in our domain
 *
 * DEMONSTRATES: External format → Domain format transformation
 */
const mapWeatherCondition = (id: number): WeatherReading["condition"] => {
  if (id >= 200 && id < 300) return "stormy";
  if (id >= 300 && id < 600) return "rainy";
  if (id >= 600 && id < 700) return "snowy";
  if (id >= 700 && id < 800) return "foggy";
  if (id === 800) return "clear";
  return "cloudy";
};

/**
 * Transform API response to domain model
 *
 * WHY TRANSFORMATION LAYER?
 * - API structure ≠ domain structure
 * - API uses different units (Kelvin → Celsius)
 * - We add validation (createWeatherReading validates ranges)
 * - Protects domain from API changes
 *
 * DEMONSTRATES:
 * - Data transformation pattern
 * - Unit conversion (Kelvin to Celsius)
 * - Using factory functions (createWeatherReading)
 *
 * PATTERN: API → Transform → Validate → Domain
 */
const transformResponse = (
  response: OpenWeatherMapResponse,
  location: Location,
): WeatherReading => {
  const tempCelsius = response.main.temp - 273.15;
  const feelsLikeCelsius = response.main.feels_like - 273.15;
  const condition = mapWeatherCondition(response.weather[0]?.id ?? 800);

  return createWeatherReading({
    location,
    temperature: tempCelsius,
    feelsLike: feelsLikeCelsius,
    humidity: response.main.humidity,
    condition,
    windSpeed: response.wind.speed,
    windDirection: response.wind.deg,
    precipitation: response.rain?.["1h"],
    pressure: response.main.pressure,
    visibility: response.visibility,
  });
};

/**
 * WeatherApi Service Interface
 *
 * WHY A SERVICE?
 * - Separates interface from implementation
 * - Can mock for testing
 * - Can swap providers (OpenWeather, WeatherAPI, etc.)
 * - Dependency injection with layers
 *
 * DEMONSTRATES:
 * - Context.Tag for service definition
 * - Effect return types with explicit errors
 * - Service methods (getCurrentWeather)
 */
export class WeatherApi extends Context.Tag("WeatherApi")<
  WeatherApi,
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
  }
>() {}

/**
 * WeatherApi Implementation
 *
 * DEMONSTRATES:
 * - HTTP requests with Effect.tryPromise
 * - Error classification (network, HTTP, timeout)
 * - Response parsing with Schema.decode
 * - Timeout handling with Effect.timeout
 *
 * KEY PATTERN: fetch → validate → transform
 * 1. Make HTTP request (Effect.tryPromise)
 * 2. Check status code (map to HttpError/RateLimitError)
 * 3. Parse JSON (Effect.tryPromise)
 * 4. Validate schema (Schema.decode)
 * 5. Transform to domain model
 */
export const makeWeatherApi = (config: WeatherApiConfigType) => {
  /**
   * Fetch current weather for a location
   *
   * FLOW:
   * 1. Build API URL with coordinates and API key
   * 2. Make HTTP request (with timeout)
   * 3. Handle non-200 responses (HttpError, RateLimitError)
   * 4. Parse JSON body
   * 5. Validate with schema
   * 6. Transform to domain model
   *
   * ERROR HANDLING:
   * - Network failures → NetworkError
   * - HTTP errors → HttpError
   * - Rate limiting → RateLimitError
   * - Timeout → TimeoutError
   * - Invalid response → InvalidResponseError
   *
   * DEMONSTRATES:
   * - Effect.tryPromise for async operations
   * - Effect.flatMap for chaining
   * - Effect.timeout for cancellation
   * - Effect.catchAll for error transformation
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
      const url = new URL(`${config.baseUrl}/weather`);
      url.searchParams.set("lat", location.coordinates.latitude.toString());
      url.searchParams.set("lon", location.coordinates.longitude.toString());
      url.searchParams.set("appid", config.apiKey);

      /**
       * Make HTTP request
       *
       * WHY Effect.tryPromise?
       * - fetch returns Promise (can reject with any error)
       * - tryPromise converts to Effect with typed error
       * - catch transforms unknown errors to our error types
       *
       * DEMONSTRATES:
       * - Converting Promise to Effect
       * - Error transformation
       * - Preserving error context (URL, operation)
       */
      const response = yield* Effect.tryPromise({
        try: () => fetch(url.toString()),
        catch: (error) =>
          NetworkError.make({
            url: url.toString(),
            operation: "fetch",
            cause: error,
          }),
      }).pipe(
        /**
         * Apply timeout
         *
         * WHY TIMEOUT?
         * - Prevent hanging on slow APIs
         * - Better user experience (fail fast)
         * - Resource management (don't wait forever)
         *
         * DEMONSTRATES:
         * - Effect.timeout for cancellation
         * - mapError to convert timeout to TimeoutError
         */
        Effect.timeout(`${config.timeoutMs} millis`),
        Effect.mapError((maybeTimeout) => {
          if (maybeTimeout._tag === "TimeoutException") {
            return TimeoutError.make({
              operation: `fetch ${url.toString()}`,
              timeoutMs: config.timeoutMs,
            });
          }
          return maybeTimeout;
        }),
      );

      /**
       * Handle HTTP errors
       *
       * WHY CHECK STATUS?
       * - 2xx = success
       * - 4xx = client error (bad request, not found)
       * - 429 = rate limit (special handling)
       * - 5xx = server error (retry later)
       *
       * DEMONSTRATES:
       * - Different errors for different status codes
       * - Capturing response context (status, body)
       * - Rate limit detection and handling
       */
      if (!response.ok) {
        const body = yield* Effect.tryPromise({
          try: () => response.text(),
          catch: () => undefined,
        }).pipe(Effect.orElseSucceed(() => undefined));

        if (response.status === 429) {
          const resetAt = new Date(
            Date.now() + 60000,
          );
          const retryAfter = response.headers.get("Retry-After");

          return yield* Effect.fail(
            RateLimitError.make({
              limit: config.maxRequestsPerMinute,
              remaining: 0,
              resetAt,
              retryAfterSeconds: retryAfter ? parseInt(retryAfter, 10) : undefined,
            }),
          );
        }

        return yield* Effect.fail(
          HttpError.make({
            url: url.toString(),
            method: "GET",
            statusCode: response.status,
            statusText: response.statusText,
            body,
          }),
        );
      }

      /**
       * Parse JSON body
       *
       * WHY tryPromise AGAIN?
       * - response.json() returns Promise
       * - JSON parsing can fail (invalid JSON)
       * - We want to catch and transform these errors
       *
       * DEMONSTRATES: Nested async operations in Effect
       */
      const json = yield* Effect.tryPromise({
        try: () => response.json(),
        catch: (error) =>
          InvalidResponseError.make({
            url: url.toString(),
            expectedSchema: "OpenWeatherMapResponse",
            responseBody: "Failed to parse JSON",
            parseError: error,
          }),
      });

      /**
       * Validate and decode response
       *
       * WHY Schema.decode?
       * - API could return unexpected data
       * - Schema validates structure and types
       * - Catches breaking API changes
       * - Provides detailed error messages
       *
       * DEMONSTRATES:
       * - Schema validation of external data
       * - Error transformation (ParseError → InvalidResponseError)
       * - Preserving parse error details
       */
      const validated = yield* Schema.decode(OpenWeatherMapResponse)(json).pipe(
        Effect.mapError((parseError) =>
          InvalidResponseError.make({
            url: url.toString(),
            expectedSchema: "OpenWeatherMapResponse",
            responseBody: JSON.stringify(json),
            parseError,
          }),
        ),
      );

      /**
       * Transform to domain model
       *
       * WHY TRANSFORM?
       * - API format ≠ domain format
       * - Domain model is validated (ranges, constraints)
       * - Decouples from API changes
       * - Type-safe transformation
       */
      return transformResponse(validated, location);
    });

  return WeatherApi.of({
    getCurrentWeather,
  });
};

/**
 * WeatherApi Layer - Dependency injection
 *
 * WHY Layer.effect?
 * - Construction depends on config (needs WeatherApiConfig)
 * - Config itself is an Effect (can fail if missing)
 * - Layer.effect composes Effects
 *
 * DEMONSTRATES:
 * - Layer with dependencies (needs config)
 * - Automatic dependency resolution
 * - Type-safe dependency injection
 *
 * HOW IT WORKS:
 * 1. Layer requires WeatherApiConfig
 * 2. Effect.map extracts config
 * 3. makeWeatherApi creates service
 * 4. Layer provides WeatherApi to dependents
 *
 * PATTERN: Layers compose automatically
 * ```typescript
 * const program = Effect.gen(function*() {
 *   const api = yield* WeatherApi
 *   const weather = yield* api.getCurrentWeather(location)
 * })
 * // Type: Effect<..., WeatherApi>
 *
 * const runnable = program.pipe(
 *   Effect.provide(WeatherApiLive)
 * )
 * // WeatherApiLive needs WeatherApiConfig
 * // Type: Effect<..., WeatherApiConfig>
 * ```
 */
export const makeWeatherApiLayer = (config: WeatherApiConfigType) =>
  Layer.succeed(WeatherApi, makeWeatherApi(config));

/**
 * LEARNING NOTES - HTTP API Integration:
 *
 * 1. WRAPPING FETCH IN EFFECT:
 *
 *    Traditional (error-prone):
 *    ```typescript
 *    try {
 *      const response = await fetch(url)
 *      if (!response.ok) {
 *        throw new Error(`HTTP ${response.status}`)
 *      }
 *      const json = await response.json()
 *      return json
 *    } catch (error) {
 *      // error is unknown, could be anything
 *      console.error(error)
 *    }
 *    ```
 *
 *    Effect (type-safe):
 *    ```typescript
 *    const response = yield* Effect.tryPromise({
 *      try: () => fetch(url),
 *      catch: (error) => NetworkError.make({ url, cause: error })
 *    })
 *    // Explicit error type: Effect<Response, NetworkError>
 *    ```
 *
 * 2. ERROR CLASSIFICATION:
 *
 *    ```typescript
 *    // Network failures (DNS, connection)
 *    Effect.tryPromise({
 *      try: () => fetch(url),
 *      catch: (error) => NetworkError.make(...)
 *    })
 *
 *    // HTTP errors (4xx, 5xx)
 *    if (!response.ok) {
 *      if (response.status === 429) {
 *        return Effect.fail(RateLimitError.make(...))
 *      }
 *      return Effect.fail(HttpError.make(...))
 *    }
 *
 *    // Parsing errors
 *    Schema.decode(schema)(json).pipe(
 *      Effect.mapError(parseError => InvalidResponseError.make(...))
 *    )
 *    ```
 *
 * 3. TIMEOUT HANDLING:
 *
 *    ```typescript
 *    fetchData.pipe(
 *      Effect.timeout("5 seconds"),
 *      Effect.mapError(maybeTimeout => {
 *        if (maybeTimeout._tag === "TimeoutException") {
 *          return TimeoutError.make({ operation, timeoutMs: 5000 })
 *        }
 *        return maybeTimeout
 *      })
 *    )
 *    ```
 *
 * 4. RETRY STRATEGIES:
 *
 *    Exponential backoff (for transient errors):
 *    ```typescript
 *    getCurrentWeather(location).pipe(
 *      Effect.retry({
 *        schedule: Schedule.exponential("1 second").pipe(
 *          Schedule.intersect(Schedule.recurs(3))  // Max 3 retries
 *        ),
 *        while: (error) =>
 *          error._tag === "NetworkError" ||
 *          (error._tag === "HttpError" && error.statusCode >= 500)
 *      })
 *    )
 *    ```
 *
 *    Rate limit backoff:
 *    ```typescript
 *    getCurrentWeather(location).pipe(
 *      Effect.retry({
 *        schedule: Schedule.spaced("5 seconds"),
 *        while: (error) => error._tag === "RateLimitError"
 *      })
 *    )
 *    ```
 *
 * 5. SCHEMA VALIDATION:
 *
 *    ```typescript
 *    // 1. Define expected schema
 *    const ApiResponse = Schema.Struct({
 *      data: Schema.String,
 *      status: Schema.Number
 *    })
 *
 *    // 2. Decode and validate
 *    const validated = yield* Schema.decode(ApiResponse)(json)
 *    // Type: { data: string, status: number }
 *    // Runtime: Validated structure
 *    ```
 *
 * 6. TRANSFORMATION PATTERN:
 *
 *    API → Schema → Transform → Domain
 *
 *    ```typescript
 *    // 1. API response (raw)
 *    const json = { temp: 293.15, humidity: 65 }
 *
 *    // 2. Validate with schema
 *    const validated = yield* Schema.decode(ApiSchema)(json)
 *
 *    // 3. Transform to domain model
 *    const weather = createWeatherReading({
 *      temperature: validated.temp - 273.15,  // Kelvin → Celsius
 *      humidity: validated.humidity,
 *      ...
 *    })
 *    // Domain model has validation (temp must be -100 to 60)
 *    ```
 *
 * 7. BENEFITS OF THIS APPROACH:
 *    ✅ Type-safe errors (know what can go wrong)
 *    ✅ Explicit error handling (compiler forces handling)
 *    ✅ Validated data (schema catches bad responses)
 *    ✅ Testable (easy to mock API responses)
 *    ✅ Retryable (structured retry strategies)
 *    ✅ Timeout protection (won't hang forever)
 *    ✅ Decoupled (API changes don't break domain)
 *
 * 8. COMPARED TO ALTERNATIVES:
 *
 *    axios/fetch (traditional):
 *    - Errors are unknown
 *    - No schema validation
 *    - Manual retry logic
 *    - Global timeout configuration
 *    - Throws exceptions
 *
 *    Effect + Schema:
 *    - Typed errors
 *    - Automatic validation
 *    - Composable retry strategies
 *    - Per-request timeout
 *    - Explicit error handling
 *
 * 9. REAL-WORLD USAGE:
 *
 *    ```typescript
 *    const weather = yield* WeatherApi.pipe(
 *      Effect.flatMap(api => api.getCurrentWeather(location)),
 *      Effect.retry({
 *        schedule: Schedule.exponential("1 second"),
 *        times: 3
 *      }),
 *      Effect.timeout("10 seconds"),
 *      Effect.catchTags({
 *        RateLimitError: () => Effect.sleep("60 seconds").pipe(
 *          Effect.flatMap(() => api.getCurrentWeather(location))
 *        ),
 *        TimeoutError: () => getCachedWeather(location),
 *        NetworkError: () => getCachedWeather(location)
 *      })
 *    )
 *    ```
 */
