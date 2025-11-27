# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **JSON Diff Tool** - a full-stack application for comparing JSON data with rich visualization and semantic comparison capabilities. The application combines React 19 frontend with a Hono backend, deployed as a Cloudflare Worker. The architecture uses Vite for both development and production builds, with the Cloudflare Vite plugin enabling seamless Worker integration.

### Core Features

- **JSON Comparison**: Side-by-side comparison of two JSON documents with detailed diff highlighting
- **Multiple View Modes**: Side-by-side, unified, and inline diff views
- **Semantic Comparison**: Array order ignore, key-field matching, float tolerance, null/undefined equivalence
- **Export Options**: JSON, Markdown, HTML, JSON Patch (RFC 6902) formats
- **Share Functionality**: Generate shareable URLs for diff results (stored in Cloudflare KV)
- **URL Fetching**: Fetch JSON from external URLs via Worker proxy (CORS bypass)
- **History Management**: Local storage of comparison history

## Build and Development Commands

**Development:**
```bash
npm run dev              # Start Vite dev server with HMR at localhost:5173
```

**Linting:**
```bash
npm run lint             # Run ESLint on all TypeScript files
```

**Building:**
```bash
npm run build            # Compile TypeScript and build with Vite
npm run preview          # Build and preview production locally
npm run check            # Full check: type check, build, and dry-run deploy
```

**Deployment:**
```bash
npm run deploy           # Deploy to Cloudflare Workers
npx wrangler tail        # Monitor deployed worker logs
```

**Type Generation:**
```bash
npm run cf-typegen       # Generate TypeScript types from wrangler.json
```

**Testing:**
```bash
npm run test             # Run unit tests with Vitest
npm run test:ui          # Run tests with Vitest UI
npm run test:coverage    # Run tests with coverage report
npm run test:e2e         # Run E2E tests with Playwright
npm run test:all         # Run all tests
```

## Architecture

### Design Principles

This project follows three core architectural principles:

1. **Domain-Driven Design (DDD)**
   - Business logic centralized in domain layer
   - Ubiquitous language: JsonDocument, DiffResult, JsonPath, DiffEntry
   - Bounded contexts: Parsing, Comparing, Reporting

2. **Functional Programming (FP)**
   - Pure functions for diff computation, parsing, formatting
   - Immutable data structures with `readonly` modifiers
   - Function composition via `pipe`/`compose`
   - `Result<T, E>` type for error handling (no exceptions)

