# JSON Diff ツール テスト駆動開発設計書

## 1. TDD原則

### 1.1 Red-Green-Refactorサイクル

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│    ┌──────────┐         ┌──────────┐         ┌──────────┐       │
│    │   RED    │────────▶│  GREEN   │────────▶│ REFACTOR │       │
│    │          │         │          │         │          │       │
│    │ テスト   │         │ 最小限の │         │ コード   │       │
│    │ を書く   │         │ 実装     │         │ を改善   │       │
│    └──────────┘         └──────────┘         └──────────┘       │
│         ▲                                          │             │
│         │                                          │             │
│         └──────────────────────────────────────────┘             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 TDDのルール

1. **失敗するテストを書くまで、プロダクションコードを書かない**
2. **失敗させるために必要な分だけテストを書く**
3. **テストを通すために必要な最小限のコードだけを書く**

### 1.3 テストピラミッド

```
                    ▲
                   /│\
                  / │ \        E2E Tests
                 /  │  \       (少数・高コスト)
                /───┼───\
               /    │    \     Integration Tests
              /     │     \    (中程度)
             /──────┼──────\
            /       │       \  Unit Tests
           /        │        \ (多数・低コスト)
          /─────────┼─────────\
         ▼──────────┴──────────▼
```

## 2. テストツール構成

### 2.1 依存パッケージ

```json
{
  "devDependencies": {
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "jsdom": "^24.0.0",
    "msw": "^2.0.0",
    "@playwright/test": "^1.45.0",
    "happy-dom": "^14.0.0"
  }
}
```

### 2.2 Vitest設定

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
});
```

### 2.3 テストセットアップ

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

// MSWサーバー設定
export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
```

## 3. ドメイン層のテスト

### 3.1 Result型のテスト

```typescript
// src/react-app/domain/types/__tests__/result.test.ts
import { describe, it, expect } from 'vitest';
import { ok, err, map, flatMap, isOk, isErr, combine, tryCatch } from '../result';

describe('Result type', () => {
  describe('constructors', () => {
    it('should create Ok with value', () => {
      const result = ok(42);
      expect(result.ok).toBe(true);
      expect(result.value).toBe(42);
    });

    it('should create Err with error', () => {
      const result = err('error message');
      expect(result.ok).toBe(false);
      expect(result.error).toBe('error message');
    });
  });

  describe('type guards', () => {
    it('isOk should return true for Ok', () => {
      expect(isOk(ok(1))).toBe(true);
      expect(isOk(err('x'))).toBe(false);
    });

    it('isErr should return true for Err', () => {
      expect(isErr(err('x'))).toBe(true);
      expect(isErr(ok(1))).toBe(false);
    });
  });

  describe('map', () => {
    it('should transform Ok value', () => {
      const result = map(ok(2), x => x * 3);
      expect(result).toEqual(ok(6));
    });

    it('should pass through Err unchanged', () => {
      const result = map(err('error'), x => x * 3);
      expect(result).toEqual(err('error'));
    });
  });

  describe('flatMap', () => {
    it('should chain Ok results', () => {
      const divide = (a: number, b: number) =>
        b === 0 ? err('division by zero') : ok(a / b);

      const result = flatMap(ok(10), x => divide(x, 2));
      expect(result).toEqual(ok(5));
    });

    it('should short-circuit on Err', () => {
      const divide = (a: number, b: number) =>
        b === 0 ? err('division by zero') : ok(a / b);

      const result = flatMap(ok(10), x => divide(x, 0));
      expect(result).toEqual(err('division by zero'));
    });
  });

  describe('combine', () => {
    it('should combine all Ok results', () => {
      const results = [ok(1), ok(2), ok(3)];
      expect(combine(results)).toEqual(ok([1, 2, 3]));
    });

    it('should return first Err', () => {
      const results = [ok(1), err('error'), ok(3)];
      expect(combine(results)).toEqual(err('error'));
    });
  });

  describe('tryCatch', () => {
    it('should wrap successful execution in Ok', () => {
      const result = tryCatch(
        () => JSON.parse('{"a": 1}'),
        e => `Parse error: ${e}`
      );
      expect(result).toEqual(ok({ a: 1 }));
    });

    it('should wrap thrown error in Err', () => {
      const result = tryCatch(
        () => JSON.parse('{invalid}'),
        e => 'Parse error'
      );
      expect(isErr(result)).toBe(true);
    });
  });
});
```

### 3.2 JsonPathのテスト

