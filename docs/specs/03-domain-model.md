# JSON Diff ツール ドメインモデル設計書

## 1. ドメイン概要

### 1.1 ユビキタス言語

| 用語 | 英語 | 定義 |
|------|------|------|
| JSONドキュメント | JsonDocument | 解析されたJSON構造体 |
| 差分 | Diff | 2つのJSONドキュメント間の違い |
| 差分エントリ | DiffEntry | 個々の変更点 |
| JSONパス | JsonPath | JSON構造内の位置を示すパス |
| 変更タイプ | ChangeType | 追加/削除/変更/移動 |
| 比較設定 | CompareSettings | 比較時のオプション設定 |
| 差分レポート | DiffReport | 差分結果のまとめ |

### 1.2 境界づけられたコンテキスト

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          JSON Diff Context                               │
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │    Parsing       │  │    Comparing     │  │    Reporting     │       │
│  │    Context       │  │    Context       │  │    Context       │       │
│  │                  │  │                  │  │                  │       │
│  │  - Parse JSON    │  │  - Compute Diff  │  │  - Format Output │       │
│  │  - Validate      │  │  - Match Arrays  │  │  - Export        │       │
│  │  - Format        │  │  - Filter        │  │  - Share         │       │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 2. 型定義

### 2.1 基本JSON型

```typescript
// src/react-app/domain/types/json.ts

/**
 * JSON値の型定義（再帰的）
 */
export type JsonValue = 
  | JsonPrimitive 
  | JsonArray 
  | JsonObject;

export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = readonly JsonValue[];
export type JsonObject = { readonly [key: string]: JsonValue };

/**
 * JSON値の型判別
 */
export type JsonType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'null' 
  | 'array' 
  | 'object';

/**
 * 型判別関数
 */
export const getJsonType = (value: JsonValue): JsonType => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value as JsonType;
};

export const isJsonPrimitive = (value: JsonValue): value is JsonPrimitive =>
  value === null || ['string', 'number', 'boolean'].includes(typeof value);

export const isJsonArray = (value: JsonValue): value is JsonArray =>
  Array.isArray(value);

export const isJsonObject = (value: JsonValue): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
```

### 2.2 差分関連型

```typescript
// src/react-app/domain/types/diff.ts

/**
 * 変更タイプ
 */
export type ChangeType = 
  | 'added'      // 追加
  | 'removed'    // 削除
  | 'modified'   // 変更
  | 'moved'      // 移動（配列内）
  | 'unchanged'; // 変更なし

/**
 * 差分エントリ
 * 単一の変更を表す
 */
export interface DiffEntry {
  readonly type: ChangeType;
  readonly path: JsonPath;
  readonly leftValue?: JsonValue;  // 元の値（removed/modified時）
  readonly rightValue?: JsonValue; // 新しい値（added/modified時）
  readonly leftIndex?: number;     // 配列の元インデックス
  readonly rightIndex?: number;    // 配列の新インデックス
}

/**
 * 差分結果
 */
export interface DiffResult {
  readonly entries: readonly DiffEntry[];
  readonly stats: DiffStats;
  readonly metadata: DiffMetadata;
}

/**
 * 差分統計
 */
export interface DiffStats {
  readonly added: number;
  readonly removed: number;
  readonly modified: number;
  readonly moved: number;
  readonly unchanged: number;
  readonly total: number;
}

/**
 * 差分メタデータ
 */
export interface DiffMetadata {
  readonly computedAt: Date;
  readonly leftSize: number;
  readonly rightSize: number;
  readonly settings: CompareSettings;
}

/**
 * 比較設定
 */
export interface CompareSettings {
  readonly ignoreArrayOrder: boolean;
  readonly arrayKeyField?: string;
  readonly floatTolerance: number;
  readonly treatNullAsUndefined: boolean;
  readonly excludePaths: readonly string[];
  readonly maxDepth: number;
}

/**
 * デフォルト比較設定
 */
export const defaultCompareSettings: CompareSettings = {
  ignoreArrayOrder: false,
  arrayKeyField: undefined,
  floatTolerance: 0,
  treatNullAsUndefined: false,
  excludePaths: [],
  maxDepth: Infinity,
};
```