3. **Dependency Inversion Principle (DIP)**
   - Ports and Adapters pattern
   - Dependency graph: Domain → Application → Infrastructure
   - Interface-driven design for testability

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation Layer (React Components, Hooks, Styles)       │
├─────────────────────────────────────────────────────────────┤
│ Infrastructure Layer (Adapters, External Services, Workers)│
├─────────────────────────────────────────────────────────────┤
│ Application Layer (Ports, Use Cases, State Management)     │
├─────────────────────────────────────────────────────────────┤
│ Domain Layer (Entities, Value Objects, Pure Functions)     │
│ - No dependencies on outer layers                          │
│ - Pure business logic                                      │
└─────────────────────────────────────────────────────────────┘
```

### Dual TypeScript Configurations

The project uses three separate TypeScript configurations:

1. **tsconfig.app.json**: React application (`src/react-app/`)
   - Target: ES2020 with DOM APIs
   - JSX: react-jsx mode
   - Strict mode with unused variable checks

2. **tsconfig.worker.json**: Cloudflare Worker (`src/worker/`)
   - Extends tsconfig.node.json
   - Includes Vite client types and worker configuration types
   - Node.js-compatible environment

3. **tsconfig.node.json**: Build tooling (Vite config, etc.)

### Directory Structure

```
src/
├── react-app/
│   ├── domain/              # Domain layer (pure business logic)
│   │   ├── types/           # Type definitions (json.ts, diff.ts, result.ts)
│   │   ├── entities/        # Entities (JsonDocument, DiffResult)
│   │   ├── value-objects/   # Value objects (JsonPath, DiffEntry, ValidationError)
│   │   └── functions/       # Pure domain functions (parser, differ, formatter, validator)
│   │
│   ├── application/         # Application layer
│   │   ├── ports/           # Port interfaces (StoragePort, HttpPort, ExportPort)
│   │   ├── use-cases/       # Use cases (CompareJsonUseCase, ExportDiffUseCase, etc.)
│   │   └── state/           # State management (reducer, actions, types)
│   │
│   ├── infrastructure/      # Infrastructure layer
│   │   ├── adapters/        # Port implementations (LocalStorageAdapter, FetchAdapter)
│   │   └── workers/         # Web Workers (diff.worker.ts)
│   │
│   ├── presentation/        # Presentation layer
│   │   ├── components/      # React components
│   │   │   ├── atoms/       # Atomic components (Button, TextArea, Icon)
│   │   │   ├── molecules/   # Molecular components (JsonEditor, DiffLine, Toolbar)
│   │   │   ├── organisms/   # Organisms (DiffViewer, InputPanel, SettingsPanel)
│   │   │   └── templates/   # Templates (MainLayout)
│   │   ├── hooks/           # Custom hooks (useDiff, useJsonValidation)
│   │   └── styles/          # Styles (theme, global.css)
│   │
│   ├── shared/              # Shared utilities (pipe, compose, memoize, curry)
│   │
│   └── test/                # Test configuration
│       ├── setup.ts         # Test setup
│       └── mocks/           # Mock handlers (MSW)
│
├── worker/                  # Cloudflare Worker
│   ├── routes/              # API routes (share.ts, fetch-json.ts)
│   └── services/            # Worker services (storage.ts)
│
├── e2e/                     # E2E tests (Playwright)
│
└── dist/client/             # Production build output
```

### Build Process

1. **Development**: Vite dev server runs both React app and Worker locally via `@cloudflare/vite-plugin`
2. **Production**:
   - Vite builds React app to `dist/client/`
   - Worker code in `src/worker/index.ts` is deployed as the main Worker script
   - Static assets are served through Cloudflare's Workers Assets with SPA fallback handling

### Worker Configuration

The `wrangler.json` configures:
- Main entry: `src/worker/index.ts`
- Assets directory: `dist/client/` with SPA fallback
- Node.js compatibility enabled
- Observability and source maps enabled for debugging

### Frontend-Backend Communication

The React app calls backend APIs through relative paths (e.g., `/api/`). In development, these are proxied by Vite's Cloudflare plugin. In production, the Worker handles both API routes (via Hono) and serves static assets.

## Core Concepts

### Domain Layer Patterns

#### Result Type (Functional Error Handling)

Instead of throwing exceptions, use the `Result<T, E>` type:

```typescript
// Definition
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// Usage
const parseJson = (input: string): Result<JsonValue, ValidationError> => {
  try {
    return ok(JSON.parse(input));
  } catch (e) {
    return err({ type: 'parse', message: e.message });
  }
};

// Composition
const result = pipe(
  parseJson(input),
  flatMap(validateStructure),
  map(normalizeData)
);
```

#### Pure Functions

All domain functions must be pure (same input → same output, no side effects):

```typescript
// ✅ Pure function
export const computeDiff = (
  left: JsonValue,
  right: JsonValue,
  settings: CompareSettings
): readonly DiffEntry[] => {
  // Pure computation
};

// ❌ Impure function (avoid in domain layer)
const impure = (data: Data) => {
  console.log(data); // Side effect!
  localStorage.setItem('key', data); // Side effect!
};
```

#### Immutable Data

All data structures use `readonly`:

```typescript
interface DiffResult {
  readonly entries: readonly DiffEntry[];
  readonly stats: DiffStats;
  readonly metadata: DiffMetadata;
}
```

### Application Layer Patterns

#### Ports and Adapters

Define interfaces in application layer, implement in infrastructure:

```typescript
// Port (application/ports/StoragePort.ts)
export interface StoragePort {
  save<T>(key: string, data: T): Promise<Result<void, StorageError>>;
  load<T>(key: string): Promise<Result<T | null, StorageError>>;
}

// Adapter (infrastructure/adapters/LocalStorageAdapter.ts)
export class LocalStorageAdapter implements StoragePort {
  async save<T>(key: string, data: T): Promise<Result<void, StorageError>> {
    // Implementation using localStorage
  }
}

// Use case with dependency injection
export const createSaveHistoryUseCase = (storage: StoragePort) => {
  return async (diff: DiffResult) => {
    return storage.save(`history_${Date.now()}`, diff);
  };
};
```

#### Use Cases

Use cases orchestrate domain logic and port interactions:

```typescript
export const compareJson = (
  input: CompareJsonInput
): Result<CompareJsonOutput, CompareJsonError> => {
  // 1. Parse both JSONs
  const leftResult = createJsonDocument(input.leftJson);
  if (!leftResult.ok) return err({ type: 'LEFT_PARSE_ERROR', error: leftResult.error });

  const rightResult = createJsonDocument(input.rightJson);
  if (!rightResult.ok) return err({ type: 'RIGHT_PARSE_ERROR', error: rightResult.error });

  // 2. Compute diff
  const entries = computeDiff(leftResult.value, rightResult.value, settings);

  // 3. Create result entity
  const diffResult = createDiffResult(leftDoc.id, rightDoc.id, entries, settings);

  return ok({ leftDocument, rightDocument, diffResult });
};
```

### Testing Strategy (TDD)

Follow the Red-Green-Refactor cycle:

1. **Red**: Write failing test first
2. **Green**: Minimal implementation to pass
3. **Refactor**: Improve code while keeping tests green

```typescript
// 1. Write test first
it('should detect modified value', () => {
  const result = computeDiff({ a: 1 }, { a: 2 });
  expect(result[0].type).toBe('modified');
});

