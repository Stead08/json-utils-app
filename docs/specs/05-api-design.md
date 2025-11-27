# JSON Diff ツール API設計書

## 1. フロントエンドAPI（ポートインターフェース）

### 1.1 ストレージポート

```typescript
// src/react-app/application/ports/StoragePort.ts

import { Result } from '../../domain/types/result';

export interface StorageError {
  readonly type: 'storage';
  readonly message: string;
  readonly code: 'NOT_FOUND' | 'QUOTA_EXCEEDED' | 'PERMISSION_DENIED' | 'UNKNOWN';
}

/**
 * ストレージ抽象インターフェース
 * LocalStorage、SessionStorage、IndexedDB等の実装から独立
 */
export interface StoragePort {
  /**
   * データの保存
   */
  save<T>(key: string, data: T): Promise<Result<void, StorageError>>;
  
  /**
   * データの読み込み
   */
  load<T>(key: string): Promise<Result<T | null, StorageError>>;
  
  /**
   * データの削除
   */
  remove(key: string): Promise<Result<void, StorageError>>;
  
  /**
   * 全キーの取得
   */
  keys(): Promise<Result<readonly string[], StorageError>>;
  
  /**
   * プレフィックスによる複数取得
   */
  loadByPrefix<T>(prefix: string): Promise<Result<readonly { key: string; value: T }[], StorageError>>;
}
```

### 1.2 HTTPポート

```typescript
// src/react-app/application/ports/HttpPort.ts

import { Result } from '../../domain/types/result';
import { JsonValue } from '../../domain/types/json';

export interface HttpError {
  readonly type: 'http';
  readonly message: string;
  readonly statusCode?: number;
  readonly code: 'NETWORK' | 'TIMEOUT' | 'PARSE' | 'SERVER' | 'UNKNOWN';
}

export interface HttpOptions {
  readonly timeout?: number;
  readonly headers?: Record<string, string>;
}

/**
 * HTTP通信抽象インターフェース
 */
export interface HttpPort {
  /**
   * JSONデータのGET
   */
  getJson<T extends JsonValue>(
    url: string,
    options?: HttpOptions
  ): Promise<Result<T, HttpError>>;
  
  /**
   * JSONデータのPOST
   */
  postJson<T extends JsonValue, R extends JsonValue>(
    url: string,
    data: T,
    options?: HttpOptions
  ): Promise<Result<R, HttpError>>;
}
```

### 1.3 エクスポートポート

```typescript
// src/react-app/application/ports/ExportPort.ts

import { Result } from '../../domain/types/result';

export interface ExportError {
  readonly type: 'export';
  readonly message: string;
}

export type ExportFormat = 'json' | 'markdown' | 'html' | 'patch';

export interface ExportOptions {
  readonly format: ExportFormat;
  readonly includeUnchanged?: boolean;
  readonly includeMetadata?: boolean;
}

/**
 * エクスポート抽象インターフェース
 */
export interface ExportPort {
  /**
   * ファイルとしてダウンロード
   */
  downloadAsFile(
    content: string,
    filename: string,
    mimeType: string
  ): Result<void, ExportError>;
  
  /**
   * クリップボードにコピー
   */
  copyToClipboard(content: string): Promise<Result<void, ExportError>>;
}
```

## 2. Cloudflare Worker API

### 2.1 エンドポイント設計

```
Base URL: /api

┌──────────────────────────────────────────────────────────────────────┐
│ Endpoint              │ Method │ Description                        │
├──────────────────────────────────────────────────────────────────────┤
│ /api/share            │ POST   │ 差分結果を共有用に保存              │
│ /api/share/:id        │ GET    │ 共有された差分結果を取得            │
│ /api/fetch-json       │ POST   │ URLからJSONをフェッチ               │
│ /api/health           │ GET    │ ヘルスチェック                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.2 API仕様

#### POST /api/share

差分結果を共有用に保存し、共有IDを返す。

**Request:**
```typescript
interface ShareRequest {
  leftJson: string;
  rightJson: string;
  settings: CompareSettings;
  expiresIn?: number; // 有効期限（秒）デフォルト: 7日
}
```

**Response:**
```typescript
interface ShareResponse {
  id: string;
  url: string;
  expiresAt: string; // ISO 8601
}
```

**エラーレスポンス:**
```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

#### GET /api/share/:id

共有された差分データを取得。

**Response:**
```typescript
interface SharedData {
  id: string;
  leftJson: string;
  rightJson: string;
  settings: CompareSettings;
  createdAt: string;
  expiresAt: string;
}
```

#### POST /api/fetch-json

外部URLからJSONをフェッチ（CORS回避）。

**Request:**
```typescript
interface FetchRequest {
  url: string;
  headers?: Record<string, string>;
}
```

**Response:**
```typescript
interface FetchResponse {
  data: JsonValue;
  contentType: string;
  size: number;
}
```

### 2.3 Worker実装