```typescript
// src/react-app/domain/value-objects/__tests__/JsonPath.test.ts
import { describe, it, expect } from 'vitest';
import {
  rootPath,
  createPath,
  parsePath,
  pathToString,
  appendToPath,
  getParentPath,
  pathEquals,
  isDescendantOf,
  getDepth,
} from '../JsonPath';

describe('JsonPath', () => {
  describe('parsePath', () => {
    it('should parse root path', () => {
      expect(parsePath('$')).toEqual(rootPath);
      expect(parsePath('')).toEqual(rootPath);
    });

    it('should parse dot notation', () => {
      expect(parsePath('$.users.name')).toEqual(createPath(['users', 'name']));
    });

    it('should parse bracket notation with index', () => {
      expect(parsePath('$.users[0].name')).toEqual(createPath(['users', '0', 'name']));
    });

    it('should parse bracket notation with key', () => {
      expect(parsePath('$.data["special-key"]')).toEqual(createPath(['data', 'special-key']));
    });

    it('should handle mixed notation', () => {
      expect(parsePath('$.users[0].profile["display-name"]'))
        .toEqual(createPath(['users', '0', 'profile', 'display-name']));
    });
  });

  describe('pathToString', () => {
    it('should convert root to $', () => {
      expect(pathToString(rootPath)).toBe('$');
    });

    it('should use dot notation for simple keys', () => {
      expect(pathToString(createPath(['users', 'name']))).toBe('$.users.name');
    });

    it('should use bracket notation for indices', () => {
      expect(pathToString(createPath(['users', '0', 'name']))).toBe('$.users[0].name');
    });
  });

  describe('appendToPath', () => {
    it('should append segment to path', () => {
      const path = createPath(['users']);
      const newPath = appendToPath(path, 'name');
      expect(newPath).toEqual(createPath(['users', 'name']));
    });

    it('should not mutate original path', () => {
      const original = createPath(['users']);
      appendToPath(original, 'name');
      expect(original).toEqual(createPath(['users']));
    });
  });

  describe('getParentPath', () => {
    it('should return undefined for root', () => {
      expect(getParentPath(rootPath)).toBeUndefined();
    });

    it('should return parent path', () => {
      const path = createPath(['users', '0', 'name']);
      expect(getParentPath(path)).toEqual(createPath(['users', '0']));
    });
  });

  describe('pathEquals', () => {
    it('should return true for equal paths', () => {
      expect(pathEquals(
        createPath(['a', 'b']),
        createPath(['a', 'b'])
      )).toBe(true);
    });

    it('should return false for different paths', () => {
      expect(pathEquals(
        createPath(['a', 'b']),
        createPath(['a', 'c'])
      )).toBe(false);
    });
  });

  describe('isDescendantOf', () => {
    it('should return true for descendant', () => {
      expect(isDescendantOf(
        createPath(['users', '0', 'name']),
        createPath(['users'])
      )).toBe(true);
    });

    it('should return false for non-descendant', () => {
      expect(isDescendantOf(
        createPath(['config']),
        createPath(['users'])
      )).toBe(false);
    });

    it('should return false for same path', () => {
      expect(isDescendantOf(
        createPath(['users']),
        createPath(['users'])
      )).toBe(false);
    });
  });

  describe('getDepth', () => {
    it('should return 0 for root', () => {
      expect(getDepth(rootPath)).toBe(0);
    });

    it('should return segment count', () => {
      expect(getDepth(createPath(['a', 'b', 'c']))).toBe(3);
    });
  });
});
```

### 3.3 Differのテスト（TDD形式）

