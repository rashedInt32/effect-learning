import { Context, Effect, Layer } from "effect";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { WeatherReading, Location } from "../domain/models";
import { FileSystemError } from "../errors";
import { ParseResult, Schema } from "effect";
import type { StorageConfigType } from "../domain/config";

/**
 * STORAGE SERVICE - File-based persistence for weather data
 *
 * This demonstrates:
 * - File operations with Effect.tryPromise
 * - Schema encoding/decoding for JSON serialization
 * - Error handling for file system operations
 * - Separating infrastructure from business logic
 *
 * SIMILAR TO TASK APP:
 * - Both use file-based storage
 * - Both use Schema.encode/decode
 * - Both wrap fs errors in FileSystemError
 *
 * DIFFERENT FROM TASK APP:
 * - Weather data instead of tasks/users
 * - Location tracking
 * - Historical readings storage
 *
 * KEY LEARNING: Infrastructure layer pattern
 * - Business logic doesn't know about files
 * - Can swap implementations (files → database)
 * - Easy to test (mock storage)
 */

/**
 * Storage Interface - The contract for persistence
 *
 * WHY AN INTERFACE?
 * - Defines WHAT operations are available
 * - Doesn't specify HOW they work (files, DB, memory)
 * - Allows swapping implementations
 *
 * DEMONSTRATES:
 * - Context.Tag for service definition
 * - Effect return types with explicit errors
 * - Separation of concerns
 *
 * OPERATIONS:
 * - saveLocations: Persist tracked locations
 * - loadLocations: Retrieve tracked locations
 * - saveReadings: Persist weather readings (history)
 * - loadReadings: Retrieve weather readings
 */
export class Storage extends Context.Tag("Storage")<
  Storage,
  {
    readonly saveLocations: (
      locations: Location[],
    ) => Effect.Effect<void, FileSystemError | ParseResult.ParseError>;
    readonly loadLocations: () => Effect.Effect<
      Location[],
      FileSystemError | ParseResult.ParseError
    >;
    readonly saveReadings: (
      readings: WeatherReading[],
    ) => Effect.Effect<void, FileSystemError | ParseResult.ParseError>;
    readonly loadReadings: () => Effect.Effect<
      WeatherReading[],
      FileSystemError | ParseResult.ParseError
    >;
  }
>() {}

/**
 * FileStorage Implementation - Actual file system operations
 *
 * DEMONSTRATES:
 * - Effect.tryPromise for async file operations
 * - Schema.encode/decode for JSON serialization
 * - Directory creation (ensure data dir exists)
 * - Error wrapping (fs errors → FileSystemError)
 *
 * KEY PATTERN: Same as task app storage
 * 1. Ensure directory exists
 * 2. Encode data to JSON format (Schema.encode)
 * 3. Write to file
 * 4. Read from file
 * 5. Decode from JSON (Schema.decode)
 */