### 2.3 Result型

```typescript
// src/react-app/domain/types/result.ts

/**
 * 成功または失敗を表す型
 * 関数型プログラミングにおけるEither型のTypeScript実装
 */
export type Result<T, E> = Ok<T> | Err<E>;

export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

// コンストラクタ
export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

// ユーティリティ関数
export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result.ok;
export const isErr = <T, E>(result: Result<T, E>): result is Err<E> => !result.ok;

// Functor: map
export const map = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> =>
  result.ok ? ok(fn(result.value)) : result;

// Monad: flatMap (chain/bind)
export const flatMap = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> =>
  result.ok ? fn(result.value) : result;

// エラー変換
export const mapError = <T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> =>
  result.ok ? result : err(fn(result.error));

// デフォルト値
export const getOrElse = <T, E>(
  result: Result<T, E>,
  defaultValue: T
): T =>
  result.ok ? result.value : defaultValue;

// 複数Resultの結合
export const combine = <T, E>(
  results: readonly Result<T, E>[]
): Result<readonly T[], E> => {
  const values: T[] = [];
  for (const result of results) {
    if (!result.ok) return result;
    values.push(result.value);
  }
  return ok(values);
};

// try-catchをResultに変換
export const tryCatch = <T, E>(
  fn: () => T,
  onError: (error: unknown) => E
): Result<T, E> => {
  try {
    return ok(fn());
  } catch (error) {
    return err(onError(error));
  }
};

// 非同期版
export const tryCatchAsync = async <T, E>(
  fn: () => Promise<T>,
  onError: (error: unknown) => E
): Promise<Result<T, E>> => {
  try {
    return ok(await fn());
  } catch (error) {
    return err(onError(error));
  }
};
```

## 3. エンティティ

### 3.1 JsonDocument

```typescript
// src/react-app/domain/entities/JsonDocument.ts

import { JsonValue, JsonType, getJsonType } from '../types/json';
import { JsonPath } from '../value-objects/JsonPath';
import { Result, ok, err } from '../types/result';
import { ValidationError } from '../value-objects/ValidationError';

/**
 * JSONドキュメントエンティティ
 * パースされたJSON構造を表す
 */
export interface JsonDocument {
  readonly id: string;
  readonly raw: string;
  readonly value: JsonValue;
  readonly createdAt: Date;
  readonly size: number;
}

/**
 * JsonDocumentのファクトリ関数
 */
export const createJsonDocument = (
  raw: string,
  id?: string
): Result<JsonDocument, ValidationError> => {
  const parseResult = parseJsonSafe(raw);
  
  if (!parseResult.ok) {
    return err(parseResult.error);
  }
  
  return ok({
    id: id ?? generateId(),
    raw,
    value: parseResult.value,
    createdAt: new Date(),
    size: raw.length,
  });
};

/**
 * 安全なJSONパース
 */
const parseJsonSafe = (raw: string): Result<JsonValue, ValidationError> => {
  try {
    return ok(JSON.parse(raw) as JsonValue);
  } catch (e) {
    const error = e as SyntaxError;
    return err({
      type: 'parse',
      message: error.message,
      position: extractPosition(error),
    });
  }
};

/**
 * エラーから位置情報を抽出
 */
const extractPosition = (error: SyntaxError): { line: number; column: number } | undefined => {
  const match = error.message.match(/position (\d+)/);
  if (match) {
    return { line: 0, column: parseInt(match[1], 10) };
  }
  return undefined;
};

/**
 * ID生成
 */
const generateId = (): string =>
  `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * パスによる値取得
 */