```typescript
// src/react-app/domain/functions/__tests__/differ.test.ts
import { describe, it, expect } from 'vitest';
import { computeDiff } from '../differ';
import { defaultCompareSettings, CompareSettings } from '../../types/diff';
import { createPath, rootPath } from '../../value-objects/JsonPath';

describe('computeDiff', () => {
  describe('primitive values', () => {
    it('should detect no difference for equal strings', () => {
      const result = computeDiff('hello', 'hello');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('unchanged');
    });

    it('should detect modification for different strings', () => {
      const result = computeDiff('hello', 'world');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('modified');
      expect(result[0].leftValue).toBe('hello');
      expect(result[0].rightValue).toBe('world');
    });

    it('should detect modification for different numbers', () => {
      const result = computeDiff(42, 100);
      expect(result[0].type).toBe('modified');
    });

    it('should detect modification for different booleans', () => {
      const result = computeDiff(true, false);
      expect(result[0].type).toBe('modified');
    });

    it('should detect modification when type changes', () => {
      const result = computeDiff('42', 42);
      expect(result[0].type).toBe('modified');
    });
  });

  describe('objects', () => {
    it('should detect no difference for equal objects', () => {
      const left = { name: 'Alice', age: 30 };
      const right = { name: 'Alice', age: 30 };
      const result = computeDiff(left, right);
      
      const unchangedCount = result.filter(e => e.type === 'unchanged').length;
      expect(unchangedCount).toBe(2);
    });

    it('should detect added property', () => {
      const left = { name: 'Alice' };
      const right = { name: 'Alice', age: 30 };
      const result = computeDiff(left, right);
      
      const added = result.find(e => e.type === 'added');
      expect(added).toBeDefined();
      expect(added?.path).toEqual(createPath(['age']));
      expect(added?.rightValue).toBe(30);
    });

    it('should detect removed property', () => {
      const left = { name: 'Alice', age: 30 };
      const right = { name: 'Alice' };
      const result = computeDiff(left, right);
      
      const removed = result.find(e => e.type === 'removed');
      expect(removed).toBeDefined();
      expect(removed?.path).toEqual(createPath(['age']));
      expect(removed?.leftValue).toBe(30);
    });

    it('should detect modified property', () => {
      const left = { name: 'Alice' };
      const right = { name: 'Bob' };
      const result = computeDiff(left, right);
      
      const modified = result.find(e => e.type === 'modified');
      expect(modified).toBeDefined();
      expect(modified?.leftValue).toBe('Alice');
      expect(modified?.rightValue).toBe('Bob');
    });

    it('should handle nested objects', () => {
      const left = { user: { profile: { name: 'Alice' } } };
      const right = { user: { profile: { name: 'Bob' } } };
      const result = computeDiff(left, right);
      
      const modified = result.find(e => e.type === 'modified');
      expect(modified?.path).toEqual(createPath(['user', 'profile', 'name']));
    });
  });

  describe('arrays', () => {
    it('should detect no difference for equal arrays', () => {
      const result = computeDiff([1, 2, 3], [1, 2, 3]);
      const unchangedCount = result.filter(e => e.type === 'unchanged').length;
      expect(unchangedCount).toBe(3);
    });

    it('should detect added element', () => {
      const result = computeDiff([1, 2], [1, 2, 3]);
      const added = result.find(e => e.type === 'added');
      expect(added).toBeDefined();
      expect(added?.path).toEqual(createPath(['2']));
      expect(added?.rightValue).toBe(3);
    });

    it('should detect removed element', () => {
      const result = computeDiff([1, 2, 3], [1, 2]);
      const removed = result.find(e => e.type === 'removed');
      expect(removed).toBeDefined();
      expect(removed?.leftValue).toBe(3);
    });

    it('should detect modified element', () => {
      const result = computeDiff([1, 2, 3], [1, 99, 3]);
      const modified = result.find(e => e.type === 'modified');
      expect(modified).toBeDefined();
      expect(modified?.path).toEqual(createPath(['1']));
    });
  });

  describe('array comparison with ignoreArrayOrder', () => {
    const settings: CompareSettings = {
      ...defaultCompareSettings,
      ignoreArrayOrder: true,
    };

    it('should treat reordered array as unchanged', () => {
      const result = computeDiff([1, 2, 3], [3, 1, 2], settings);
      const changes = result.filter(e => e.type !== 'unchanged');
      expect(changes).toHaveLength(0);
    });

    it('should still detect added elements', () => {
      const result = computeDiff([1, 2], [2, 1, 3], settings);
      const added = result.find(e => e.type === 'added');
      expect(added).toBeDefined();
      expect(added?.rightValue).toBe(3);
    });
  });

  describe('array comparison with arrayKeyField', () => {
    const settings: CompareSettings = {
      ...defaultCompareSettings,
      ignoreArrayOrder: true,
      arrayKeyField: 'id',
    };

    it('should match array elements by key field', () => {
      const left = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      const right = [
        { id: 2, name: 'Bob' },
        { id: 1, name: 'Alice Updated' },
      ];
      
      const result = computeDiff(left, right, settings);
      
      const modified = result.find(e => 
        e.type === 'modified' && e.path.segments.includes('name')
      );
      expect(modified).toBeDefined();
      expect(modified?.leftValue).toBe('Alice');
      expect(modified?.rightValue).toBe('Alice Updated');
    });

    it('should detect moved elements', () => {
      const left = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      const right = [
        { id: 2, name: 'Bob' },
        { id: 1, name: 'Alice' },
      ];
      
      const result = computeDiff(left, right, settings);
      const moved = result.filter(e => e.type === 'moved');
      expect(moved.length).toBeGreaterThan(0);
    });
  });

  describe('float tolerance', () => {
    const settings: CompareSettings = {
      ...defaultCompareSettings,
      floatTolerance: 0.001,
    };

    it('should treat close floats as equal', () => {
      const result = computeDiff(3.14159, 3.14160, settings);
      expect(result[0].type).toBe('unchanged');
    });

    it('should detect difference beyond tolerance', () => {
      const result = computeDiff(3.14, 3.15, settings);
      expect(result[0].type).toBe('modified');
    });
  });

  describe('exclude paths', () => {
    const settings: CompareSettings = {
      ...defaultCompareSettings,
      excludePaths: ['metadata', 'config.internal'],
    };

    it('should ignore excluded paths', () => {
      const left = { data: 1, metadata: { version: 1 } };
      const right = { data: 1, metadata: { version: 2 } };
      
      const result = computeDiff(left, right, settings);
      const metadataChanges = result.filter(e => 
        e.path.segments[0] === 'metadata'
      );
      expect(metadataChanges).toHaveLength(0);
    });
  });

  describe('max depth', () => {
    const settings: CompareSettings = {
      ...defaultCompareSettings,
      maxDepth: 2,
    };

    it('should stop comparison at max depth', () => {
      const left = { a: { b: { c: { d: 1 } } } };
      const right = { a: { b: { c: { d: 2 } } } };
      
      const result = computeDiff(left, right, settings);
      const deepChanges = result.filter(e => e.path.segments.length > 2);
      expect(deepChanges).toHaveLength(0);
    });
  });
});
```