// 2. Implement minimal solution
// 3. Refactor if needed
```

Test organization:
- **Unit tests**: Domain functions, value objects (co-located in `__tests__/`)
- **Integration tests**: Use cases, adapters
- **E2E tests**: Full user flows with Playwright
- **Coverage target**: 80%+ (branches, functions, lines, statements)

## API Reference

### Worker API Endpoints

```
POST /api/share
  - Create shareable diff link
  - Body: { leftJson: string, rightJson: string, settings?: CompareSettings }
  - Response: { id: string, url: string, expiresAt: string }

GET /api/share/:id
  - Retrieve shared diff data
  - Response: { id, leftJson, rightJson, settings, createdAt, expiresAt }

POST /api/fetch-json
  - Fetch JSON from external URL (CORS bypass)
  - Body: { url: string, headers?: Record<string, string> }
  - Response: { data: JsonValue, contentType: string, size: number }

GET /api/health
  - Health check
  - Response: { status: 'ok', timestamp: string }
```

### Custom Hooks

```typescript
// useDiff: Main comparison hook
const { state, actions, settings, setSettings } = useDiff(initialSettings);

actions.setLeftInput(json);
actions.setRightInput(json);
actions.compare();
actions.clear();
```

## Key Patterns

### Adding a New Domain Function

1. Create type definitions in `domain/types/`
2. Write tests in `domain/functions/__tests__/`
3. Implement pure function in `domain/functions/`
4. Export from domain layer

### Adding a New Use Case

1. Define input/output types
2. Write tests in `application/use-cases/__tests__/`
3. Implement use case with domain function composition
4. Inject dependencies via ports

### Adding a New Port

1. Define interface in `application/ports/`
2. Create adapter in `infrastructure/adapters/`
3. Implement with concrete technology (localStorage, fetch, etc.)
4. Inject into use cases

### Adding Worker API Routes

Add new routes in `src/worker/routes/`:
```typescript
// src/worker/routes/my-route.ts
import { Hono } from 'hono';

export const myRoutes = new Hono<{ Bindings: Env }>();

myRoutes.post('/', async (c) => {
  // Implementation
  return c.json({ success: true });
});

// Mount in src/worker/index.ts
app.route('/api/my-route', myRoutes);
```

### Function Composition

Use `pipe` for left-to-right composition:

```typescript
const result = pipe(
  input,
  parseJson,
  validateStructure,
  normalizeData
);
```

### Memoization

Use memoization for expensive pure functions:

```typescript
import { memoize } from '../shared/memoize';

const expensiveComputation = (data: Data) => {
  // Expensive pure computation
};

export const memoizedComputation = memoize(expensiveComputation);
```

## Design System

### Color Palette (Dracula Theme)

```css
--bg-primary: #1e1f29;
--bg-secondary: #282a36;
--fg-primary: #f8f8f2;
--accent-cyan: #8be9fd;
--accent-green: #50fa7b;    /* Added */
--accent-red: #ff5555;      /* Removed */
--accent-orange: #ffb86c;   /* Modified */
```

### Component Hierarchy (Atomic Design)

- **Atoms**: Button, TextArea, Icon
- **Molecules**: JsonEditor, DiffLine, Toolbar
- **Organisms**: DiffViewer, InputPanel, SettingsPanel
- **Templates**: MainLayout

## Documentation

Detailed design documents are available in `docs/specs/`:

- [00-index.md](docs/specs/00-index.md): Overview and index
- [01-requirements.md](docs/specs/01-requirements.md): Functional and non-functional requirements
- [02-architecture.md](docs/specs/02-architecture.md): System architecture and layering
- [03-domain-model.md](docs/specs/03-domain-model.md): Entities, value objects, domain functions
- [04-functional-design.md](docs/specs/04-functional-design.md): Pure functions and FP patterns
- [05-api-design.md](docs/specs/05-api-design.md): API specifications
- [06-ui-design.md](docs/specs/06-ui-design.md): UI components and design system
- [07-testing-strategy.md](docs/specs/07-testing-strategy.md): TDD approach and test structure

## Environment Types

The Worker uses typed bindings through the `Env` interface. Generate types with `npm run cf-typegen` after modifying `wrangler.json`.
