import { Schema } from "effect";

/**
 * WEATHER DOMAIN MODELS - Advanced Data Modeling with Schema
 *
 * This file demonstrates more advanced Schema patterns:
 * - Nested structures (Location within WeatherReading)
 * - Number validation and constraints (temperature ranges, coordinates)
 * - Optional fields with defaults
 * - Union types for variant data (WeatherCondition)
 * - Timestamps and date handling
 * - Computed/derived fields
 *
 * COMPARED TO TASK APP:
 * - Task app: Simple flat structures with strings and dates
 * - Weather app: Complex nested data, number validations, geographic coordinates
 */

/**
 * Branded Types - Ensuring type safety for domain-specific values
 *
 * WHY BRAND LOCATION IDS?
 * - Prevents mixing location IDs with other strings
 * - Self-documenting code (know it's a location, not just any string)
 * - Type-safe across API boundaries
 */
export class LocationId extends Schema.String.pipe(
  Schema.brand("LocationId"),
) {}

export class WeatherReadingId extends Schema.String.pipe(
  Schema.brand("WeatherReadingId"),
) {}

/**
 * Geographic Coordinates with Validation
 *
 * WHY VALIDATE COORDINATES?
 * - Latitude must be between -90 and 90
 * - Longitude must be between -180 and 180
 * - Invalid coordinates cause API errors
 *
 * DEMONSTRATES:
 * - Schema.Number with constraints (between, greaterThanOrEqualTo, lessThanOrEqualTo)
 * - Custom error messages for better UX
 * - Composition (Latitude + Longitude → Coordinates)
 *
 * PATTERN: Use Schema.between for bounded numeric values
 * - Temperature ranges
 * - Percentage values (0-100)
 * - Geographic coordinates
 */
const Latitude = Schema.Number.pipe(
  Schema.between(-90, 90, {
    message: () => "Latitude must be between -90 and 90 degrees",
  }),
  Schema.brand("Latitude"),
);

const Longitude = Schema.Number.pipe(
  Schema.between(-180, 180, {
    message: () => "Longitude must be between -180 and 180 degrees",
  }),
  Schema.brand("Longitude"),
);

/**
 * Location - Geographic location with validation
 *
 * DEMONSTRATES:
 * - Nested Schema.Struct (coordinates within location)
 * - String length validation (minLength for names)
 * - Optional fields (country can be omitted)
 * - Combining multiple validation rules
 *
 * WHY NESTED STRUCTURE?
 * - Groups related data (lat/lon belong together)
 * - Reusable (coordinates can be extracted and used elsewhere)
 * - Self-documenting (clear that coordinates are part of location)
 */
export class Location extends Schema.Class<Location>("Location")({
  id: LocationId,
  name: Schema.String.pipe(
    Schema.minLength(1, { message: () => "Location name cannot be empty" }),
  ),
  country: Schema.optional(Schema.String),
  coordinates: Schema.Struct({
    latitude: Latitude,
    longitude: Longitude,
  }),
}) {}

/**
 * Weather Condition - Using Literals for fixed values
 *
 * WHY LITERAL INSTEAD OF STRING?
 * - Type-safe (only these exact values allowed)
 * - Autocomplete in IDE
 * - Runtime validation
 * - Serializes as strings (unlike enums which can be numbers)
 *
 * WHEN TO USE:
 * - Fixed set of values (status, category, type)
 * - Values from external API (weather conditions, error codes)
 * - Domain-specific enumerations
 */
export const WeatherCondition = Schema.Literal(
  "clear",
  "cloudy",
  "rainy",
  "snowy",
  "stormy",
  "foggy",
);
export type WeatherCondition = typeof WeatherCondition.Type;

/**
 * Temperature with realistic constraints
 *
 * WHY CONSTRAIN TEMPERATURE?
 * - Catches data errors early (API returns garbage data)
 * - Documents expected ranges
 * - Absolute zero is -273.15°C, no lower values make sense
 * - 60°C is extremely hot, higher values likely errors
 *
 * DEMONSTRATES: Schema.Number with extreme bounds checking
 */
const Temperature = Schema.Number.pipe(
  Schema.between(-100, 60, {
    message: () =>
      "Temperature must be between -100°C and 60°C (realistic Earth temperature range)",
  }),
  Schema.brand("Temperature"),
);

/**
 * Humidity as percentage (0-100)
 *
 * DEMONSTRATES:
 * - Percentage validation pattern
 * - Self-documenting types (know it's a percentage, not arbitrary number)
 *
 * PATTERN: Always use 0-100 range for percentages
 * - Humidity
 * - Battery level
 * - Progress indicators
 * - Discount rates
 */
const Humidity = Schema.Number.pipe(
  Schema.between(0, 100, {
    message: () => "Humidity must be between 0% and 100%",
  }),
  Schema.brand("Humidity"),
);