### 3.4 Parserのテスト

```typescript
// src/react-app/domain/functions/__tests__/parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseJson, stringify, minify, formatJsonString } from '../parser';
import { isOk, isErr } from '../../types/result';

describe('parser', () => {
  describe('parseJson', () => {
    it('should parse valid JSON object', () => {
      const result = parseJson('{"name": "Alice", "age": 30}');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual({ name: 'Alice', age: 30 });
      }
    });

    it('should parse valid JSON array', () => {
      const result = parseJson('[1, 2, 3]');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual([1, 2, 3]);
      }
    });

    it('should parse primitive values', () => {
      expect(parseJson('42')).toEqual({ ok: true, value: 42 });
      expect(parseJson('"hello"')).toEqual({ ok: true, value: 'hello' });
      expect(parseJson('true')).toEqual({ ok: true, value: true });
      expect(parseJson('null')).toEqual({ ok: true, value: null });
    });

    it('should return Err for invalid JSON', () => {
      const result = parseJson('{invalid}');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('parse');
      }
    });

    it('should return Err for empty string', () => {
      const result = parseJson('');
      expect(isErr(result)).toBe(true);
    });

    it('should return Err for incomplete JSON', () => {
      const result = parseJson('{"name": "Alice"');
      expect(isErr(result)).toBe(true);
    });
  });

  describe('stringify', () => {
    it('should format with default indent', () => {
      const obj = { a: 1 };
      const result = stringify(obj);
      expect(result).toBe('{\n  "a": 1\n}');
    });

    it('should format with custom indent', () => {
      const obj = { a: 1 };
      const result = stringify(obj, 4);
      expect(result).toBe('{\n    "a": 1\n}');
    });
  });

  describe('minify', () => {
    it('should remove whitespace', () => {
      const obj = { a: 1, b: [1, 2, 3] };
      const result = minify(obj);
      expect(result).toBe('{"a":1,"b":[1,2,3]}');
    });
  });

  describe('formatJsonString', () => {
    it('should format valid JSON string', () => {
      const result = formatJsonString('{"a":1}');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe('{\n  "a": 1\n}');
      }
    });

    it('should return Err for invalid JSON', () => {
      const result = formatJsonString('{invalid}');
      expect(isErr(result)).toBe(true);
    });
  });
});
```

## 4. アプリケーション層のテスト

### 4.1 ユースケースのテスト

```typescript
// src/react-app/application/use-cases/__tests__/CompareJsonUseCase.test.ts
import { describe, it, expect } from 'vitest';
import { compareJson } from '../CompareJsonUseCase';
import { isOk, isErr } from '../../../domain/types/result';

describe('CompareJsonUseCase', () => {
  describe('compareJson', () => {
    it('should successfully compare two valid JSON strings', () => {
      const result = compareJson({
        leftJson: '{"name": "Alice"}',
        rightJson: '{"name": "Bob"}',
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.leftDocument).toBeDefined();
        expect(result.value.rightDocument).toBeDefined();
        expect(result.value.diffResult).toBeDefined();
        expect(result.value.diffResult.stats.modified).toBeGreaterThan(0);
      }
    });

    it('should return LEFT_PARSE_ERROR for invalid left JSON', () => {
      const result = compareJson({
        leftJson: '{invalid}',
        rightJson: '{"name": "Bob"}',
      });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('LEFT_PARSE_ERROR');
      }
    });

    it('should return RIGHT_PARSE_ERROR for invalid right JSON', () => {
      const result = compareJson({
        leftJson: '{"name": "Alice"}',
        rightJson: '{invalid}',
      });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('RIGHT_PARSE_ERROR');
      }
    });

    it('should apply custom settings', () => {
      const left = '[{"id": 1, "name": "A"}, {"id": 2, "name": "B"}]';
      const right = '[{"id": 2, "name": "B"}, {"id": 1, "name": "A"}]';

      const withoutIgnore = compareJson({ leftJson: left, rightJson: right });
      const withIgnore = compareJson({
        leftJson: left,
        rightJson: right,
        settings: { ignoreArrayOrder: true, arrayKeyField: 'id' },
      });

      // Without ignoreArrayOrder, should detect modifications
      if (isOk(withoutIgnore)) {
        const modified = withoutIgnore.value.diffResult.stats.modified;
        expect(modified).toBeGreaterThan(0);
      }

      // With ignoreArrayOrder and arrayKeyField, should be mostly unchanged
      if (isOk(withIgnore)) {
        const stats = withIgnore.value.diffResult.stats;
        expect(stats.added).toBe(0);
        expect(stats.removed).toBe(0);
      }
    });

    it('should calculate correct diff stats', () => {
      const result = compareJson({
        leftJson: '{"a": 1, "b": 2, "c": 3}',
        rightJson: '{"a": 1, "b": 99, "d": 4}',
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const { stats } = result.value.diffResult;
        expect(stats.unchanged).toBe(1); // a
        expect(stats.modified).toBe(1);  // b
        expect(stats.removed).toBe(1);   // c
        expect(stats.added).toBe(1);     // d
      }
    });
  });
});
```