export const getValueAtPath = (
  document: JsonDocument,
  path: JsonPath
): JsonValue | undefined => {
  return path.segments.reduce<JsonValue | undefined>(
    (current, segment) => {
      if (current === undefined) return undefined;
      if (typeof current !== 'object' || current === null) return undefined;
      
      if (Array.isArray(current)) {
        const index = parseInt(segment, 10);
        return isNaN(index) ? undefined : current[index];
      }
      
      return (current as Record<string, JsonValue>)[segment];
    },
    document.value
  );
};

/**
 * ドキュメントの型情報取得
 */
export const getRootType = (document: JsonDocument): JsonType =>
  getJsonType(document.value);
```

### 3.2 DiffResult エンティティ

```typescript
// src/react-app/domain/entities/DiffResult.ts

import { DiffEntry, DiffStats, DiffMetadata, CompareSettings } from '../types/diff';
import { JsonPath } from '../value-objects/JsonPath';

/**
 * 差分結果エンティティ
 */
export interface DiffResultEntity {
  readonly id: string;
  readonly leftDocumentId: string;
  readonly rightDocumentId: string;
  readonly entries: readonly DiffEntry[];
  readonly stats: DiffStats;
  readonly metadata: DiffMetadata;
}

/**
 * DiffResultのファクトリ関数
 */
export const createDiffResult = (
  leftDocumentId: string,
  rightDocumentId: string,
  entries: readonly DiffEntry[],
  settings: CompareSettings
): DiffResultEntity => {
  const stats = computeStats(entries);
  
  return {
    id: generateDiffId(),
    leftDocumentId,
    rightDocumentId,
    entries,
    stats,
    metadata: {
      computedAt: new Date(),
      leftSize: 0, // 後で設定
      rightSize: 0,
      settings,
    },
  };
};

/**
 * 統計情報の計算
 */
const computeStats = (entries: readonly DiffEntry[]): DiffStats => {
  const initial: DiffStats = {
    added: 0,
    removed: 0,
    modified: 0,
    moved: 0,
    unchanged: 0,
    total: entries.length,
  };
  
  return entries.reduce((stats, entry) => ({
    ...stats,
    [entry.type]: stats[entry.type as keyof DiffStats] + 1,
  }), initial);
};

/**
 * 差分ID生成
 */
const generateDiffId = (): string =>
  `diff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * パスでフィルタリング
 */
export const filterByPath = (
  result: DiffResultEntity,
  pathPrefix: JsonPath
): DiffResultEntity => {
  const filtered = result.entries.filter(entry =>
    entry.path.toString().startsWith(pathPrefix.toString())
  );
  
  return {
    ...result,
    entries: filtered,
    stats: computeStats(filtered),
  };
};

/**
 * タイプでフィルタリング
 */
export const filterByType = (
  result: DiffResultEntity,
  types: readonly DiffEntry['type'][]
): DiffResultEntity => {
  const filtered = result.entries.filter(entry =>
    types.includes(entry.type)
  );
  
  return {
    ...result,
    entries: filtered,
    stats: computeStats(filtered),
  };
};

/**
 * 差分があるかどうか
 */
export const hasDifferences = (result: DiffResultEntity): boolean =>
  result.stats.added > 0 ||
  result.stats.removed > 0 ||
  result.stats.modified > 0 ||
  result.stats.moved > 0;
```

## 4. 値オブジェクト

### 4.1 JsonPath