/**
 * Wind speed validation
 *
 * WHY greaterThanOrEqualTo instead of between?
 * - Wind speed can't be negative
 * - No realistic upper bound (hurricanes can exceed 200 km/h)
 * - But we still validate >= 0 to catch errors
 */
const WindSpeed = Schema.Number.pipe(
  Schema.greaterThanOrEqualTo(0, {
    message: () => "Wind speed cannot be negative",
  }),
  Schema.brand("WindSpeed"),
);

/**
 * WeatherReading - Complete weather observation
 *
 * DEMONSTRATES:
 * - Complex nested structures (location, measurements)
 * - Multiple optional fields (precipitation, windDirection)
 * - Branded number types for type safety
 * - Timestamp handling with Schema.Date
 *
 * KEY LEARNING: Rich domain models vs primitives
 *
 * Bad (primitive obsession):
 * ```typescript
 * interface Weather {
 *   temp: number      // Celsius? Fahrenheit? Kelvin?
 *   humidity: number  // Percentage? Absolute?
 *   time: string      // ISO string? Timestamp? Unknown format?
 * }
 * ```
 *
 * Good (rich domain model):
 * ```typescript
 * class WeatherReading {
 *   temperature: Temperature  // Branded, validated Celsius
 *   humidity: Humidity        // Branded percentage (0-100)
 *   timestamp: Date           // Proper Date object
 * }
 * ```
 *
 * BENEFITS:
 * - Self-documenting (types explain meaning)
 * - Validated (impossible to create invalid readings)
 * - Type-safe (can't mix temperature with humidity)
 * - Runtime guarantees (Schema validates all fields)
 */
export class WeatherReading extends Schema.Class<WeatherReading>(
  "WeatherReading",
)({
  id: WeatherReadingId,
  location: Location,
  temperature: Temperature,
  feelsLike: Temperature,
  humidity: Humidity,
  condition: WeatherCondition,
  windSpeed: WindSpeed,
  windDirection: Schema.optional(
    Schema.Number.pipe(
      Schema.between(0, 360, {
        message: () => "Wind direction must be between 0 and 360 degrees",
      }),
    ),
  ),
  precipitation: Schema.optional(
    Schema.Number.pipe(
      Schema.greaterThanOrEqualTo(0, {
        message: () => "Precipitation cannot be negative",
      }),
    ),
  ),
  pressure: Schema.optional(
    Schema.Number.pipe(
      Schema.between(900, 1100, {
        message: () =>
          "Atmospheric pressure must be between 900 and 1100 hPa",
      }),
    ),
  ),
  visibility: Schema.optional(
    Schema.Number.pipe(
      Schema.greaterThanOrEqualTo(0, {
        message: () => "Visibility cannot be negative",
      }),
    ),
  ),
  timestamp: Schema.Date,
}) {}

/**
 * Forecast - Future weather prediction
 *
 * WHY SEPARATE FROM WEATHERREADING?
 * - Different lifecycle (reading is observed, forecast is predicted)
 * - Different fields (forecast has confidence, reading doesn't)
 * - Different sources (readings from sensors, forecasts from models)
 *
 * DEMONSTRATES:
 * - Reusing schemas (Location, Temperature, etc.)
 * - Additional domain-specific fields (confidence, forecastedFor)
 * - Composition (building complex types from simpler ones)
 *
 * PATTERN: Compose schemas rather than duplicating
 * - DRY principle with schemas
 * - Changes propagate automatically
 * - Consistent validation across types
 */
export class Forecast extends Schema.Class<Forecast>("Forecast")({
  id: Schema.String.pipe(Schema.brand("ForecastId")),
  location: Location,
  forecastedFor: Schema.Date,
  temperature: Temperature,
  temperatureMin: Temperature,
  temperatureMax: Temperature,
  condition: WeatherCondition,
  humidity: Humidity,
  windSpeed: WindSpeed,
  precipitation: Schema.optional(Schema.Number),
  confidence: Schema.Number.pipe(
    Schema.between(0, 100, {
      message: () => "Confidence must be between 0% and 100%",
    }),
  ),
  createdAt: Schema.Date,
}) {}

/**
 * Helper Functions - Creating domain objects with defaults
 *
 * WHY HELPERS?
 * - Encapsulate ID generation logic
 * - Provide sensible defaults (timestamp = now)
 * - Make creation easier (don't need to specify everything)
 * - Consistent creation across codebase
 *
 * PATTERN: Factory functions for complex objects
 * - Generate IDs automatically
 * - Set default timestamps
 * - Validate and transform input
 */