### 4.2 ポートのモックテスト

```typescript
// src/react-app/application/use-cases/__tests__/ExportDiffUseCase.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createExportDiffUseCase } from '../ExportDiffUseCase';
import { ExportPort } from '../../ports/ExportPort';
import { DiffResultEntity, createDiffResult } from '../../../domain/entities/DiffResult';
import { ok, err } from '../../../domain/types/result';
import { defaultCompareSettings } from '../../../domain/types/diff';

describe('ExportDiffUseCase', () => {
  let mockExportPort: ExportPort;
  let mockDiffResult: DiffResultEntity;

  beforeEach(() => {
    // モックポートの作成
    mockExportPort = {
      downloadAsFile: vi.fn().mockReturnValue(ok(undefined)),
      copyToClipboard: vi.fn().mockResolvedValue(ok(undefined)),
    };

    // テスト用のDiffResult
    mockDiffResult = createDiffResult(
      'doc1',
      'doc2',
      [
        { type: 'added', path: { segments: ['new'] }, rightValue: 'value' },
        { type: 'removed', path: { segments: ['old'] }, leftValue: 'value' },
      ],
      defaultCompareSettings
    );
  });

  it('should export as JSON to clipboard', async () => {
    const exportDiff = createExportDiffUseCase(mockExportPort);

    const result = await exportDiff({
      diffResult: mockDiffResult,
      format: 'json',
      destination: 'clipboard',
    });

    expect(result.ok).toBe(true);
    expect(mockExportPort.copyToClipboard).toHaveBeenCalledWith(
      expect.stringContaining('"type":"added"')
    );
  });

  it('should export as Markdown to download', async () => {
    const exportDiff = createExportDiffUseCase(mockExportPort);

    const result = await exportDiff({
      diffResult: mockDiffResult,
      format: 'markdown',
      destination: 'download',
    });

    expect(result.ok).toBe(true);
    expect(mockExportPort.downloadAsFile).toHaveBeenCalledWith(
      expect.stringContaining('# JSON Diff Report'),
      expect.stringMatching(/diff-.*\.md/),
      'text/markdown'
    );
  });

  it('should use custom filename when provided', async () => {
    const exportDiff = createExportDiffUseCase(mockExportPort);

    await exportDiff({
      diffResult: mockDiffResult,
      format: 'json',
      destination: 'download',
      filename: 'my-diff.json',
    });

    expect(mockExportPort.downloadAsFile).toHaveBeenCalledWith(
      expect.any(String),
      'my-diff.json',
      'application/json'
    );
  });

  it('should handle clipboard error', async () => {
    mockExportPort.copyToClipboard = vi.fn().mockResolvedValue(
      err({ type: 'export', message: 'Clipboard access denied' })
    );

    const exportDiff = createExportDiffUseCase(mockExportPort);

    const result = await exportDiff({
      diffResult: mockDiffResult,
      format: 'json',
      destination: 'clipboard',
    });

    expect(result.ok).toBe(false);
  });
});
```

## 5. プレゼンテーション層のテスト

### 5.1 Hookのテスト

```typescript
// src/react-app/presentation/hooks/__tests__/useDiff.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDiff } from '../useDiff';

describe('useDiff', () => {
  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useDiff());

    expect(result.current.state.leftInput).toBe('');
    expect(result.current.state.rightInput).toBe('');
    expect(result.current.state.result).toBeNull();
    expect(result.current.state.error).toBeNull();
  });

  it('should update left input', () => {
    const { result } = renderHook(() => useDiff());

    act(() => {
      result.current.actions.setLeftInput('{"a": 1}');
    });

    expect(result.current.state.leftInput).toBe('{"a": 1}');
  });

  it('should update right input', () => {
    const { result } = renderHook(() => useDiff());

    act(() => {
      result.current.actions.setRightInput('{"b": 2}');
    });

    expect(result.current.state.rightInput).toBe('{"b": 2}');
  });

  it('should perform comparison', () => {
    const { result } = renderHook(() => useDiff());

    act(() => {
      result.current.actions.setLeftInput('{"name": "Alice"}');
      result.current.actions.setRightInput('{"name": "Bob"}');
    });

    act(() => {
      result.current.actions.compare();
    });

    expect(result.current.state.result).not.toBeNull();
    expect(result.current.state.error).toBeNull();
  });

  it('should set error for invalid JSON', () => {
    const { result } = renderHook(() => useDiff());

    act(() => {
      result.current.actions.setLeftInput('{invalid}');
      result.current.actions.setRightInput('{"valid": true}');
    });

    act(() => {
      result.current.actions.compare();
    });

    expect(result.current.state.result).toBeNull();
    expect(result.current.state.error).not.toBeNull();
    expect(result.current.state.error?.type).toBe('LEFT_PARSE_ERROR');
  });

  it('should clear all state', () => {
    const { result } = renderHook(() => useDiff());

    act(() => {
      result.current.actions.setLeftInput('{"a": 1}');
      result.current.actions.setRightInput('{"b": 2}');
      result.current.actions.compare();
    });

    act(() => {
      result.current.actions.clear();
    });

    expect(result.current.state.leftInput).toBe('');
    expect(result.current.state.rightInput).toBe('');
    expect(result.current.state.result).toBeNull();
  });

  it('should apply initial settings', () => {
    const { result } = renderHook(() => useDiff({ ignoreArrayOrder: true }));

    expect(result.current.settings.ignoreArrayOrder).toBe(true);
  });
});
```