```typescript
// src/react-app/domain/value-objects/JsonPath.ts

/**
 * JSONパス値オブジェクト
 * JSON構造内の位置を表す不変の値
 */
export interface JsonPath {
  readonly segments: readonly string[];
}

/**
 * ルートパス
 */
export const rootPath: JsonPath = { segments: [] };

/**
 * パスの作成
 */
export const createPath = (segments: readonly string[]): JsonPath => ({
  segments: [...segments],
});

/**
 * 文字列からパスを解析
 * 例: "$.users[0].name" -> ["users", "0", "name"]
 */
export const parsePath = (pathString: string): JsonPath => {
  if (pathString === '$' || pathString === '') {
    return rootPath;
  }
  
  // $. または $ で始まる場合は除去
  let normalized = pathString;
  if (normalized.startsWith('$.')) {
    normalized = normalized.slice(2);
  } else if (normalized.startsWith('$')) {
    normalized = normalized.slice(1);
  }
  
  // ブラケット記法とドット記法を統一的に処理
  const segments = normalized
    .replace(/\[(\d+)\]/g, '.$1')  // [0] -> .0
    .replace(/\[["']([^"']+)["']\]/g, '.$1')  // ["key"] -> .key
    .split('.')
    .filter(s => s.length > 0);
  
  return createPath(segments);
};

/**
 * パスを文字列に変換
 */
export const pathToString = (path: JsonPath): string => {
  if (path.segments.length === 0) {
    return '$';
  }
  
  return '$.' + path.segments
    .map(segment => {
      // 数字または特殊文字を含む場合はブラケット記法
      if (/^\d+$/.test(segment)) {
        return `[${segment}]`;
      }
      if (/[.\[\]"']/.test(segment)) {
        return `["${segment}"]`;
      }
      return segment;
    })
    .join('.')
    .replace(/\.\[/g, '[');  // .[0] -> [0]
};

/**
 * パスの連結
 */
export const appendToPath = (path: JsonPath, segment: string): JsonPath =>
  createPath([...path.segments, segment]);

/**
 * 親パスを取得
 */
export const getParentPath = (path: JsonPath): JsonPath | undefined => {
  if (path.segments.length === 0) {
    return undefined;
  }
  return createPath(path.segments.slice(0, -1));
};

/**
 * パスの比較
 */
export const pathEquals = (a: JsonPath, b: JsonPath): boolean =>
  a.segments.length === b.segments.length &&
  a.segments.every((seg, i) => seg === b.segments[i]);

/**
 * パスが別のパスの子孫かどうか
 */
export const isDescendantOf = (path: JsonPath, ancestor: JsonPath): boolean =>
  path.segments.length > ancestor.segments.length &&
  ancestor.segments.every((seg, i) => seg === path.segments[i]);

/**
 * パスの深さ
 */
export const getDepth = (path: JsonPath): number => path.segments.length;
```

### 4.2 ValidationError

```typescript
// src/react-app/domain/value-objects/ValidationError.ts

/**
 * 検証エラー値オブジェクト
 */
export interface ValidationError {
  readonly type: ValidationErrorType;
  readonly message: string;
  readonly position?: Position;
  readonly context?: string;
}

export type ValidationErrorType =
  | 'parse'       // JSON構文エラー
  | 'structure'   // 構造エラー
  | 'type'        // 型エラー
  | 'constraint'; // 制約エラー

export interface Position {
  readonly line: number;
  readonly column: number;
}

/**
 * エラー作成ヘルパー
 */
export const createParseError = (
  message: string,
  position?: Position
): ValidationError => ({
  type: 'parse',
  message,
  position,
});

export const createStructureError = (
  message: string,
  context?: string
): ValidationError => ({
  type: 'structure',
  message,
  context,
});

/**
 * エラーメッセージのフォーマット
 */
export const formatError = (error: ValidationError): string => {
  let result = `[${error.type.toUpperCase()}] ${error.message}`;
  
  if (error.position) {
    result += ` (line ${error.position.line}, column ${error.position.column})`;
  }
  
  if (error.context) {
    result += `\n  Context: ${error.context}`;
  }
  
  return result;
};

/**
 * エラーの重大度
 */
export type Severity = 'error' | 'warning' | 'info';

export const getSeverity = (error: ValidationError): Severity => {
  switch (error.type) {
    case 'parse':
      return 'error';
    case 'structure':
      return 'error';
    case 'type':
      return 'warning';
    case 'constraint':
      return 'warning';
    default:
      return 'info';
  }
};
```

## 5. ドメインサービス

### 5.1 差分計算サービス

