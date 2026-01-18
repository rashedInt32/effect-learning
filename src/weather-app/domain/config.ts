import { Config } from "effect";

/**
 * APPLICATION CONFIGURATION - Effect.Config for Type-Safe Environment Variables
 *
 * WHY Effect.Config?
 * - Type-safe access to environment variables
 * - Validation at startup (fail fast if config is wrong)
 * - Default values and transformations
 * - Composable configuration
 * - Testable (can provide test configs)
 *
 * COMPARED TO TRADITIONAL APPROACH:
 * ```typescript
 * // Traditional (error-prone):
 * const apiKey = process.env.API_KEY  // string | undefined - no validation!
 * const port = parseInt(process.env.PORT || "3000")  // manual parsing
 * const debug = process.env.DEBUG === "true"  // manual boolean conversion
 * ```
 *
 * ```typescript
 * // Effect.Config (type-safe):
 * const apiKey = Config.string("API_KEY")  // Effect<string, ConfigError>
 * const port = Config.number("PORT").pipe(Config.withDefault(3000))
 * const debug = Config.boolean("DEBUG").pipe(Config.withDefault(false))
 * ```
 *
 * WHEN TO USE:
 * - Reading environment variables
 * - Configuration files
 * - Feature flags
 * - API keys and secrets
 * - Application settings
 */

/**
 * Weather API Configuration
 *
 * DEMONSTRATES:
 * - Config.string: Reading string values from environment
 * - Config.withDefault: Providing fallback values
 * - Config.validate: Adding custom validation
 * - Config.map: Transforming config values
 *
 * WHY SEPARATE API CONFIG?
 * - Groups related configuration
 * - Easy to swap providers (OpenWeather, WeatherAPI, etc.)
 * - Testable (can provide mock API config)
 *
 * PATTERN: Use withDefault for non-critical settings
 * - Base URL can have default (most users use same endpoint)
 * - API key should NOT have default (security risk)
 * - Timeout can have sensible default
 */
export const WeatherApiConfig = Config.all({
  /**
   * API Key - Required, no default
   *
   * WHY NO DEFAULT?
   * - Security: API keys should be secret
   * - Fail fast: App won't work without valid key
   * - Explicit: Forces developer to set up environment
   *
   * HOW TO USE:
   * - Set environment variable: WEATHER_API_KEY=your-key-here
   * - Or in .env file: WEATHER_API_KEY=your-key-here
   * - Effect will fail at startup if missing
   */
  apiKey: Config.string("WEATHER_API_KEY"),

  /**
   * Base URL - Optional, has default
   *
   * WHY DEFAULT?
   * - Most users use the same API endpoint
   * - Can override for testing (point to mock server)
   * - Can override for different providers
   *
   * PATTERN: Config.withDefault for optional settings
   */
  baseUrl: Config.string("WEATHER_API_BASE_URL").pipe(
    Config.withDefault("https://api.openweathermap.org/data/2.5"),
  ),

  /**
   * Request timeout in milliseconds
   *
   * DEMONSTRATES:
   * - Config.number: Parsing numeric values from strings
   * - Config.withDefault: Fallback value
   * - Config.validate: Custom validation rules
   *
   * WHY VALIDATE?
   * - Timeout must be positive (negative timeout makes no sense)
   * - Too small causes failures (< 100ms unrealistic)
   * - Too large causes hangs (> 60s probably wrong)
   */
  timeoutMs: Config.number("WEATHER_API_TIMEOUT_MS").pipe(
    Config.withDefault(5000),
    Config.validate({
      message: "Timeout must be between 100ms and 60000ms",
      validation: (n) => n >= 100 && n <= 60000,
    }),
  ),

  /**
   * Rate limiting - Max requests per minute
   *
   * WHY RATE LIMIT?
   * - Prevent API quota exhaustion
   * - Respect API provider limits
   * - Avoid unexpected costs
   *
   * DEMONSTRATES: Validation for business rules
   */
  maxRequestsPerMinute: Config.number("WEATHER_API_MAX_REQUESTS_PER_MIN").pipe(
    Config.withDefault(60),
    Config.validate({
      message: "Max requests per minute must be between 1 and 1000",
      validation: (n) => n >= 1 && n <= 1000,
    }),
  ),
});