### 5.2 コンポーネントのテスト

```typescript
// src/react-app/presentation/components/molecules/__tests__/JsonEditor.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JsonEditor } from '../JsonEditor';

describe('JsonEditor', () => {
  it('should render with label', () => {
    render(
      <JsonEditor
        value=""
        onChange={() => {}}
        label="Left JSON"
      />
    );

    expect(screen.getByLabelText('Left JSON')).toBeInTheDocument();
  });

  it('should display value', () => {
    render(
      <JsonEditor
        value='{"test": 123}'
        onChange={() => {}}
        label="JSON Input"
      />
    );

    expect(screen.getByDisplayValue('{"test": 123}')).toBeInTheDocument();
  });

  it('should call onChange when typing', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(
      <JsonEditor
        value=""
        onChange={handleChange}
        label="JSON Input"
      />
    );

    const input = screen.getByLabelText('JSON Input');
    await user.type(input, '{}');

    expect(handleChange).toHaveBeenCalled();
  });

  it('should display error message', () => {
    render(
      <JsonEditor
        value="{invalid"
        onChange={() => {}}
        label="JSON Input"
        error={{ type: 'parse', message: 'Unexpected end of JSON input' }}
      />
    );

    expect(screen.getByText('Unexpected end of JSON input')).toBeInTheDocument();
  });

  it('should call onFormat when format button clicked', async () => {
    const handleFormat = vi.fn();
    const user = userEvent.setup();

    render(
      <JsonEditor
        value='{"a":1}'
        onChange={() => {}}
        label="JSON Input"
        onFormat={handleFormat}
      />
    );

    const formatButton = screen.getByRole('button', { name: /format/i });
    await user.click(formatButton);

    expect(handleFormat).toHaveBeenCalled();
  });

  it('should handle file drop', async () => {
    const handleLoadFile = vi.fn();

    render(
      <JsonEditor
        value=""
        onChange={() => {}}
        label="JSON Input"
        onLoadFile={handleLoadFile}
      />
    );

    const dropzone = screen.getByTestId('json-editor-dropzone');
    const file = new File(['{"dropped": true}'], 'test.json', { type: 'application/json' });

    fireEvent.drop(dropzone, {
      dataTransfer: { files: [file] },
    });

    expect(handleLoadFile).toHaveBeenCalledWith(file);
  });
});
```

### 5.3 DiffViewerのテスト

```typescript
// src/react-app/presentation/components/organisms/__tests__/DiffViewer.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiffViewer } from '../DiffViewer';
import { DiffResultEntity, createDiffResult } from '../../../../domain/entities/DiffResult';
import { defaultCompareSettings } from '../../../../domain/types/diff';

describe('DiffViewer', () => {
  const createMockDiffResult = (): DiffResultEntity => createDiffResult(
    'left-doc',
    'right-doc',
    [
      { type: 'added', path: { segments: ['newField'] }, rightValue: 'new value' },
      { type: 'removed', path: { segments: ['oldField'] }, leftValue: 'old value' },
      { type: 'modified', path: { segments: ['changedField'] }, leftValue: 'before', rightValue: 'after' },
    ],
    defaultCompareSettings
  );

  it('should render diff summary', () => {
    render(
      <DiffViewer
        diffResult={createMockDiffResult()}
        viewMode="side-by-side"
        filter={{ types: ['added', 'removed', 'modified'] }}
        onNavigate={() => {}}
      />
    );

    expect(screen.getByText(/1 added/i)).toBeInTheDocument();
    expect(screen.getByText(/1 removed/i)).toBeInTheDocument();
    expect(screen.getByText(/1 modified/i)).toBeInTheDocument();
  });

  it('should display diff entries', () => {
    render(
      <DiffViewer
        diffResult={createMockDiffResult()}
        viewMode="side-by-side"
        filter={{ types: ['added', 'removed', 'modified'] }}
        onNavigate={() => {}}
      />
    );

    expect(screen.getByText('$.newField')).toBeInTheDocument();
    expect(screen.getByText('$.oldField')).toBeInTheDocument();
    expect(screen.getByText('$.changedField')).toBeInTheDocument();
  });

  it('should call onNavigate when path is clicked', async () => {
    const handleNavigate = vi.fn();
    const user = userEvent.setup();

    render(
      <DiffViewer
        diffResult={createMockDiffResult()}
        viewMode="side-by-side"
        filter={{ types: ['added', 'removed', 'modified'] }}
        onNavigate={handleNavigate}
      />
    );

    const path = screen.getByText('$.newField');
    await user.click(path);

    expect(handleNavigate).toHaveBeenCalledWith({ segments: ['newField'] });
  });

  it('should filter by type', () => {
    render(
      <DiffViewer
        diffResult={createMockDiffResult()}
        viewMode="side-by-side"
        filter={{ types: ['added'] }}
        onNavigate={() => {}}
      />
    );

    expect(screen.getByText('$.newField')).toBeInTheDocument();
    expect(screen.queryByText('$.oldField')).not.toBeInTheDocument();
    expect(screen.queryByText('$.changedField')).not.toBeInTheDocument();
  });

  it('should highlight specified path', () => {
    render(
      <DiffViewer
        diffResult={createMockDiffResult()}
        viewMode="side-by-side"
        filter={{ types: ['added', 'removed', 'modified'] }}
        onNavigate={() => {}}
        highlightedPath={{ segments: ['newField'] }}
      />
    );

    const highlightedRow = screen.getByText('$.newField').closest('[data-highlighted="true"]');
    expect(highlightedRow).toBeInTheDocument();
  });
});
```