```typescript
// src/react-app/domain/functions/differ.ts

import { JsonValue, isJsonPrimitive, isJsonArray, isJsonObject } from '../types/json';
import { DiffEntry, ChangeType, CompareSettings, defaultCompareSettings } from '../types/diff';
import { JsonPath, appendToPath, rootPath } from '../value-objects/JsonPath';

/**
 * 2つのJSON値を比較して差分を計算する純粋関数
 */
export const computeDiff = (
  left: JsonValue,
  right: JsonValue,
  settings: CompareSettings = defaultCompareSettings
): readonly DiffEntry[] => {
  return diffValues(left, right, rootPath, settings, 0);
};

/**
 * 再帰的な差分計算
 */
const diffValues = (
  left: JsonValue,
  right: JsonValue,
  path: JsonPath,
  settings: CompareSettings,
  depth: number
): readonly DiffEntry[] => {
  // 深さ制限チェック
  if (depth > settings.maxDepth) {
    return [];
  }
  
  // 除外パスチェック
  if (isExcludedPath(path, settings.excludePaths)) {
    return [];
  }
  
  // null/undefined等価性設定の適用
  const normalizedLeft = normalizeValue(left, settings);
  const normalizedRight = normalizeValue(right, settings);
  
  // 同一値の場合
  if (isEqual(normalizedLeft, normalizedRight, settings)) {
    return [createEntry('unchanged', path, left, right)];
  }
  
  // 型が異なる場合
  if (typeof normalizedLeft !== typeof normalizedRight ||
      Array.isArray(normalizedLeft) !== Array.isArray(normalizedRight)) {
    return [createEntry('modified', path, left, right)];
  }
  
  // プリミティブ値の比較
  if (isJsonPrimitive(normalizedLeft)) {
    return [createEntry('modified', path, left, right)];
  }
  
  // 配列の比較
  if (isJsonArray(normalizedLeft) && isJsonArray(normalizedRight)) {
    return diffArrays(
      normalizedLeft,
      normalizedRight as JsonValue[],
      path,
      settings,
      depth
    );
  }
  
  // オブジェクトの比較
  if (isJsonObject(normalizedLeft) && isJsonObject(normalizedRight)) {
    return diffObjects(
      normalizedLeft,
      normalizedRight as Record<string, JsonValue>,
      path,
      settings,
      depth
    );
  }
  
  return [];
};

/**
 * オブジェクトの差分計算
 */
const diffObjects = (
  left: Record<string, JsonValue>,
  right: Record<string, JsonValue>,
  path: JsonPath,
  settings: CompareSettings,
  depth: number
): readonly DiffEntry[] => {
  const allKeys = new Set([...Object.keys(left), ...Object.keys(right)]);
  const entries: DiffEntry[] = [];
  
  for (const key of allKeys) {
    const childPath = appendToPath(path, key);
    const hasLeft = key in left;
    const hasRight = key in right;
    
    if (hasLeft && !hasRight) {
      entries.push(createEntry('removed', childPath, left[key], undefined));
    } else if (!hasLeft && hasRight) {
      entries.push(createEntry('added', childPath, undefined, right[key]));
    } else {
      entries.push(...diffValues(left[key], right[key], childPath, settings, depth + 1));
    }
  }
  
  return entries;
};

/**
 * 配列の差分計算
 */
const diffArrays = (
  left: readonly JsonValue[],
  right: readonly JsonValue[],
  path: JsonPath,
  settings: CompareSettings,
  depth: number
): readonly DiffEntry[] => {
  if (settings.ignoreArrayOrder && settings.arrayKeyField) {
    return diffArraysByKey(left, right, path, settings, depth);
  }
  
  if (settings.ignoreArrayOrder) {
    return diffArraysUnordered(left, right, path, settings, depth);
  }
  
  return diffArraysOrdered(left, right, path, settings, depth);
};

/**
 * 順序付き配列の差分
 */
const diffArraysOrdered = (
  left: readonly JsonValue[],
  right: readonly JsonValue[],
  path: JsonPath,
  settings: CompareSettings,
  depth: number
): readonly DiffEntry[] => {
  const entries: DiffEntry[] = [];
  const maxLength = Math.max(left.length, right.length);
  
  for (let i = 0; i < maxLength; i++) {
    const childPath = appendToPath(path, String(i));
    
    if (i >= left.length) {
      entries.push(createEntry('added', childPath, undefined, right[i]));
    } else if (i >= right.length) {
      entries.push(createEntry('removed', childPath, left[i], undefined));
    } else {
      entries.push(...diffValues(left[i], right[i], childPath, settings, depth + 1));
    }
  }
  
  return entries;
};

/**
 * キーフィールドによる配列差分
 */
const diffArraysByKey = (
  left: readonly JsonValue[],
  right: readonly JsonValue[],
  path: JsonPath,
  settings: CompareSettings,
  depth: number
): readonly DiffEntry[] => {
  const keyField = settings.arrayKeyField!;
  const entries: DiffEntry[] = [];
  
  // キーでインデックス化
  const leftByKey = indexByKey(left, keyField);
  const rightByKey = indexByKey(right, keyField);
  
  const allKeys = new Set([...leftByKey.keys(), ...rightByKey.keys()]);
  
  for (const key of allKeys) {
    const leftItem = leftByKey.get(key);
    const rightItem = rightByKey.get(key);
    
    if (leftItem && !rightItem) {
      const childPath = appendToPath(path, String(leftItem.index));
      entries.push(createEntry('removed', childPath, leftItem.value, undefined));
    } else if (!leftItem && rightItem) {
      const childPath = appendToPath(path, String(rightItem.index));
      entries.push(createEntry('added', childPath, undefined, rightItem.value));
    } else if (leftItem && rightItem) {
      const childPath = appendToPath(path, String(rightItem.index));
      
      // 位置が変わった場合
      if (leftItem.index !== rightItem.index) {
        entries.push({
          type: 'moved',
          path: childPath,
          leftValue: leftItem.value,
          rightValue: rightItem.value,
          leftIndex: leftItem.index,
          rightIndex: rightItem.index,
        });
      }
      
      // 値の差分
      entries.push(...diffValues(
        leftItem.value,
        rightItem.value,
        childPath,
        settings,
        depth + 1
      ));
    }
  }
  
  return entries;
};

/**
 * 順序無視の配列差分
 */
const diffArraysUnordered = (
  left: readonly JsonValue[],
  right: readonly JsonValue[],
  path: JsonPath,
  settings: CompareSettings,
  _depth: number
): readonly DiffEntry[] => {
  const entries: DiffEntry[] = [];
  const matchedRight = new Set<number>();
  
  // 左側の各要素に対してマッチを探す
  for (let i = 0; i < left.length; i++) {
    let found = false;
    for (let j = 0; j < right.length; j++) {
      if (!matchedRight.has(j) && isEqual(left[i], right[j], settings)) {
        matchedRight.add(j);
        found = true;
        break;
      }
    }
    if (!found) {
      entries.push(createEntry('removed', appendToPath(path, String(i)), left[i], undefined));
    }
  }
  
  // マッチしなかった右側の要素
  for (let j = 0; j < right.length; j++) {
    if (!matchedRight.has(j)) {
      entries.push(createEntry('added', appendToPath(path, String(j)), undefined, right[j]));
    }
  }
  
  return entries;
};

// ヘルパー関数

const createEntry = (
  type: ChangeType,
  path: JsonPath,
  leftValue?: JsonValue,
  rightValue?: JsonValue
): DiffEntry => ({
  type,
  path,
  leftValue,
  rightValue,
});

const normalizeValue = (value: JsonValue, settings: CompareSettings): JsonValue => {
  if (settings.treatNullAsUndefined && value === null) {
    return undefined as unknown as JsonValue;
  }
  return value;
};

const isEqual = (a: JsonValue, b: JsonValue, settings: CompareSettings): boolean => {
  if (a === b) return true;
  
  // 浮動小数点の許容誤差
  if (typeof a === 'number' && typeof b === 'number' && settings.floatTolerance > 0) {
    return Math.abs(a - b) <= settings.floatTolerance;
  }
  
  // 深い比較
  return JSON.stringify(a) === JSON.stringify(b);
};

const isExcludedPath = (path: JsonPath, excludePaths: readonly string[]): boolean =>
  excludePaths.some(excluded => {
    const pathStr = path.segments.join('.');
    return pathStr === excluded || pathStr.startsWith(excluded + '.');
  });

const indexByKey = (
  arr: readonly JsonValue[],
  keyField: string
): Map<string, { index: number; value: JsonValue }> => {
  const map = new Map<string, { index: number; value: JsonValue }>();
  
  arr.forEach((item, index) => {
    if (isJsonObject(item) && keyField in item) {
      const key = String(item[keyField]);
      map.set(key, { index, value: item });
    }
  });
  
  return map;
};
```