/**
 * Cache Configuration
 *
 * DEMONSTRATES:
 * - Duration-based configs (TTL)
 * - Boolean flags (enabled/disabled)
 * - Nested configuration structures
 *
 * WHY CONFIGURABLE CACHE?
 * - Development: Disable cache to see fresh data
 * - Production: Enable cache to reduce API calls
 * - Testing: Short TTL to test expiration logic
 *
 * PATTERN: Enable/disable features via config
 * ```typescript
 * const cache = yield* CacheConfig
 * if (cache.enabled) {
 *   // Check cache first
 * }
 * ```
 */
export const CacheConfig = Config.all({
  /**
   * Enable/disable caching
   *
   * DEMONSTRATES: Config.boolean for feature flags
   * - Reads "true", "false", "1", "0", "yes", "no"
   * - Case-insensitive
   * - Fails on invalid values
   */
  enabled: Config.boolean("CACHE_ENABLED").pipe(Config.withDefault(true)),

  /**
   * Time-to-live in seconds
   *
   * WHY TTL?
   * - Weather data becomes stale quickly
   * - Balance between freshness and API usage
   * - 5 minutes is reasonable for weather updates
   *
   * DEMONSTRATES: Duration configuration pattern
   */
  ttlSeconds: Config.number("CACHE_TTL_SECONDS").pipe(
    Config.withDefault(300),
    Config.validate({
      message: "Cache TTL must be between 10 and 3600 seconds",
      validation: (n) => n >= 10 && n <= 3600,
    }),
  ),

  /**
   * Maximum cache size (number of entries)
   *
   * WHY LIMIT SIZE?
   * - Prevent memory exhaustion
   * - LRU eviction when full
   * - Predictable memory usage
   */
  maxSize: Config.number("CACHE_MAX_SIZE").pipe(
    Config.withDefault(100),
    Config.validate({
      message: "Cache max size must be between 1 and 10000",
      validation: (n) => n >= 1 && n <= 10000,
    }),
  ),
});

/**
 * Storage Configuration
 *
 * DEMONSTRATES:
 * - File path configuration
 * - Directory structure setup
 * - Persistence settings
 *
 * WHY CONFIGURABLE STORAGE?
 * - Development: Store in /tmp for easy cleanup
 * - Production: Store in /var/lib or similar
 * - Testing: Use test-specific directories
 */
export const StorageConfig = Config.all({
  /**
   * Data directory path
   *
   * WHY CONFIGURABLE PATH?
   * - Different environments need different paths
   * - Docker containers use different paths
   * - Testing needs isolated directories
   */
  dataDir: Config.string("WEATHER_DATA_DIR").pipe(
    Config.withDefault("./data/weather"),
  ),

  /**
   * Auto-save interval in seconds
   *
   * DEMONSTRATES: Periodic task configuration
   * - 0 means disabled (manual save only)
   * - > 0 means auto-save every N seconds
   */
  autoSaveIntervalSeconds: Config.number(
    "WEATHER_STORAGE_AUTO_SAVE_INTERVAL_SECONDS",
  ).pipe(
    Config.withDefault(60),
    Config.validate({
      message:
        "Auto-save interval must be 0 (disabled) or between 10 and 3600 seconds",
      validation: (n) => n === 0 || (n >= 10 && n <= 3600),
    }),
  ),
});

/**
 * Stream Configuration
 *
 * DEMONSTRATES:
 * - Real-time update settings
 * - Polling intervals
 * - Concurrency limits
 *
 * WHY CONFIGURE STREAMING?
 * - Control update frequency
 * - Manage resource usage
 * - Test different scenarios
 */