export const makeFileStorage = (config: StorageConfigType) => {
  const locationsPath = join(config.dataDir, "locations.json");
  const readingsPath = join(config.dataDir, "readings.json");

  /**
   * Ensure directory exists
   *
   * WHY Effect.tryPromise?
   * - fs.mkdir returns Promise
   * - Promise can reject with any error
   * - tryPromise converts to Effect with typed error
   *
   * DEMONSTRATES:
   * - Converting async operations to Effects
   * - Error transformation (unknown → FileSystemError)
   * - Schema.Defect for wrapping unknown errors
   */
  const ensureDir = Effect.tryPromise({
    try: () => fs.mkdir(config.dataDir, { recursive: true }),
    catch: (error) =>
      FileSystemError.make({
        operation: "mkdir",
        path: config.dataDir,
        error,
      }),
  });

  /**
   * Save data to file
   *
   * FLOW:
   * 1. Ensure directory exists
   * 2. Encode data with Schema (runtime → JSON format)
   * 3. Write to file
   *
   * WHY Schema.encode?
   * - Our models have branded types (LocationId, WeatherReadingId)
   * - Dates are Date objects, not strings
   * - Nested structures (coordinates, location)
   * - encode transforms to JSON-safe primitives
   *
   * KEY LEARNING: Schema has two representations
   * - Type (runtime): Location with Date objects, branded types
   * - Encoded (JSON): Plain object with string dates, plain strings
   *
   * DEMONSTRATES:
   * - Effect.all for parallel encoding
   * - Effect.tryPromise for file write
   * - Error context (operation, path)
   */
  const saveData = <A, I>(
    filePath: string,
    data: A[],
    schema: Schema.Schema<A, I>,
  ): Effect.Effect<void, FileSystemError | ParseResult.ParseError> =>
    Effect.gen(function* () {
      yield* ensureDir;
      const encoded = yield* Effect.all(
        data.map((item) => Schema.encode(schema)(item)),
      );
      yield* Effect.tryPromise({
        try: () => fs.writeFile(filePath, JSON.stringify(encoded, null, 2)),
        catch: (error) =>
          FileSystemError.make({
            operation: "writeFile",
            path: filePath,
            error,
          }),
      });
    });

  /**
   * Load data from file
   *
   * FLOW:
   * 1. Read file
   * 2. Parse JSON (gets plain objects)
   * 3. Decode with Schema (JSON format → runtime)
   * 4. If file not found, return empty array
   *
   * WHY Schema.decode?
   * - Validates data structure (corrupted file?)
   * - Transforms primitives to branded types
   * - Converts string dates to Date objects
   * - Ensures data integrity
   *
   * DEMONSTRATES:
   * - Effect.tryPromise for file read
   * - Schema.decode for validation
   * - catchTag for specific error handling
   * - Returning empty array for missing file (not an error)
   *
   * PATTERN: File not found → empty array
   * - Common in storage layer
   * - Avoids error on first run
   * - Graceful degradation
   */
  const loadData = <A, I>(
    filePath: string,
    schema: Schema.Schema<A, I>,
  ): Effect.Effect<A[], FileSystemError | ParseResult.ParseError> =>
    Effect.gen(function* () {
      const content = yield* Effect.tryPromise({
        try: () => fs.readFile(filePath, "utf-8"),
        catch: (error) =>
          FileSystemError.make({
            operation: "readFile",
            path: filePath,
            error,
          }),
      });

      const parsed = JSON.parse(content) as I[];
      return yield* Effect.all(
        parsed.map((item) => Schema.decode(schema)(item)),
      );
    }).pipe(
      Effect.catchTag("FileSystemError", (error) => {
        const errorObj = error.error as {
          name?: string;
          code?: string;
          message?: string;
        };
        if (errorObj && errorObj.code === "ENOENT") {
          return Effect.succeed([]);
        }
        return Effect.fail(error);
      }),
    );

  /**
   * Return service implementation
   *
   * DEMONSTRATES:
   * - Storage.of for creating service instance
   * - Binding file paths to operations
   * - Schema-specific operations (Location, WeatherReading)
   */
  return Storage.of({
    saveLocations: (locations) => saveData(locationsPath, locations, Location),
    loadLocations: () => loadData(locationsPath, Location),
    saveReadings: (readings) => saveData(readingsPath, readings, WeatherReading),
    loadReadings: () => loadData(readingsPath, WeatherReading),
  });
};

/**
 * Storage Layer - Dependency injection
 *
 * WHY Layer.succeed?
 * - Simple construction (no async operations)
 * - No dependencies needed
 * - Synchronous service creation
 *
 * DEMONSTRATES:
 * - Layer.succeed for sync service construction
 * - Providing config to makeFileStorage
 * - Service provision pattern
 *
 * HOW IT WORKS:
 * 1. Layer depends on StorageConfig
 * 2. makeFileStorage creates service
 * 3. Layer provides Storage to dependents
 *
 * ALTERNATIVE: Layer.effect if construction is async
 * ```typescript
 * Layer.effect(Storage, Effect.gen(function*() {
 *   const db = yield* connectToDatabase()
 *   return Storage.of({ ... })
 * }))
 * ```
 */
export const makeStorageLayer = (config: StorageConfigType) =>
  Layer.succeed(Storage, makeFileStorage(config));

