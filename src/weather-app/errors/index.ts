import { Schema } from "effect";

/**
 * WEATHER APP ERRORS - Advanced Error Modeling
 *
 * This file demonstrates error handling patterns for external systems:
 * - API errors (network, HTTP status codes, rate limiting)
 * - Cache errors (expiration, miss, full)
 * - Storage errors (file system operations)
 * - Business logic errors (invalid data, constraints)
 *
 * COMPARED TO TASK APP:
 * - Task app: Simple CRUD errors (NotFound, Duplicate, Unauthorized)
 * - Weather app: External system errors, retry strategies, rate limiting
 */

/**
 * API Errors - External Service Failures
 *
 * WHY DETAILED API ERRORS?
 * - Different HTTP status codes require different handling
 * - Rate limiting needs backoff strategies
 * - Network errors should be retried
 * - Invalid responses indicate data schema changes
 *
 * DEMONSTRATES:
 * - Capturing HTTP context (status code, URL, method)
 * - Preserving error details for debugging
 * - Structured errors for pattern matching
 */

/**
 * Network Error - Connection failures
 *
 * WHEN IT HAPPENS:
 * - DNS resolution fails
 * - Connection timeout
 * - Connection refused
 * - Network unreachable
 *
 * HOW TO HANDLE:
 * - Retry with exponential backoff
 * - Log for monitoring
 * - Fallback to cached data
 *
 * DEMONSTRATES: Schema.Defect for wrapped errors
 */
export class NetworkError extends Schema.TaggedError<NetworkError>()(
  "NetworkError",
  {
    url: Schema.String,
    operation: Schema.String,
    cause: Schema.Defect,
  },
) {}

/**
 * HTTP Error - API returned error status
 *
 * WHY CAPTURE STATUS CODE?
 * - 4xx errors (client errors) → Don't retry, fix request
 * - 5xx errors (server errors) → Retry with backoff
 * - 429 (rate limit) → Back off and retry after delay
 * - 404 (not found) → Maybe location ID invalid
 *
 * PATTERN: Different handling based on status code
 * ```typescript
 * yield* api.fetch(...).pipe(
 *   Effect.catchTag("HttpError", (error) => {
 *     if (error.statusCode === 429) return Effect.retry(schedule)
 *     if (error.statusCode >= 500) return Effect.retry(schedule)
 *     return Effect.fail(error)  // Don't retry 4xx
 *   })
 * )
 * ```
 */
export class HttpError extends Schema.TaggedError<HttpError>()(
  "HttpError",
  {
    url: Schema.String,
    method: Schema.String,
    statusCode: Schema.Number,
    statusText: Schema.String,
    body: Schema.optional(Schema.String),
  },
) {}

/**
 * Rate Limit Error - Too many requests
 *
 * WHY SEPARATE FROM HTTP ERROR?
 * - Specific handling (wait before retry)
 * - Track rate limit state
 * - Implement backoff strategies
 * - Monitor quota usage
 *
 * DEMONSTRATES:
 * - Optional fields (retryAfter from API headers)
 * - Domain-specific error types
 * - Context for retry strategies
 *
 * PATTERN: Exponential backoff with retry-after header
 * ```typescript
 * Effect.retry(
 *   program,
 *   Schedule.exponential("1 second").pipe(
 *     Schedule.union(Schedule.spaced("5 seconds"))
 *   )
 * )
 * ```
 */
export class RateLimitError extends Schema.TaggedError<RateLimitError>()(
  "RateLimitError",
  {
    limit: Schema.Number,
    remaining: Schema.Number,
    resetAt: Schema.Date,
    retryAfterSeconds: Schema.optional(Schema.Number),
  },
) {}

/**
 * Invalid Response Error - API returned unexpected data
 *
 * WHEN IT HAPPENS:
 * - API changed schema (breaking change)
 * - Corrupted response
 * - API bug
 * - Wrong API endpoint
 *
 * WHY CAPTURE PARSE ERROR?
 * - Debugging (know what failed to parse)
 * - Logging (send to error tracking service)
 * - Monitoring (detect API schema changes)
 *
 * DEMONSTRATES:
 * - Schema.Defect for ParseError
 * - Preserving response body for debugging
 */
