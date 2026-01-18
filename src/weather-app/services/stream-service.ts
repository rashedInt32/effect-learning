import { Context, Duration, Effect, Layer, Schedule, Stream } from "effect";
import { WeatherService } from "./weather-service";
import type { StreamConfigType } from "../domain/config";
import { StreamConfig } from "../domain/config";
import type { Location, WeatherReading } from "../domain/models";

/**
 * STREAM SERVICE - Real-Time Weather Updates with Effect.Stream
 *
 * THIS IS THE KEY DIFFERENTIATOR from practical-app!
 *
 * WHY Effect.Stream?
 * - Model continuous data flows (weather updates over time)
 * - Built-in backpressure handling
 * - Composable stream operations
 * - Concurrent processing with controlled concurrency
 * - Automatic resource cleanup
 * - Interruption support
 *
 * WHAT THIS SERVICE DEMONSTRATES:
 * 1. Stream.fromSchedule - Creating streams from recurring schedules
 * 2. Stream.mapEffect - Transform stream elements with Effects
 * 3. Stream.flatMap - Compose streams
 * 4. Stream.merge - Combine multiple streams
 * 5. Concurrency control - Process multiple locations in parallel
 * 6. Backpressure - Buffer and throttle updates
 * 7. Error handling in streams - Recover from failures
 * 8. Stream.runForEach - Consume stream elements
 *
 * COMPARED TO TRADITIONAL APPROACHES:
 *
 * Traditional polling loop:
 * ```typescript
 * setInterval(async () => {
 *   for (const location of locations) {
 *     try {
 *       const weather = await fetchWeather(location)
 *       console.log(weather)
 *     } catch (e) {
 *       console.error(e)  // Error handling is manual and error-prone
 *     }
 *   }
 * }, 30000)
 * // Problems:
 * // - No backpressure
 * // - No resource cleanup
 * // - Manual error handling
 * // - No concurrency control
 * // - Hard to test
 * ```
 *
 * Effect.Stream approach:
 * ```typescript
 * const updates = Stream.fromSchedule(Schedule.fixed("30 seconds")).pipe(
 *   Stream.flatMap(() => Stream.fromIterable(locations)),
 *   Stream.mapEffect((loc) => weatherService.getCurrentWeather(loc.id)),
 *   Stream.buffer(10),  // Automatic backpressure
 * )
 * // Benefits:
 * // - Automatic backpressure
 * // - Resource cleanup on interruption
 * // - Composable error handling
 * // - Built-in concurrency control
 * // - Testable
 * ```
 *
 * LEARNING PATH:
 * 1. Start with simple stream creation (fromSchedule, fromIterable)
 * 2. Learn basic transformations (map, mapEffect)
 * 3. Understand composition (flatMap, merge)
 * 4. Master concurrency (mapEffect with concurrency option)
 * 5. Handle errors (catchAll, retry)
 * 6. Control backpressure (buffer, throttle)
 * 7. Consume streams (runForEach, runCollect)
 */

export interface StreamService {
  /**
   * Stream weather updates for all tracked locations
   *
   * WHAT IT DOES:
   * 1. Polls on a schedule (every N seconds)
   * 2. For each poll, fetches weather for all locations
   * 3. Emits updates as they arrive
   * 4. Handles errors per-location (don't fail the whole stream)
   * 5. Respects concurrency limits
   *
   * DEMONSTRATES:
   * - Stream.fromSchedule: Create stream from recurring schedule
   * - Stream.flatMap: Expand each tick into multiple updates
   * - mapEffect with concurrency: Process multiple locations in parallel
   * - Stream.catchAll: Handle errors without killing the stream
   *
   * USAGE:
   * ```typescript
   * const updates = streamService.weatherUpdates()
   * yield* Stream.runForEach(updates, (reading) =>
   *   Console.log(`${reading.location.name}: ${reading.temperature.value}°C`)
   * )
   * ```
   */
  weatherUpdates: () => Stream.Stream<WeatherReading, never, WeatherService>;