```typescript
// src/worker/index.ts

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { shareRoutes } from './routes/share';
import { fetchRoutes } from './routes/fetch-json';

const app = new Hono<{ Bindings: Env }>();

// CORS設定
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

// ヘルスチェック
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ルートマウント
app.route('/api/share', shareRoutes);
app.route('/api/fetch-json', fetchRoutes);

export default app;
```

```typescript
// src/worker/routes/share.ts

import { Hono } from 'hono';
import { z } from 'zod';

const shareRoutes = new Hono<{ Bindings: Env }>();

const ShareRequestSchema = z.object({
  leftJson: z.string().max(5 * 1024 * 1024), // 5MB制限
  rightJson: z.string().max(5 * 1024 * 1024),
  settings: z.object({
    ignoreArrayOrder: z.boolean().optional(),
    arrayKeyField: z.string().optional(),
    floatTolerance: z.number().optional(),
    treatNullAsUndefined: z.boolean().optional(),
    excludePaths: z.array(z.string()).optional(),
    maxDepth: z.number().optional(),
  }).optional(),
  expiresIn: z.number().min(60).max(7 * 24 * 60 * 60).optional(),
});

shareRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const result = ShareRequestSchema.safeParse(body);
  
  if (!result.success) {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: result.error.message } }, 400);
  }
  
  const { leftJson, rightJson, settings, expiresIn = 7 * 24 * 60 * 60 } = result.data;
  const id = generateShareId();
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  
  // KVに保存
  await c.env.JSON_DIFF_KV.put(
    `share:${id}`,
    JSON.stringify({ leftJson, rightJson, settings, createdAt: new Date().toISOString() }),
    { expirationTtl: expiresIn }
  );
  
  return c.json({
    id,
    url: `${new URL(c.req.url).origin}/share/${id}`,
    expiresAt: expiresAt.toISOString(),
  });
});

shareRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const data = await c.env.JSON_DIFF_KV.get(`share:${id}`);
  
  if (!data) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Share not found or expired' } }, 404);
  }
  
  return c.json({ id, ...JSON.parse(data) });
});

const generateShareId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

export { shareRoutes };
```

## 3. ユースケース層API

### 3.1 CompareJsonUseCase

```typescript
// src/react-app/application/use-cases/CompareJsonUseCase.ts

import { Result, ok, err, flatMap } from '../../domain/types/result';
import { DiffResultEntity, createDiffResult } from '../../domain/entities/DiffResult';
import { createJsonDocument, JsonDocument } from '../../domain/entities/JsonDocument';
import { computeDiff } from '../../domain/functions/differ';
import { CompareSettings, defaultCompareSettings } from '../../domain/types/diff';
import { ValidationError } from '../../domain/value-objects/ValidationError';

export interface CompareJsonInput {
  readonly leftJson: string;
  readonly rightJson: string;
  readonly settings?: Partial<CompareSettings>;
}

export type CompareJsonError = 
  | { type: 'LEFT_PARSE_ERROR'; error: ValidationError }
  | { type: 'RIGHT_PARSE_ERROR'; error: ValidationError }
  | { type: 'DIFF_ERROR'; message: string };

export interface CompareJsonOutput {
  readonly leftDocument: JsonDocument;
  readonly rightDocument: JsonDocument;
  readonly diffResult: DiffResultEntity;
}

/**
 * JSON比較ユースケース
 */
export const compareJson = (
  input: CompareJsonInput
): Result<CompareJsonOutput, CompareJsonError> => {
  // 左側JSONのパース
  const leftResult = createJsonDocument(input.leftJson);
  if (!leftResult.ok) {
    return err({ type: 'LEFT_PARSE_ERROR', error: leftResult.error });
  }
  
  // 右側JSONのパース
  const rightResult = createJsonDocument(input.rightJson);
  if (!rightResult.ok) {
    return err({ type: 'RIGHT_PARSE_ERROR', error: rightResult.error });
  }
  
  const leftDoc = leftResult.value;
  const rightDoc = rightResult.value;
  const settings: CompareSettings = {
    ...defaultCompareSettings,
    ...input.settings,
  };
  
  // 差分計算
  const entries = computeDiff(leftDoc.value, rightDoc.value, settings);
  const diffResult = createDiffResult(leftDoc.id, rightDoc.id, entries, settings);
  
  return ok({
    leftDocument: leftDoc,
    rightDocument: rightDoc,
    diffResult,
  });
};
```

### 3.2 ExportDiffUseCase

