# JSON Diff ツール 関数型設計書

## 1. 関数型プログラミング原則

### 1.1 純粋関数
- 同じ入力に対して常に同じ出力を返す
- 副作用を持たない（外部状態の変更なし）
- 参照透過性を保証

### 1.2 イミュータブルデータ
- すべてのデータ構造は不変
- 変更は新しいオブジェクトの生成で表現
- TypeScriptの`readonly`修飾子を活用

### 1.3 関数合成
- 小さな関数を組み合わせて大きな機能を構築
- パイプライン処理による可読性向上
- 高階関数の活用

## 2. コア関数定義

### 2.1 パーサー関数

```typescript
// src/react-app/domain/functions/parser.ts

import { JsonValue } from '../types/json';
import { Result, ok, err, tryCatch } from '../types/result';
import { ValidationError, createParseError } from '../value-objects/ValidationError';

/**
 * JSON文字列をパースする純粋関数
 */
export const parseJson = (input: string): Result<JsonValue, ValidationError> =>
  tryCatch(
    () => JSON.parse(input) as JsonValue,
    (error) => createParseError(
      error instanceof Error ? error.message : 'Unknown parse error'
    )
  );

/**
 * JSON値を整形された文字列に変換
 */
export const stringify = (
  value: JsonValue,
  indent: number = 2
): string =>
  JSON.stringify(value, null, indent);

/**
 * JSON値を圧縮された文字列に変換
 */
export const minify = (value: JsonValue): string =>
  JSON.stringify(value);

/**
 * 文字列を整形
 */
export const formatJsonString = (
  input: string,
  indent: number = 2
): Result<string, ValidationError> => {
  const parsed = parseJson(input);
  if (!parsed.ok) return parsed;
  return ok(stringify(parsed.value, indent));
};
```

### 2.2 バリデーター関数

```typescript
// src/react-app/domain/functions/validator.ts

import { JsonValue, isJsonObject, isJsonArray } from '../types/json';
import { Result, ok, err, combine } from '../types/result';
import { ValidationError, createStructureError } from '../value-objects/ValidationError';

/**
 * バリデーションルール型
 */
export type ValidationRule<T> = (value: T) => Result<T, ValidationError>;

/**
 * 最大深度チェック
 */
export const validateMaxDepth = (maxDepth: number): ValidationRule<JsonValue> =>
  (value) => {
    const depth = calculateDepth(value);
    return depth <= maxDepth
      ? ok(value)
      : err(createStructureError(`Max depth exceeded: ${depth} > ${maxDepth}`));
  };

/**
 * 最大サイズチェック（文字数）
 */
export const validateMaxSize = (maxSize: number): ValidationRule<string> =>
  (input) =>
    input.length <= maxSize
      ? ok(input)
      : err(createStructureError(`Max size exceeded: ${input.length} > ${maxSize}`));

/**
 * 深度計算
 */
export const calculateDepth = (value: JsonValue): number => {
  if (isJsonArray(value)) {
    return 1 + Math.max(0, ...value.map(calculateDepth));
  }
  if (isJsonObject(value)) {
    return 1 + Math.max(0, ...Object.values(value).map(calculateDepth));
  }
  return 0;
};

/**
 * ノード数計算
 */
export const countNodes = (value: JsonValue): number => {
  if (isJsonArray(value)) {
    return 1 + value.reduce((sum, item) => sum + countNodes(item), 0);
  }
  if (isJsonObject(value)) {
    return 1 + Object.values(value).reduce((sum, v) => sum + countNodes(v), 0);
  }
  return 1;
};

/**
 * ルールの合成
 */
export const composeRules = <T>(
  ...rules: ValidationRule<T>[]
): ValidationRule<T> =>
  (value) => {
    for (const rule of rules) {
      const result = rule(value);
      if (!result.ok) return result;
    }
    return ok(value);
  };
```

### 2.3 フォーマッター関数

```typescript
// src/react-app/domain/functions/formatter.ts

import { DiffEntry, DiffResult, ChangeType } from '../types/diff';
import { pathToString } from '../value-objects/JsonPath';

/**
 * 差分エントリをテキスト行に変換
 */
export const formatDiffEntry = (entry: DiffEntry): string => {
  const path = pathToString(entry.path);
  const prefix = getChangePrefix(entry.type);
  
  switch (entry.type) {
    case 'added':
      return `${prefix} ${path}: ${formatValue(entry.rightValue)}`;
    case 'removed':
      return `${prefix} ${path}: ${formatValue(entry.leftValue)}`;
    case 'modified':
      return `${prefix} ${path}: ${formatValue(entry.leftValue)} → ${formatValue(entry.rightValue)}`;
    case 'moved':
      return `${prefix} ${path}: moved from index ${entry.leftIndex} to ${entry.rightIndex}`;
    case 'unchanged':
      return `  ${path}: ${formatValue(entry.leftValue)}`;
  }
};

const getChangePrefix = (type: ChangeType): string => {
  switch (type) {
    case 'added': return '+';
    case 'removed': return '-';
    case 'modified': return '~';
    case 'moved': return '>';
    case 'unchanged': return ' ';
  }
};

const formatValue = (value: unknown): string =>
  JSON.stringify(value) ?? 'undefined';

/**
 * Markdown形式で出力
 */
export const formatAsMarkdown = (result: DiffResult): string => {
  const lines: string[] = [
    '# JSON Diff Report',
    '',
    '## Summary',
    `- Added: ${result.stats.added}`,
    `- Removed: ${result.stats.removed}`,
    `- Modified: ${result.stats.modified}`,
    `- Moved: ${result.stats.moved}`,
    '',
    '## Changes',
    '',
    '```diff',
    ...result.entries
      .filter(e => e.type !== 'unchanged')
      .map(formatDiffEntry),
    '```',
  ];
  
  return lines.join('\n');
};