export const StreamConfig = Config.all({
  /**
   * Poll interval in seconds
   *
   * WHY CONFIGURABLE POLLING?
   * - Development: Fast polling (5s) for quick feedback
   * - Production: Slower polling (60s) to respect API limits
   * - Testing: Very fast (1s) to test behavior quickly
   *
   * PATTERN: Different intervals for different environments
   */
  pollIntervalSeconds: Config.number("WEATHER_STREAM_POLL_INTERVAL_SECONDS").pipe(
    Config.withDefault(30),
    Config.validate({
      message: "Stream poll interval must be between 1 and 3600 seconds",
      validation: (n) => n >= 1 && n <= 3600,
    }),
  ),

  /**
   * Maximum concurrent location updates
   *
   * WHY LIMIT CONCURRENCY?
   * - Prevent API rate limit violations
   * - Control resource usage
   * - Avoid overwhelming the system
   *
   * DEMONSTRATES: Concurrency control via config
   */
  maxConcurrentLocations: Config.number(
    "WEATHER_STREAM_MAX_CONCURRENT_LOCATIONS",
  ).pipe(
    Config.withDefault(5),
    Config.validate({
      message: "Max concurrent locations must be between 1 and 100",
      validation: (n) => n >= 1 && n <= 100,
    }),
  ),

  /**
   * Buffer size for stream processing
   *
   * WHY BUFFER?
   * - Handle bursts of data
   * - Smooth out processing
   * - Prevent backpressure issues
   */
  bufferSize: Config.number("WEATHER_STREAM_BUFFER_SIZE").pipe(
    Config.withDefault(10),
    Config.validate({
      message: "Stream buffer size must be between 1 and 1000",
      validation: (n) => n >= 1 && n <= 1000,
    }),
  ),
});

/**
 * Application-wide Configuration
 *
 * DEMONSTRATES:
 * - Config composition (combining multiple configs)
 * - Nested configuration structures
 * - Single source of truth for all settings
 *
 * WHY COMPOSE CONFIGS?
 * - Load all configs at once
 * - Fail fast if any required config missing
 * - Single validation point
 * - Easy to provide in layers
 *
 * PATTERN: Compose all configs into one
 * ```typescript
 * const appConfig = yield* AppConfig
 * const apiKey = appConfig.api.apiKey
 * const cacheEnabled = appConfig.cache.enabled
 * ```
 */
export const AppConfig = Config.all({
  api: WeatherApiConfig,
  cache: CacheConfig,
  storage: StorageConfig,
  stream: StreamConfig,
});

export type AppConfig = Config.Config.Success<typeof AppConfig>;
export type WeatherApiConfigType = Config.Config.Success<typeof WeatherApiConfig>;
export type CacheConfigType = Config.Config.Success<typeof CacheConfig>;
export type StorageConfigType = Config.Config.Success<typeof StorageConfig>;
export type StreamConfigType = Config.Config.Success<typeof StreamConfig>;