export class InvalidResponseError extends Schema.TaggedError<InvalidResponseError>()(
  "InvalidResponseError",
  {
    url: Schema.String,
    expectedSchema: Schema.String,
    responseBody: Schema.String,
    parseError: Schema.Defect,
  },
) {}

/**
 * Cache Errors - Caching layer failures
 *
 * WHY CACHE-SPECIFIC ERRORS?
 * - Cache miss is not an error (use fallback)
 * - Cache full requires eviction strategy
 * - Expired entries need refresh
 *
 * PATTERN: Cache aside pattern
 * ```typescript
 * const getData = (key: string) =>
 *   cache.get(key).pipe(
 *     Effect.catchTag("CacheMissError", () =>
 *       Effect.gen(function*() {
 *         const data = yield* api.fetch(key)
 *         yield* cache.set(key, data)
 *         return data
 *       })
 *     )
 *   )
 * ```
 */

/**
 * Cache Miss - Key not found in cache
 *
 * WHY NOT AN ERROR?
 * - Expected condition (cache is empty on startup)
 * - Triggers fallback to API
 * - Part of normal flow
 *
 * BUT WHY MODEL AS ERROR?
 * - Type-safe flow control
 * - Explicit handling required
 * - Better than Option (captures context)
 *
 * DEMONSTRATES: Errors for control flow
 */
export class CacheMissError extends Schema.TaggedError<CacheMissError>()(
  "CacheMissError",
  {
    key: Schema.String,
  },
) {}

/**
 * Cache Expired - Entry exists but is stale
 *
 * WHY SEPARATE FROM MISS?
 * - Different handling (could serve stale + refresh background)
 * - Metrics (track hit/miss/stale rates)
 * - Debugging (know cache is working but data is old)
 */
export class CacheExpiredError extends Schema.TaggedError<CacheExpiredError>()(
  "CacheExpiredError",
  {
    key: Schema.String,
    cachedAt: Schema.Date,
    expiresAt: Schema.Date,
  },
) {}

/**
 * Cache Full - Cannot add more entries
 *
 * WHEN IT HAPPENS:
 * - Cache size limit reached
 * - Memory constraints
 * - No eviction policy set
 *
 * HOW TO HANDLE:
 * - Evict LRU entries
 * - Increase cache size
 * - Log warning (might need bigger cache)
 */
export class CacheFullError extends Schema.TaggedError<CacheFullError>()(
  "CacheFullError",
  {
    maxSize: Schema.Number,
    currentSize: Schema.Number,
  },
) {}

/**
 * Storage Errors - File system operations
 *
 * SIMILAR TO TASK APP:
 * - FileSystemError for I/O operations
 * - Different operations (read, write, mkdir)
 *
 * BUT ALSO:
 * - Quota exceeded (disk full)
 * - Permission denied
 * - File locked (concurrent access)
 */
export class FileSystemError extends Schema.TaggedError<FileSystemError>()(
  "FileSystemError",
  {
    operation: Schema.String,
    path: Schema.String,
    error: Schema.Defect,
  },
) {}

/**
 * Validation Errors - Data constraint violations
 *
 * WHEN IT HAPPENS:
 * - Temperature out of range
 * - Invalid coordinates (lat > 90, lon > 180)
 * - Missing required fields
 *
 * WHY VALIDATION ERROR?
 * - Catch bad data early
 * - Prevent garbage in, garbage out
 * - Better error messages than generic "invalid"
 */
export class ValidationError extends Schema.TaggedError<ValidationError>()(
  "ValidationError",
  {
    field: Schema.String,
    value: Schema.String,
    message: Schema.String,
  },
) {}

/**
 * Location Not Found - Invalid location ID
 *
 * WHEN IT HAPPENS:
 * - User provides wrong location ID
 * - Location was deleted
 * - Typo in location name
 *
 * PATTERN: Same as task app NotFoundError
 * - Resource type + ID
 * - Specific to domain (Location instead of generic resource)
 */
export class LocationNotFoundError extends Schema.TaggedError<LocationNotFoundError>()(
  "LocationNotFoundError",
  {
    locationId: Schema.String,
  },
) {}