  /**
   * Stream weather updates for a specific location
   *
   * WHAT IT DOES:
   * 1. Polls on a schedule for ONE location
   * 2. Emits updates as they arrive
   * 3. Retries on errors with backoff
   * 4. Continues running until interrupted
   *
   * DEMONSTRATES:
   * - Stream.fromSchedule: Periodic updates
   * - Stream.mapEffect: Transform ticks into weather readings
   * - Error handling: Retry with exponential backoff
   * - Long-running streams
   *
   * USAGE:
   * ```typescript
   * const updates = streamService.locationWeatherUpdates("nyc")
   * yield* Stream.runForEach(updates, (reading) =>
   *   Console.log(`Temperature: ${reading.temperature.value}°C`)
   * )
   * ```
   */
  locationWeatherUpdates: (
    locationId: string,
  ) => Stream.Stream<WeatherReading, never, WeatherService>;

  /**
   * Stream updates for multiple specific locations
   *
   * WHAT IT DOES:
   * 1. Creates a stream for each location
   * 2. Merges all streams into one
   * 3. Updates arrive as they're fetched (not in order)
   * 4. Each location polls independently
   *
   * DEMONSTRATES:
   * - Stream.merge: Combine multiple streams
   * - Concurrent independent streams
   * - Unordered stream processing
   *
   * USAGE:
   * ```typescript
   * const updates = streamService.multiLocationWeatherUpdates(["nyc", "london", "tokyo"])
   * yield* Stream.runForEach(updates, (reading) =>
   *   Console.log(`${reading.location.name}: ${reading.temperature.value}°C`)
   * )
   * ```
   */
  multiLocationWeatherUpdates: (
    locationIds: string[],
  ) => Stream.Stream<WeatherReading, never, WeatherService>;
}

export const StreamService = Context.GenericTag<StreamService>(
  "StreamService",
);

export const StreamServiceLive = Layer.effect(
  StreamService,
  Effect.gen(function* () {
    const weatherService = yield* WeatherService;
    const config: StreamConfigType = yield* StreamConfig;

    const weatherUpdates = (): Stream.Stream<WeatherReading, never, WeatherService> =>
      Stream.fromSchedule(
        Schedule.fixed(Duration.seconds(config.pollIntervalSeconds)),
      ).pipe(
        Stream.flatMap(() =>
          weatherService.getTrackedLocations().pipe(
            Effect.catchAll(() => Effect.succeed([] as Location[])),
            Stream.fromEffect,
          ),
        ),
        Stream.flatMap((locations) => Stream.fromIterable(locations)),
        Stream.mapEffect(
          (location) =>
            weatherService.getCurrentWeather(location).pipe(
              Effect.catchAll(() => Effect.succeed(null)),
            ),
          { concurrency: config.maxConcurrentLocations },
        ),
        Stream.filter((reading): reading is WeatherReading => reading !== null),
        Stream.buffer({ capacity: config.bufferSize }),
      );

    const locationWeatherUpdates = (
      locationId: string,
    ): Stream.Stream<WeatherReading, never, WeatherService> =>
      Stream.fromSchedule(
        Schedule.fixed(Duration.seconds(config.pollIntervalSeconds)),
      ).pipe(
        Stream.flatMap(() =>
          Effect.gen(function* () {
            const locations = yield* weatherService.getTrackedLocations();
            const location = locations.find((loc) => loc.id === locationId);
            return location;
          }),
        ),
        Stream.filter((location): location is Location => location !== undefined),
        Stream.mapEffect((location) =>
          weatherService.getCurrentWeather(location).pipe(
            Effect.retry(
              Schedule.exponential(Duration.seconds(1)).pipe(
                Schedule.compose(Schedule.recurs(3)),
              ),
            ),
            Effect.catchAll(() => Effect.succeed(null)),
          ),
        ),
        Stream.filter((reading): reading is WeatherReading => reading !== null),
      );

    const multiLocationWeatherUpdates = (
      locationIds: string[],
    ): Stream.Stream<WeatherReading, never, WeatherService> =>
      Stream.mergeAll(
        locationIds.map((id) => locationWeatherUpdates(id)),
        { concurrency: config.maxConcurrentLocations },
      );

    return {
      weatherUpdates,
      locationWeatherUpdates,
      multiLocationWeatherUpdates,
    } satisfies StreamService;
  }),
);