/**
 * LEARNING NOTES - Effect.Config Patterns:
 *
 * 1. READING CONFIG:
 *    ```typescript
 *    // In a service
 *    Effect.gen(function*() {
 *      const config = yield* AppConfig
 *      const apiKey = config.api.apiKey
 *      // Use apiKey...
 *    })
 *    ```
 *
 * 2. PROVIDING CONFIG (in tests):
 *    ```typescript
 *    const testConfig = Config.succeed({
 *      api: { apiKey: "test-key", ... },
 *      cache: { enabled: false, ... },
 *      ...
 *    })
 *    Effect.provide(program, Layer.setConfigProvider(testConfig))
 *    ```
 *
 * 3. VALIDATION PATTERNS:
 *
 *    Range validation:
 *    ```typescript
 *    Config.number("PORT").pipe(
 *      Config.validate({
 *        message: () => "Port must be 1-65535",
 *        validation: (n) => n >= 1 && n <= 65535
 *      })
 *    )
 *    ```
 *
 *    Format validation:
 *    ```typescript
 *    Config.string("EMAIL").pipe(
 *      Config.validate({
 *        message: () => "Invalid email format",
 *        validation: (s) => s.includes("@")
 *      })
 *    )
 *    ```
 *
 * 4. DEFAULT VALUES:
 *
 *    Simple default:
 *    ```typescript
 *    Config.number("TIMEOUT").pipe(Config.withDefault(5000))
 *    ```
 *
 *    Computed default:
 *    ```typescript
 *    Config.string("LOG_LEVEL").pipe(
 *      Config.withDefault(
 *        process.env.NODE_ENV === "production" ? "info" : "debug"
 *      )
 *    )
 *    ```
 *
 * 5. TRANSFORMATIONS:
 *
 *    Parse and transform:
 *    ```typescript
 *    Config.string("DATABASE_URL").pipe(
 *      Config.map(url => new URL(url))
 *    )
 *    ```
 *
 *    Convert units:
 *    ```typescript
 *    Config.number("TIMEOUT_SECONDS").pipe(
 *      Config.map(seconds => seconds * 1000)  // Convert to ms
 *    )
 *    ```
 *
 * 6. NESTED CONFIGS:
 *    ```typescript
 *    const DatabaseConfig = Config.all({
 *      host: Config.string("DB_HOST"),
 *      port: Config.number("DB_PORT"),
 *      auth: Config.all({
 *        user: Config.string("DB_USER"),
 *        pass: Config.secret("DB_PASS")  // Config.secret for sensitive data
 *      })
 *    })
 *    ```
 *
 * 7. OPTIONAL VS REQUIRED:
 *
 *    Required (fails if missing):
 *    ```typescript
 *    Config.string("API_KEY")  // Must be set
 *    ```
 *
 *    Optional (with default):
 *    ```typescript
 *    Config.string("API_KEY").pipe(Config.withDefault(""))
 *    ```
 *
 *    Optional (can be undefined):
 *    ```typescript
 *    Config.option(Config.string("API_KEY"))  // Option<string>
 *    ```
 *
 * 8. SECRETS:
 *    ```typescript
 *    Config.secret("API_KEY")  // Returns Secret type (not logged)
 *    ```
 *    - Secret values are redacted in logs
 *    - Prevents accidental exposure
 *    - Use for passwords, tokens, keys
 *
 * 9. ARRAY CONFIGS:
 *    ```typescript
 *    Config.array(Config.string("ALLOWED_ORIGINS"), ",")
 *    // ALLOWED_ORIGINS=http://localhost:3000,http://example.com
 *    // → ["http://localhost:3000", "http://example.com"]
 *    ```
 *
 * 10. ENVIRONMENT-SPECIFIC CONFIGS:
 *    ```typescript
 *    const config = Config.all({
 *      env: Config.string("NODE_ENV").pipe(Config.withDefault("development")),
 *      debug: Config.boolean("DEBUG").pipe(
 *        Config.orElse(() =>
 *          Config.map(
 *            Config.string("NODE_ENV"),
 *            env => env !== "production"
 *          )
 *        )
 *      )
 *    })
 *    ```
 *
 * 11. BENEFITS:
 *    ✅ Type-safe (config errors caught at startup)
 *    ✅ Validated (constraints enforced)
 *    ✅ Documented (types explain expected values)
 *    ✅ Testable (easy to provide test configs)
 *    ✅ Composable (build complex from simple)
 *    ✅ Fail-fast (missing/invalid config stops app immediately)
 *
 * 12. COMPARED TO ALTERNATIVES:
 *
 *    process.env (no safety):
 *    ```typescript
 *    const port = process.env.PORT || "3000"  // string, not number!
 *    const timeout = parseInt(process.env.TIMEOUT)  // NaN if invalid
 *    ```
 *
 *    dotenv + validation libraries (more boilerplate):
 *    ```typescript
 *    import dotenv from "dotenv"
 *    import { z } from "zod"
 *    dotenv.config()
 *    const schema = z.object({ PORT: z.string() })
 *    const config = schema.parse(process.env)
 *    ```
 *
 *    Effect.Config (integrated):
 *    ```typescript
 *    const port = Config.number("PORT")  // Done!
 *    ```
 */