/**
 * Timeout Error - Operation took too long
 *
 * WHY SEPARATE FROM NETWORK ERROR?
 * - Different handling (retry with longer timeout)
 * - Monitoring (track slow endpoints)
 * - SLA tracking
 *
 * DEMONSTRATES:
 * - Timeout configuration
 * - Duration tracking
 */
export class TimeoutError extends Schema.TaggedError<TimeoutError>()(
  "TimeoutError",
  {
    operation: Schema.String,
    timeoutMs: Schema.Number,
  },
) {}

/**
 * Configuration Error - Invalid configuration
 *
 * WHEN IT HAPPENS:
 * - Missing required environment variables
 * - Invalid configuration values
 * - Configuration validation fails
 *
 * WHY AT STARTUP?
 * - Fail fast (don't run with bad config)
 * - Better than runtime errors
 * - Clear error messages
 */
export class ConfigError extends Schema.TaggedError<ConfigError>()(
  "ConfigError",
  {
    key: Schema.String,
    message: Schema.String,
  },
) {}

/**
 * Union of all errors
 *
 * WHY UNION TYPE?
 * - Single type for "any app error"
 * - Can handle all errors with catchTags
 * - Type-safe exhaustive handling
 *
 * PATTERN: Group errors by category
 * - API errors: NetworkError, HttpError, RateLimitError
 * - Cache errors: CacheMissError, CacheExpiredError
 * - Storage errors: FileSystemError
 * - Validation errors: ValidationError, LocationNotFoundError
 */
export type WeatherAppError =
  | NetworkError
  | HttpError
  | RateLimitError
  | InvalidResponseError
  | CacheMissError
  | CacheExpiredError
  | CacheFullError
  | FileSystemError
  | ValidationError
  | LocationNotFoundError
  | TimeoutError
  | ConfigError;