/**
 * JSON Patch形式 (RFC 6902) で出力
 */
export const formatAsJsonPatch = (result: DiffResult): readonly JsonPatchOp[] =>
  result.entries
    .filter(e => e.type !== 'unchanged')
    .map(entryToJsonPatch)
    .filter((op): op is JsonPatchOp => op !== null);

interface JsonPatchOp {
  op: 'add' | 'remove' | 'replace' | 'move';
  path: string;
  value?: unknown;
  from?: string;
}

const entryToJsonPatch = (entry: DiffEntry): JsonPatchOp | null => {
  const path = '/' + entry.path.segments.join('/');
  
  switch (entry.type) {
    case 'added':
      return { op: 'add', path, value: entry.rightValue };
    case 'removed':
      return { op: 'remove', path };
    case 'modified':
      return { op: 'replace', path, value: entry.rightValue };
    case 'moved':
      return {
        op: 'move',
        from: path.replace(/\/\d+$/, `/${entry.leftIndex}`),
        path,
      };
    default:
      return null;
  }
};
```

## 3. 関数合成パターン

### 3.1 パイプライン関数

```typescript
// src/react-app/shared/pipe.ts

/**
 * 左から右への関数合成（パイプライン）
 */
export function pipe<A>(value: A): A;
export function pipe<A, B>(value: A, fn1: (a: A) => B): B;
export function pipe<A, B, C>(value: A, fn1: (a: A) => B, fn2: (b: B) => C): C;
export function pipe<A, B, C, D>(
  value: A,
  fn1: (a: A) => B,
  fn2: (b: B) => C,
  fn3: (c: C) => D
): D;
export function pipe<A, B, C, D, E>(
  value: A,
  fn1: (a: A) => B,
  fn2: (b: B) => C,
  fn3: (c: C) => D,
  fn4: (d: D) => E
): E;
export function pipe(value: unknown, ...fns: Array<(arg: unknown) => unknown>): unknown {
  return fns.reduce((acc, fn) => fn(acc), value);
}

/**
 * 右から左への関数合成
 */
export const compose = <T>(...fns: Array<(arg: T) => T>) =>
  (value: T): T =>
    fns.reduceRight((acc, fn) => fn(acc), value);
```

### 3.2 Result用パイプライン

```typescript
// src/react-app/shared/result-pipe.ts

import { Result, flatMap, map } from '../domain/types/result';

/**
 * Result型を通じたパイプライン処理
 */
export const pipeResult = <T, E>(
  initial: Result<T, E>
) => ({
  map: <U>(fn: (value: T) => U) => pipeResult(map(initial, fn)),
  flatMap: <U>(fn: (value: T) => Result<U, E>) => pipeResult(flatMap(initial, fn)),
  get: () => initial,
});

/**
 * 使用例:
 * const result = pipeResult(parseJson(input))
 *   .flatMap(validateMaxDepth(100))
 *   .map(normalizeData)
 *   .get();
 */
```

## 4. 高階関数パターン

### 4.1 メモ化

```typescript
// src/react-app/shared/memoize.ts

/**
 * 関数のメモ化
 */
export const memoize = <Args extends unknown[], R>(
  fn: (...args: Args) => R,
  keyFn: (...args: Args) => string = (...args) => JSON.stringify(args)
): ((...args: Args) => R) => {
  const cache = new Map<string, R>();
  
  return (...args: Args): R => {
    const key = keyFn(...args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

/**
 * LRUキャッシュ付きメモ化
 */
export const memoizeWithLRU = <Args extends unknown[], R>(
  fn: (...args: Args) => R,
  maxSize: number = 100
): ((...args: Args) => R) => {
  const cache = new Map<string, R>();
  
  return (...args: Args): R => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      const value = cache.get(key)!;
      cache.delete(key);
      cache.set(key, value);
      return value;
    }
    
    const result = fn(...args);
    
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }
    
    cache.set(key, result);
    return result;
  };
};
```

### 4.2 カリー化

```typescript
// src/react-app/shared/curry.ts

/**
 * 2引数関数のカリー化
 */