## 6. ドメインイベント

```typescript
// src/react-app/domain/events.ts

/**
 * ドメインイベント定義
 */
export type DomainEvent =
  | DocumentParsed
  | DocumentValidated
  | DiffComputed
  | DiffFiltered
  | DiffExported;

export interface DocumentParsed {
  readonly type: 'DOCUMENT_PARSED';
  readonly payload: {
    readonly documentId: string;
    readonly timestamp: Date;
  };
}

export interface DocumentValidated {
  readonly type: 'DOCUMENT_VALIDATED';
  readonly payload: {
    readonly documentId: string;
    readonly isValid: boolean;
    readonly errors: readonly string[];
  };
}

export interface DiffComputed {
  readonly type: 'DIFF_COMPUTED';
  readonly payload: {
    readonly diffId: string;
    readonly leftDocumentId: string;
    readonly rightDocumentId: string;
    readonly entryCount: number;
  };
}

export interface DiffFiltered {
  readonly type: 'DIFF_FILTERED';
  readonly payload: {
    readonly diffId: string;
    readonly filterCriteria: unknown;
    readonly resultCount: number;
  };
}

export interface DiffExported {
  readonly type: 'DIFF_EXPORTED';
  readonly payload: {
    readonly diffId: string;
    readonly format: string;
  };
}
```