/**
 * LEARNING NOTES - Advanced Error Handling:
 *
 * 1. ERROR GRANULARITY:
 *
 *    Too coarse (bad):
 *    ```typescript
 *    class ApiError extends TaggedError<ApiError>()("ApiError", {
 *      message: Schema.String
 *    })
 *    ```
 *    - Can't distinguish between network error, 404, 500, rate limit
 *    - All errors handled the same way
 *    - No retry strategy
 *
 *    Too fine (bad):
 *    ```typescript
 *    class Api404Error, Api500Error, Api503Error, Api429Error ...
 *    ```
 *    - Too many error types
 *    - Hard to maintain
 *    - Overspecialization
 *
 *    Just right (good):
 *    ```typescript
 *    class HttpError {
 *      statusCode: number
 *    }
 *    class RateLimitError { ... }
 *    class NetworkError { ... }
 *    ```
 *    - Captures important distinctions
 *    - Allows different handling strategies
 *    - Not too many types
 *
 * 2. RETRY STRATEGIES:
 *
 *    ```typescript
 *    const weatherData = fetchWeather(location).pipe(
 *      Effect.retry({
 *        schedule: Schedule.exponential("1 second").pipe(
 *          Schedule.intersect(Schedule.recurs(3))
 *        ),
 *        while: (error) =>
 *          error._tag === "NetworkError" ||
 *          error._tag === "HttpError" && error.statusCode >= 500
 *      })
 *    )
 *    ```
 *
 * 3. CACHE ASIDE PATTERN:
 *
 *    ```typescript
 *    const getData = (key: string) =>
 *      Effect.gen(function*() {
 *        const cached = yield* cache.get(key).pipe(
 *          Effect.catchTags({
 *            CacheMissError: () => Effect.succeed(Option.none()),
 *            CacheExpiredError: () => Effect.succeed(Option.none())
 *          })
 *        )
 *
 *        if (Option.isSome(cached)) {
 *          return cached.value
 *        }
 *
 *        const fresh = yield* api.fetch(key)
 *        yield* cache.set(key, fresh)
 *        return fresh
 *      })
 *    ```
 *
 * 4. GRACEFUL DEGRADATION:
 *
 *    ```typescript
 *    const weather = getWeather(location).pipe(
 *      Effect.catchTags({
 *        NetworkError: () => getCachedWeather(location),
 *        RateLimitError: () => Effect.sleep("5 seconds").pipe(
 *          Effect.flatMap(() => getWeather(location))
 *        ),
 *        LocationNotFoundError: (e) => Effect.fail(e)  // Don't retry
 *      })
 *    )
 *    ```
 *
 * 5. ERROR CONTEXT:
 *
 *    Good (has context):
 *    ```typescript
 *    HttpError.make({
 *      url: "https://api.weather.com/data",
 *      method: "GET",
 *      statusCode: 404,
 *      statusText: "Not Found",
 *      body: '{"error": "Location not found"}'
 *    })
 *    ```
 *    - Know exactly what failed
 *    - Can debug from logs
 *    - Can retry with different parameters
 *
 *    Bad (no context):
 *    ```typescript
 *    new Error("API call failed")
 *    ```
 *    - What API?
 *    - What endpoint?
 *    - Why did it fail?
 *
 * 6. MONITORING & OBSERVABILITY:
 *
 *    ```typescript
 *    const withMetrics = <A, E>(
 *      effect: Effect.Effect<A, E>,
 *      operation: string
 *    ) =>
 *      effect.pipe(
 *        Effect.tap(() => metrics.increment(`${operation}.success`)),
 *        Effect.tapError((error) =>
 *          metrics.increment(`${operation}.error.${error._tag}`)
 *        )
 *      )
 *    ```
 *
 * 7. ERROR RECOVERY LADDER:
 *
 *    1. Retry (transient errors)
 *    2. Fallback to cache (stale data better than no data)
 *    3. Degrade features (show partial data)
 *    4. Fail gracefully (informative error to user)
 *
 *    ```typescript
 *    getFreshWeather(location).pipe(
 *      Effect.retry(retrySchedule),           // Step 1
 *      Effect.orElse(() => getCached(location)),  // Step 2
 *      Effect.orElse(() => getDefaultWeather()),  // Step 3
 *      Effect.catchAll((e) => showError(e))   // Step 4
 *    )
 *    ```
 *
 * 8. WHEN TO USE EACH ERROR TYPE:
 *
 *    NetworkError:
 *    - DNS failures, connection timeouts, network unreachable
 *    - Retry with exponential backoff
 *
 *    HttpError:
 *    - 4xx, 5xx status codes
 *    - Retry 5xx, don't retry 4xx
 *
 *    RateLimitError:
 *    - 429 Too Many Requests
 *    - Wait and retry (respect retry-after header)
 *
 *    InvalidResponseError:
 *    - Schema validation fails
 *    - Log and alert (API might have changed)
 *
 *    CacheMissError:
 *    - Normal flow (fetch from API)
 *
 *    CacheExpiredError:
 *    - Could serve stale + refresh background
 *
 *    ValidationError:
 *    - Bad input data
 *    - Don't retry, fix input
 *
 *    TimeoutError:
 *    - Retry with longer timeout or fail
 *
 * 9. COMPARED TO TASK APP:
 *
 *    Task app (CRUD focus):
 *    - NotFoundError (resource doesn't exist)
 *    - DuplicateError (constraint violation)
 *    - UnauthorizedError (permission denied)
 *    - ValidationError (invalid input)
 *    - FileSystemError (storage layer)
 *
 *    Weather app (external systems focus):
 *    - NetworkError (infrastructure failures)
 *    - HttpError (API errors)
 *    - RateLimitError (quota management)
 *    - CacheMissError (caching strategy)
 *    - TimeoutError (performance issues)
 *    - InvalidResponseError (integration issues)
 *
 * 10. BEST PRACTICES:
 *    ✅ Capture relevant context (URL, status code, timestamp)
 *    ✅ Different errors for different retry strategies
 *    ✅ Use Schema.Defect for unknown errors
 *    ✅ Group related errors (API, Cache, Storage)
 *    ✅ Make errors actionable (what to do when error occurs)
 *    ✅ Don't swallow errors (always handle or propagate)
 *    ✅ Log errors with context (for debugging and monitoring)
 */