## 6. 統合テスト

### 6.1 API統合テスト

```typescript
// src/test/integration/api.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { unstable_dev } from 'wrangler';
import type { UnstableDevWorker } from 'wrangler';

describe('Worker API Integration', () => {
  let worker: UnstableDevWorker;

  beforeAll(async () => {
    worker = await unstable_dev('src/worker/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await worker.fetch('/api/health');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('POST /api/share', () => {
    it('should create share link', async () => {
      const response = await worker.fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leftJson: '{"a": 1}',
          rightJson: '{"a": 2}',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBeDefined();
      expect(data.url).toContain('/share/');
    });

    it('should reject oversized payload', async () => {
      const largeJson = JSON.stringify({ data: 'x'.repeat(6 * 1024 * 1024) });

      const response = await worker.fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leftJson: largeJson,
          rightJson: '{}',
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/share/:id', () => {
    it('should retrieve shared data', async () => {
      // First create a share
      const createResponse = await worker.fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leftJson: '{"test": true}',
          rightJson: '{"test": false}',
        }),
      });
      const { id } = await createResponse.json();

      // Then retrieve it
      const getResponse = await worker.fetch(`/api/share/${id}`);
      const data = await getResponse.json();

      expect(getResponse.status).toBe(200);
      expect(data.leftJson).toBe('{"test": true}');
      expect(data.rightJson).toBe('{"test": false}');
    });

    it('should return 404 for unknown id', async () => {
      const response = await worker.fetch('/api/share/nonexistent');
      expect(response.status).toBe(404);
    });
  });
});
```

### 6.2 MSWハンドラー

```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Share API
  http.post('/api/share', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: 'test-share-id',
      url: 'http://localhost/share/test-share-id',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }),

  http.get('/api/share/:id', ({ params }) => {
    if (params.id === 'not-found') {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Share not found' } },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      id: params.id,
      leftJson: '{"mock": "left"}',
      rightJson: '{"mock": "right"}',
      createdAt: new Date().toISOString(),
    });
  }),

  // Fetch JSON API
  http.post('/api/fetch-json', async ({ request }) => {
    const { url } = await request.json();
    
    if (url === 'https://error.example.com') {
      return HttpResponse.json(
        { error: { code: 'FETCH_ERROR', message: 'Failed to fetch' } },
        { status: 500 }
      );
    }

    return HttpResponse.json({
      data: { fetched: true, from: url },
      contentType: 'application/json',
      size: 100,
    });
  }),

  // Health check
  http.get('/api/health', () => {
    return HttpResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }),
];
```

## 7. E2Eテスト

### 7.1 Playwright設定

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 7.2 E2Eテストケース