## 7. ドメイン不変条件

```typescript
// src/react-app/domain/invariants.ts

import { JsonDocument } from './entities/JsonDocument';
import { DiffResultEntity } from './entities/DiffResult';

/**
 * ドメイン不変条件の検証
 */
export const invariants = {
  /**
   * JsonDocumentの不変条件
   */
  jsonDocument: {
    // rawからvalueが正しく導出されること
    valueMatchesRaw: (doc: JsonDocument): boolean => {
      try {
        return JSON.stringify(doc.value) === JSON.stringify(JSON.parse(doc.raw));
      } catch {
        return false;
      }
    },
    
    // サイズがrawの長さと一致すること
    sizeMatchesRaw: (doc: JsonDocument): boolean =>
      doc.size === doc.raw.length,
  },
  
  /**
   * DiffResultの不変条件
   */
  diffResult: {
    // 統計情報がエントリ数と一致すること
    statsMatchEntries: (result: DiffResultEntity): boolean => {
      const { stats, entries } = result;
      const computed = {
        added: entries.filter(e => e.type === 'added').length,
        removed: entries.filter(e => e.type === 'removed').length,
        modified: entries.filter(e => e.type === 'modified').length,
        moved: entries.filter(e => e.type === 'moved').length,
        unchanged: entries.filter(e => e.type === 'unchanged').length,
      };
      
      return stats.added === computed.added &&
             stats.removed === computed.removed &&
             stats.modified === computed.modified &&
             stats.moved === computed.moved &&
             stats.unchanged === computed.unchanged;
    },
  },
};
```