/**
 * LEARNING NOTES - File Storage Pattern:
 *
 * 1. SCHEMA ENCODE/DECODE:
 *
 *    Runtime → JSON (encode):
 *    ```typescript
 *    const location = new Location({
 *      id: LocationId.make("loc-123"),
 *      name: "Tokyo",
 *      coordinates: {
 *        latitude: Latitude.make(35.6762),
 *        longitude: Longitude.make(139.6503)
 *      }
 *    })
 *
 *    const encoded = yield* Schema.encode(Location)(location)
 *    // {
 *    //   id: "loc-123",           // Branded type → string
 *    //   name: "Tokyo",
 *    //   coordinates: {
 *    //     latitude: 35.6762,     // Branded number → number
 *    //     longitude: 139.6503
 *    //   }
 *    // }
 *    ```
 *
 *    JSON → Runtime (decode):
 *    ```typescript
 *    const json = {
 *      id: "loc-123",
 *      name: "Tokyo",
 *      coordinates: { latitude: 35.6762, longitude: 139.6503 }
 *    }
 *
 *    const location = yield* Schema.decode(Location)(json)
 *    // Location with branded types, validated ranges
 *    ```
 *
 * 2. ERROR HANDLING:
 *
 *    ```typescript
 *    loadData(filePath, schema).pipe(
 *      Effect.catchTag("FileSystemError", (error) => {
 *        // File not found? Return empty array
 *        if (error.error.code === "ENOENT") {
 *          return Effect.succeed([])
 *        }
 *        // Other errors bubble up
 *        return Effect.fail(error)
 *      })
 *    )
 *    ```
 *
 * 3. DIRECTORY CREATION:
 *
 *    ```typescript
 *    const ensureDir = Effect.tryPromise({
 *      try: () => fs.mkdir(dataDir, { recursive: true }),
 *      catch: (error) => FileSystemError.make({ operation: "mkdir", path: dataDir, error })
 *    })
 *
 *    // Use before writing
 *    Effect.gen(function*() {
 *      yield* ensureDir
 *      yield* writeFile(...)
 *    })
 *    ```
 *
 * 4. COMPARED TO TASK APP:
 *
 *    Task app:
 *    - Users and tasks
 *    - Simple flat structures
 *    - ID generation in factories
 *
 *    Weather app:
 *    - Locations and readings
 *    - Nested structures (coordinates, measurements)
 *    - More complex validation
 *
 *    Both:
 *    - Use Schema.encode/decode
 *    - File-based storage
 *    - Error wrapping (FileSystemError)
 *    - Return empty array for missing files
 *
 * 5. BENEFITS:
 *    ✅ Type-safe serialization
 *    ✅ Validation on load (corrupted data detected)
 *    ✅ Testable (easy to mock Storage)
 *    ✅ Swappable (files → database)
 *    ✅ Clear separation (business logic ≠ storage)
 *
 * 6. WHEN TO USE FILE STORAGE:
 *    ✅ Small datasets (< 10,000 records)
 *    ✅ Single server (no distributed system)
 *    ✅ Prototyping and development
 *    ✅ Configuration and caching
 *    ❌ Large datasets (use database)
 *    ❌ High concurrency (use database with transactions)
 *    ❌ Distributed systems (use distributed storage)
 *
 * 7. ALTERNATIVE IMPLEMENTATIONS:
 *
 *    In-memory (for testing):
 *    ```typescript
 *    const makeMemoryStorage = () => {
 *      let locations: Location[] = []
 *      let readings: WeatherReading[] = []
 *
 *      return Storage.of({
 *        saveLocations: (locs) => Effect.sync(() => { locations = locs }),
 *        loadLocations: () => Effect.succeed(locations),
 *        saveReadings: (reads) => Effect.sync(() => { readings = reads }),
 *        loadReadings: () => Effect.succeed(readings)
 *      })
 *    }
 *    ```
 *
 *    Database (production):
 *    ```typescript
 *    const makeDbStorage = (db: Database) =>
 *      Storage.of({
 *        saveLocations: (locations) =>
 *          Effect.tryPromise({
 *            try: () => db.insert("locations", locations),
 *            catch: (error) => DbError.make({ ... })
 *          }),
 *        loadLocations: () =>
 *          Effect.tryPromise({
 *            try: () => db.query<Location>("SELECT * FROM locations"),
 *            catch: (error) => DbError.make({ ... })
 *          })
 *      })
 *    ```
 */
