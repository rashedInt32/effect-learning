# Project Instructions for AI Assistants

This is an Effect TypeScript learning project.

<!-- effect-solutions:start -->
## Effect Solutions Usage

The Effect Solutions CLI provides curated best practices and patterns for Effect TypeScript. Before working on Effect code, check if there's a relevant topic that covers your use case.

- `~/.bun/bin/effect-solutions list` - List all available topics
- `~/.bun/bin/effect-solutions show <slug...>` - Read one or more topics
- `~/.bun/bin/effect-solutions search <term>` - Search topics by keyword

**Available topics:**
- `quick-start` - How to get started with Effect Solutions
- `project-setup` - Install the Effect Language Service and strict project defaults
- `tsconfig` - Recommended TypeScript compiler settings tuned for Effect
- `basics` - Coding conventions for Effect.fn and Effect.gen
- `services-and-layers` - Context.Tag and Layer patterns for dependency injection
- `data-modeling` - Records, variants, brands, pattern matching, and JSON serialization
- `error-handling` - Schema.TaggedError modeling, pattern matching, and defects
- `config` - Effect Config usage, providers, and layer patterns
- `testing` - How to test Effect code with @effect/vitest
- `cli` - Build CLIs with @effect/cli: commands, args, options, and service integration

**Local Effect Source:** The Effect repository is cloned to `~/.local/share/effect-solutions/effect` for reference. Use this to explore APIs, find usage examples, and understand implementation details when the documentation isn't enough.
<!-- effect-solutions:end -->

## Project Configuration

- **Package Manager**: pnpm
- **TypeScript**: Configured with strict settings optimized for Effect
- **Effect Version**: 3.19.8
- **Effect Language Service**: Installed and configured (TypeScript patched)

## Scripts

- `pnpm dev` - Run the main Effect program (src/index.ts)
- `pnpm typecheck` - Run TypeScript type checking without emitting files
- `pnpm prepare` - Patch TypeScript for Effect Language Service (runs automatically on install)