export const createLocation = (params: {
  name: string;
  country?: string;
  latitude: number;
  longitude: number;
}): Location =>
  new Location({
    id: LocationId.make(
      `loc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ),
    name: params.name,
    country: params.country,
    coordinates: {
      latitude: Latitude.make(params.latitude),
      longitude: Longitude.make(params.longitude),
    },
  });

export const createWeatherReading = (params: {
  location: Location;
  temperature: number;
  feelsLike: number;
  humidity: number;
  condition: WeatherCondition;
  windSpeed: number;
  windDirection?: number;
  precipitation?: number;
  pressure?: number;
  visibility?: number;
}): WeatherReading =>
  new WeatherReading({
    id: WeatherReadingId.make(
      `reading-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ),
    location: params.location,
    temperature: Temperature.make(params.temperature),
    feelsLike: Temperature.make(params.feelsLike),
    humidity: Humidity.make(params.humidity),
    condition: params.condition,
    windSpeed: WindSpeed.make(params.windSpeed),
    windDirection: params.windDirection,
    precipitation: params.precipitation,
    pressure: params.pressure,
    visibility: params.visibility,
    timestamp: new Date(),
  });

export const createForecast = (params: {
  location: Location;
  forecastedFor: Date;
  temperature: number;
  temperatureMin: number;
  temperatureMax: number;
  condition: WeatherCondition;
  humidity: number;
  windSpeed: number;
  precipitation?: number;
  confidence: number;
}): Forecast =>
  new Forecast({
    id: Schema.String.pipe(Schema.brand("ForecastId")).make(
      `forecast-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ),
    location: params.location,
    forecastedFor: params.forecastedFor,
    temperature: Temperature.make(params.temperature),
    temperatureMin: Temperature.make(params.temperatureMin),
    temperatureMax: Temperature.make(params.temperatureMax),
    condition: params.condition,
    humidity: Humidity.make(params.humidity),
    windSpeed: WindSpeed.make(params.windSpeed),
    precipitation: params.precipitation,
    confidence: params.confidence,
    createdAt: new Date(),
  });

/**
 * LEARNING NOTES - Advanced Schema Patterns:
 *
 * 1. NUMBER VALIDATION:
 *    ```typescript
 *    Schema.Number.pipe(
 *      Schema.between(min, max),           // Range validation
 *      Schema.greaterThanOrEqualTo(min),   // Minimum value
 *      Schema.lessThanOrEqualTo(max),      // Maximum value
 *      Schema.int(),                       // Integer only
 *      Schema.positive(),                  // Positive numbers
 *      Schema.brand("MyNumber")            // Type safety
 *    )
 *    ```
 *
 * 2. NESTED STRUCTURES:
 *    ```typescript
 *    Schema.Struct({
 *      coordinates: Schema.Struct({
 *        latitude: Latitude,
 *        longitude: Longitude
 *      })
 *    })
 *    ```
 *    - Validates inner and outer structures
 *    - Groups related data
 *    - Reusable components
 *
 * 3. SCHEMA COMPOSITION:
 *    - Location schema used in both WeatherReading and Forecast
 *    - Temperature type reused for temp, feelsLike, min, max
 *    - DRY: Change validation once, applies everywhere
 *
 * 4. BRANDED NUMBERS VS PRIMITIVES:
 *
 *    Without brands (error-prone):
 *    ```typescript
 *    function setTemp(temp: number) { ... }
 *    setTemp(humidity)  // ❌ Compiles but wrong!
 *    ```
 *
 *    With brands (type-safe):
 *    ```typescript
 *    function setTemp(temp: Temperature) { ... }
 *    setTemp(humidity)  // ✅ Type error - humidity is not temperature!
 *    ```
 *
 * 5. WHEN TO USE OPTIONAL:
 *    - Data from external APIs (not all fields always present)
 *    - Optional features (precipitation may be missing)
 *    - Backwards compatibility (new fields added over time)
 *
 *    ```typescript
 *    Schema.optional(Schema.Number)  // field can be undefined
 *    Schema.Number.pipe(Schema.nullable)  // field can be null
 *    Schema.optionalWith(Schema.Number, { default: () => 0 })  // with default
 *    ```
 *
 * 6. COMPARED TO TASK APP:
 *
 *    Task app (simpler):
 *    - Flat structures (no nesting)
 *    - Mostly strings and dates
 *    - Simple validation (non-empty strings)
 *
 *    Weather app (more complex):
 *    - Nested structures (coordinates, measurements)
 *    - Heavy number validation (ranges, constraints)
 *    - Geographic data (lat/lon, wind direction)
 *    - Scientific units (temperature, pressure, humidity)
 *
 * 7. BENEFITS OF RICH MODELS:
 *    ✅ Self-documenting (types explain meaning)
 *    ✅ Validated (impossible to create invalid data)
 *    ✅ Type-safe (can't mix incompatible values)
 *    ✅ Composable (build complex from simple)
 *    ✅ Runtime guarantees (Schema validates everything)
 *    ✅ Better IDE support (autocomplete, type checking)
 *
 * 8. REAL-WORLD APPLICATIONS:
 *    - Financial data (money amounts, exchange rates, percentages)
 *    - IoT sensors (temperature, humidity, pressure readings)
 *    - E-commerce (prices, quantities, dimensions, weights)
 *    - Games (health, mana, damage, coordinates)
 *    - Scientific computing (measurements with units)
 */