export const curry2 = <A, B, R>(
  fn: (a: A, b: B) => R
): ((a: A) => (b: B) => R) =>
  (a: A) => (b: B) => fn(a, b);

/**
 * 3引数関数のカリー化
 */
export const curry3 = <A, B, C, R>(
  fn: (a: A, b: B, c: C) => R
): ((a: A) => (b: B) => (c: C) => R) =>
  (a: A) => (b: B) => (c: C) => fn(a, b, c);

/**
 * 部分適用
 */
export const partial = <A, B extends unknown[], R>(
  fn: (a: A, ...rest: B) => R,
  a: A
): ((...rest: B) => R) =>
  (...rest: B) => fn(a, ...rest);
```

## 5. 副作用の分離

### 5.1 IO モナド風パターン

```typescript
// src/react-app/shared/io.ts

/**
 * 副作用をラップする型
 * 実行を遅延させ、純粋な関数として扱える
 */
export interface IO<T> {
  readonly run: () => T;
}

export const io = <T>(effect: () => T): IO<T> => ({
  run: effect,
});

export const mapIO = <T, U>(
  ioValue: IO<T>,
  fn: (value: T) => U
): IO<U> =>
  io(() => fn(ioValue.run()));

export const flatMapIO = <T, U>(
  ioValue: IO<T>,
  fn: (value: T) => IO<U>
): IO<U> =>
  io(() => fn(ioValue.run()).run());

/**
 * 使用例:
 * const readStorage = io(() => localStorage.getItem('key'));
 * const parseAndProcess = flatMapIO(readStorage, (data) =>
 *   io(() => JSON.parse(data ?? '{}'))
 * );
 * // 実行時まで副作用は発生しない
 * const result = parseAndProcess.run();
 */
```

### 5.2 副作用インタープリター

```typescript
// src/react-app/application/effects.ts

/**
 * 副作用の記述（純粋なデータ構造）
 */
export type Effect =
  | { type: 'READ_STORAGE'; key: string }
  | { type: 'WRITE_STORAGE'; key: string; value: string }
  | { type: 'FETCH_URL'; url: string }
  | { type: 'LOG'; message: string };

/**
 * 副作用の実行（インフラ層で実装）
 */
export type EffectRunner = <T>(effect: Effect) => Promise<T>;

/**
 * プログラムは副作用の記述のみを返す純粋関数
 */
export const saveToStorage = (key: string, value: string): Effect => ({
  type: 'WRITE_STORAGE',
  key,
  value,
});

export const loadFromStorage = (key: string): Effect => ({
  type: 'READ_STORAGE',
  key,
});
```

## 6. レンズパターン

```typescript
// src/react-app/shared/lens.ts

/**
 * レンズ型 - ネストしたデータ構造の一部にフォーカス
 */
export interface Lens<S, A> {
  readonly get: (s: S) => A;
  readonly set: (a: A) => (s: S) => S;
}

/**
 * レンズの作成
 */
export const lens = <S, A>(
  get: (s: S) => A,
  set: (a: A) => (s: S) => S
): Lens<S, A> => ({ get, set });

/**
 * レンズの合成
 */
export const composeLens = <S, A, B>(
  outer: Lens<S, A>,
  inner: Lens<A, B>
): Lens<S, B> =>
  lens(
    (s) => inner.get(outer.get(s)),
    (b) => (s) => outer.set(inner.set(b)(outer.get(s)))(s)
  );

/**
 * レンズを通じた変更
 */
export const over = <S, A>(
  l: Lens<S, A>,
  fn: (a: A) => A
): ((s: S) => S) =>
  (s) => l.set(fn(l.get(s)))(s);

/**
 * プロパティレンズの生成
 */
export const prop = <S, K extends keyof S>(key: K): Lens<S, S[K]> =>
  lens(
    (s) => s[key],
    (a) => (s) => ({ ...s, [key]: a })
  );
```

## 7. 状態管理との統合

```typescript
// src/react-app/application/state/reducer.ts

import { AppState, Action } from './types';
import { pipe } from '../../shared/pipe';
import { over, prop, composeLens } from '../../shared/lens';

/**
 * 純粋関数としてのリデューサー
 */
export const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_LEFT_INPUT':
      return pipe(
        state,
        over(prop('leftInput'), (input) => ({
          ...input,
          raw: action.payload,
        }))
      );
    
    case 'SET_DIFF_SETTINGS':
      return pipe(
        state,
        over(prop('settings'), (settings) => ({
          ...settings,
          ...action.payload,
        }))
      );
    
    default:
      return state;
  }
};

/**
 * ミドルウェアとしてのロギング（純粋関数版）
 */
export const withLogging = (
  reducer: (state: AppState, action: Action) => AppState
) => (state: AppState, action: Action): AppState => {
  const newState = reducer(state, action);
  // ログは副作用だが、戻り値は同じ
  console.log('Action:', action.type, 'State:', newState);
  return newState;
};
```