```typescript
// e2e/diff-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('JSON Diff Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should compare two JSON inputs', async ({ page }) => {
    // 左側にJSONを入力
    const leftEditor = page.getByLabel('Left JSON');
    await leftEditor.fill('{"name": "Alice", "age": 30}');

    // 右側にJSONを入力
    const rightEditor = page.getByLabel('Right JSON');
    await rightEditor.fill('{"name": "Bob", "age": 30}');

    // 比較ボタンをクリック
    await page.getByRole('button', { name: /compare/i }).click();

    // 差分が表示されることを確認
    await expect(page.getByText('$.name')).toBeVisible();
    await expect(page.getByText(/1 modified/i)).toBeVisible();
  });

  test('should show parse error for invalid JSON', async ({ page }) => {
    const leftEditor = page.getByLabel('Left JSON');
    await leftEditor.fill('{invalid json}');

    const rightEditor = page.getByLabel('Right JSON');
    await rightEditor.fill('{"valid": true}');

    await page.getByRole('button', { name: /compare/i }).click();

    await expect(page.getByText(/parse error/i)).toBeVisible();
  });

  test('should format JSON on button click', async ({ page }) => {
    const leftEditor = page.getByLabel('Left JSON');
    await leftEditor.fill('{"a":1,"b":2}');

    await page.getByRole('button', { name: /format/i }).first().click();

    // フォーマット後の値を確認
    await expect(leftEditor).toHaveValue(/\n/); // 改行が含まれている
  });

  test('should navigate between differences', async ({ page }) => {
    const leftEditor = page.getByLabel('Left JSON');
    await leftEditor.fill('{"a": 1, "b": 2, "c": 3}');

    const rightEditor = page.getByLabel('Right JSON');
    await rightEditor.fill('{"a": 10, "b": 20, "c": 30}');

    await page.getByRole('button', { name: /compare/i }).click();

    // 次の差分へ移動
    await page.getByRole('button', { name: /next/i }).click();
    await expect(page.locator('[data-highlighted="true"]')).toBeVisible();

    // 前の差分へ移動
    await page.getByRole('button', { name: /prev/i }).click();
    await expect(page.locator('[data-highlighted="true"]')).toBeVisible();
  });

  test('should toggle view mode', async ({ page }) => {
    const leftEditor = page.getByLabel('Left JSON');
    await leftEditor.fill('{"test": 1}');

    const rightEditor = page.getByLabel('Right JSON');
    await rightEditor.fill('{"test": 2}');

    await page.getByRole('button', { name: /compare/i }).click();

    // Unified viewに切り替え
    await page.getByRole('tab', { name: /unified/i }).click();
    await expect(page.locator('[data-view-mode="unified"]')).toBeVisible();

    // Inline viewに切り替え
    await page.getByRole('tab', { name: /inline/i }).click();
    await expect(page.locator('[data-view-mode="inline"]')).toBeVisible();
  });

  test('should export diff as markdown', async ({ page }) => {
    const leftEditor = page.getByLabel('Left JSON');
    await leftEditor.fill('{"a": 1}');

    const rightEditor = page.getByLabel('Right JSON');
    await rightEditor.fill('{"a": 2}');

    await page.getByRole('button', { name: /compare/i }).click();
    await page.getByRole('button', { name: /export/i }).click();
    await page.getByRole('menuitem', { name: /markdown/i }).click();

    // ダウンロードを確認（または clipboard内容）
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /download/i }).click();
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toMatch(/\.md$/);
  });

  test('should handle keyboard shortcuts', async ({ page }) => {
    const leftEditor = page.getByLabel('Left JSON');
    await leftEditor.fill('{"a": 1}');

    const rightEditor = page.getByLabel('Right JSON');
    await rightEditor.fill('{"a": 2}');

    // Cmd/Ctrl + Enter で比較実行
    await page.keyboard.press('Control+Enter');

    await expect(page.getByText('$.a')).toBeVisible();
  });

  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const leftEditor = page.getByLabel('Left JSON');
    await leftEditor.fill('{"mobile": true}');

    const rightEditor = page.getByLabel('Right JSON');
    await rightEditor.fill('{"mobile": false}');

    await page.getByRole('button', { name: /compare/i }).click();

    await expect(page.getByText('$.mobile')).toBeVisible();
  });
});
```

### 7.3 アクセシビリティテスト

```typescript
// e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('should have no accessibility violations on main page', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have no accessibility violations with diff results', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Left JSON').fill('{"a": 1}');
    await page.getByLabel('Right JSON').fill('{"a": 2}');
    await page.getByRole('button', { name: /compare/i }).click();

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should be navigable with keyboard only', async ({ page }) => {
    await page.goto('/');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Left JSON')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Right JSON')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /compare/i })).toBeFocused();
  });

  test('should announce errors to screen readers', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Left JSON').fill('{invalid}');
    await page.getByRole('button', { name: /compare/i }).click();

    const errorAlert = page.getByRole('alert');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toHaveAttribute('aria-live', 'polite');
  });
});
```

## 8. テストスクリプト

```json
// package.json (scripts section)
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:all": "npm run test:run && npm run test:e2e"
  }
}
```

## 9. TDDワークフロー例

### 9.1 新機能追加の手順

```
1. 要件を理解する
   └── 「配列の順序を無視して比較する機能」

2. テストを書く（RED）
   └── ignoreArrayOrder設定のテストケースを作成
   └── テストが失敗することを確認

3. 最小限の実装（GREEN）
   └── diffArraysUnordered関数を実装
   └── テストがパスすることを確認

4. リファクタリング（REFACTOR）
   └── コードの改善
   └── テストが引き続きパスすることを確認

5. 繰り返し
   └── 次のテストケース（エッジケース）を追加
```

### 9.2 バグ修正の手順

```
1. バグを再現するテストを書く
   └── 失敗するテストを確認

2. バグを修正する
   └── テストがパスすることを確認

3. 回帰テストとして維持
   └── 今後同じバグが発生しないことを保証
```