```typescript
// src/react-app/application/use-cases/ExportDiffUseCase.ts

import { Result, ok, err } from '../../domain/types/result';
import { DiffResultEntity } from '../../domain/entities/DiffResult';
import { formatAsMarkdown, formatAsJsonPatch } from '../../domain/functions/formatter';
import { ExportPort, ExportFormat, ExportError } from '../ports/ExportPort';

export interface ExportDiffInput {
  readonly diffResult: DiffResultEntity;
  readonly format: ExportFormat;
  readonly destination: 'download' | 'clipboard';
  readonly filename?: string;
}

/**
 * 差分エクスポートユースケース
 * 依存性注入によりExportPortの実装を受け取る
 */
export const createExportDiffUseCase = (exportPort: ExportPort) => {
  return async (input: ExportDiffInput): Promise<Result<void, ExportError>> => {
    const { diffResult, format, destination, filename } = input;
    
    // フォーマット変換
    const content = formatDiff(diffResult, format);
    const mimeType = getMimeType(format);
    const defaultFilename = `diff-${diffResult.id}.${getExtension(format)}`;
    
    // 出力
    if (destination === 'clipboard') {
      return exportPort.copyToClipboard(content);
    }
    
    return ok(exportPort.downloadAsFile(
      content,
      filename ?? defaultFilename,
      mimeType
    ));
  };
};

const formatDiff = (result: DiffResultEntity, format: ExportFormat): string => {
  switch (format) {
    case 'json':
      return JSON.stringify(result, null, 2);
    case 'markdown':
      return formatAsMarkdown(result);
    case 'patch':
      return JSON.stringify(formatAsJsonPatch(result), null, 2);
    case 'html':
      return generateHtmlReport(result);
    default:
      return JSON.stringify(result);
  }
};

const getMimeType = (format: ExportFormat): string => {
  const types: Record<ExportFormat, string> = {
    json: 'application/json',
    markdown: 'text/markdown',
    html: 'text/html',
    patch: 'application/json-patch+json',
  };
  return types[format];
};

const getExtension = (format: ExportFormat): string => {
  const extensions: Record<ExportFormat, string> = {
    json: 'json',
    markdown: 'md',
    html: 'html',
    patch: 'json',
  };
  return extensions[format];
};

const generateHtmlReport = (result: DiffResultEntity): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>JSON Diff Report</title>
  <style>
    body { font-family: system-ui; padding: 2rem; }
    .added { background: #e6ffed; }
    .removed { background: #ffeef0; }
    .modified { background: #fff5b1; }
  </style>
</head>
<body>
  <h1>JSON Diff Report</h1>
  <h2>Summary</h2>
  <ul>
    <li>Added: ${result.stats.added}</li>
    <li>Removed: ${result.stats.removed}</li>
    <li>Modified: ${result.stats.modified}</li>
  </ul>
  <h2>Changes</h2>
  <pre>${JSON.stringify(result.entries, null, 2)}</pre>
</body>
</html>
`;
```

## 4. Reactフック API

```typescript
// src/react-app/presentation/hooks/useDiff.ts

import { useState, useCallback, useMemo } from 'react';
import { compareJson, CompareJsonOutput, CompareJsonError } from '../../application/use-cases/CompareJsonUseCase';
import { CompareSettings } from '../../domain/types/diff';
import { Result } from '../../domain/types/result';

export interface UseDiffState {
  readonly leftInput: string;
  readonly rightInput: string;
  readonly result: CompareJsonOutput | null;
  readonly error: CompareJsonError | null;
  readonly isComparing: boolean;
}

export interface UseDiffActions {
  readonly setLeftInput: (value: string) => void;
  readonly setRightInput: (value: string) => void;
  readonly compare: () => void;
  readonly clear: () => void;
}

export const useDiff = (initialSettings?: Partial<CompareSettings>) => {
  const [state, setState] = useState<UseDiffState>({
    leftInput: '',
    rightInput: '',
    result: null,
    error: null,
    isComparing: false,
  });
  
  const [settings, setSettings] = useState<Partial<CompareSettings>>(
    initialSettings ?? {}
  );
  
  const setLeftInput = useCallback((value: string) => {
    setState(prev => ({ ...prev, leftInput: value, result: null, error: null }));
  }, []);
  
  const setRightInput = useCallback((value: string) => {
    setState(prev => ({ ...prev, rightInput: value, result: null, error: null }));
  }, []);
  
  const compare = useCallback(() => {
    setState(prev => ({ ...prev, isComparing: true }));
    
    const result = compareJson({
      leftJson: state.leftInput,
      rightJson: state.rightInput,
      settings,
    });
    
    if (result.ok) {
      setState(prev => ({
        ...prev,
        result: result.value,
        error: null,
        isComparing: false,
      }));
    } else {
      setState(prev => ({
        ...prev,
        result: null,
        error: result.error,
        isComparing: false,
      }));
    }
  }, [state.leftInput, state.rightInput, settings]);
  
  const clear = useCallback(() => {
    setState({
      leftInput: '',
      rightInput: '',
      result: null,
      error: null,
      isComparing: false,
    });
  }, []);
  
  const actions: UseDiffActions = useMemo(() => ({
    setLeftInput,
    setRightInput,
    compare,
    clear,
  }), [setLeftInput, setRightInput, compare, clear]);
  
  return {
    state,
    actions,
    settings,
    setSettings,
  };
};
```

