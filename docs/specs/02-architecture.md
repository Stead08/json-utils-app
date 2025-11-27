# JSON Diff ツール アーキテクチャ設計書

## 1. アーキテクチャ概要

### 1.1 設計原則

本システムは以下の3つの設計原則を基盤として構築する。

#### ドメイン駆動設計 (DDD)
- ビジネスロジックをドメイン層に集約
- ユビキタス言語の確立
- 境界づけられたコンテキストの明確化

#### 関数型プログラミング (FP)
- 純粋関数による副作用の分離
- イミュータブルなデータ構造
- 関数合成による処理パイプライン

#### 依存性逆転の法則 (DIP)
- 抽象に依存し、具象に依存しない
- インターフェースによる層間の分離
- プラグイン可能なアダプター設計

### 1.2 レイヤードアーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │   React     │ │   Hooks     │ │   View Components       ││
│  │ Components  │ │             │ │   (Presentational)      ││
│  └─────────────┘ └─────────────┘ └─────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│                    Application Layer                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │  Use Cases  │ │   App       │ │   Command/Query         ││
│  │ (Services)  │ │  State      │ │   Handlers              ││
│  └─────────────┘ └─────────────┘ └─────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│                      Domain Layer                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │   Entities  │ │Value Objects│ │   Domain Services       ││
│  │             │ │             │ │                         ││
│  └─────────────┘ └─────────────┘ └─────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Domain Functions (Pure)                     ││
│  │   Parser │ Differ │ Formatter │ Validator               ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│                  Infrastructure Layer                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │  Storage    │ │   HTTP      │ │   Worker                ││
│  │  Adapters   │ │  Adapters   │ │   Adapters              ││
│  └─────────────┘ └─────────────┘ └─────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## 2. ディレクトリ構造

```
src/
├── react-app/
│   ├── main.tsx                    # エントリーポイント
│   │
│   ├── domain/                     # ドメイン層
│   │   ├── types/                  # 型定義
│   │   │   ├── json.ts             # JSON関連型
│   │   │   ├── diff.ts             # Diff関連型
│   │   │   └── result.ts           # Result型（エラーハンドリング）
│   │   │
│   │   ├── entities/               # エンティティ
│   │   │   ├── JsonDocument.ts     # JSONドキュメント
│   │   │   └── DiffResult.ts       # 差分結果
│   │   │
│   │   ├── value-objects/          # 値オブジェクト
│   │   │   ├── JsonPath.ts         # JSONパス
│   │   │   ├── DiffEntry.ts        # 差分エントリ
│   │   │   └── ValidationError.ts  # 検証エラー
│   │   │
│   │   └── functions/              # ドメイン関数（純粋関数）
│   │       ├── parser.ts           # JSONパーサー
│   │       ├── differ.ts           # 差分計算
│   │       ├── formatter.ts        # フォーマッター
│   │       ├── validator.ts        # バリデーター
│   │       └── transformer.ts      # 変換関数
│   │
│   ├── application/                # アプリケーション層
│   │   ├── ports/                  # ポート（インターフェース）
│   │   │   ├── StoragePort.ts      # ストレージ抽象
│   │   │   ├── HttpPort.ts         # HTTP抽象
│   │   │   └── ExportPort.ts       # エクスポート抽象
│   │   │
│   │   ├── use-cases/              # ユースケース
│   │   │   ├── CompareJsonUseCase.ts
│   │   │   ├── FormatJsonUseCase.ts
│   │   │   ├── ExportDiffUseCase.ts
│   │   │   └── ShareDiffUseCase.ts
│   │   │
│   │   └── state/                  # アプリケーション状態
│   │       ├── types.ts            # 状態型定義
│   │       ├── actions.ts          # アクション定義
│   │       └── reducer.ts          # リデューサー（純粋関数）
│   │
│   ├── infrastructure/             # インフラ層
│   │   ├── adapters/               # アダプター実装
│   │   │   ├── LocalStorageAdapter.ts
│   │   │   ├── FetchAdapter.ts
│   │   │   └── WorkerAdapter.ts
│   │   │
│   │   └── workers/                # Web Workers
│   │       └── diff.worker.ts      # 差分計算ワーカー
│   │
│   ├── presentation/               # プレゼンテーション層
│   │   ├── components/             # UIコンポーネント
│   │   │   ├── atoms/              # 原子コンポーネント
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── TextArea.tsx
│   │   │   │   └── Icon.tsx
│   │   │   │
│   │   │   ├── molecules/          # 分子コンポーネント
│   │   │   │   ├── JsonEditor.tsx
│   │   │   │   ├── DiffLine.tsx
│   │   │   │   └── Toolbar.tsx
│   │   │   │
│   │   │   ├── organisms/          # 有機体コンポーネント
│   │   │   │   ├── DiffViewer.tsx
│   │   │   │   ├── InputPanel.tsx
│   │   │   │   └── SettingsPanel.tsx
│   │   │   │
│   │   │   └── templates/          # テンプレート
│   │   │       └── MainLayout.tsx
│   │   │
│   │   ├── hooks/                  # カスタムフック
│   │   │   ├── useDiff.ts
│   │   │   ├── useJsonValidation.ts
│   │   │   └── useKeyboardShortcuts.ts
│   │   │
│   │   └── styles/                 # スタイル
│   │       ├── theme.ts
│   │       └── global.css
│   │
│   └── shared/                     # 共有ユーティリティ
│       ├── constants.ts
│       └── utils.ts
│
└── worker/                         # Cloudflare Worker
    ├── index.ts                    # エントリーポイント
    ├── routes/                     # APIルート
    │   ├── share.ts                # 共有API
    │   └── fetch-json.ts           # JSONフェッチAPI
    └── services/                   # Workerサービス
        └── storage.ts              # KVストレージ
```

## 3. データフロー

### 3.1 比較処理フロー

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  User    │───▶│  Component   │───▶│   Use Case   │───▶│   Domain     │
│  Input   │    │  (React)     │    │  (Service)   │    │  Functions   │
└──────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                       │                   │                    │
                       ▼                   ▼                    ▼
                ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
                │   Hooks      │    │   Reducer    │    │   Pure       │
                │   (State)    │◀───│   (Action)   │◀───│   Result     │
                └──────────────┘    └──────────────┘    └──────────────┘
```

### 3.2 処理パイプライン（関数合成）

```typescript
// 関数合成による処理パイプライン
const processJson = pipe(
  parseJson,           // string -> Result<JsonValue, ParseError>
  validateStructure,   // JsonValue -> Result<ValidatedJson, ValidationError>
  normalizeData,       // ValidatedJson -> NormalizedJson
);

const computeDiff = pipe(
  preparePair,         // (JsonA, JsonB) -> ComparablePair
  detectChanges,       // ComparablePair -> RawDiffList
  categorizeChanges,   // RawDiffList -> CategorizedDiff
  enrichWithPaths,     // CategorizedDiff -> EnrichedDiff
);
```

## 4. 依存性逆転の実装

### 4.1 ポートとアダプターパターン

```typescript
// Port（抽象インターフェース）- ドメイン/アプリケーション層で定義
interface StoragePort {
  save(key: string, data: unknown): Promise<Result<void, StorageError>>;
  load(key: string): Promise<Result<unknown, StorageError>>;
  remove(key: string): Promise<Result<void, StorageError>>;
}

// Adapter（具象実装）- インフラ層で定義
class LocalStorageAdapter implements StoragePort {
  save(key: string, data: unknown): Promise<Result<void, StorageError>> {
    // localStorage実装
  }
  // ...
}

// 依存性注入
const createUseCase = (storage: StoragePort) => ({
  saveHistory: (diff: DiffResult) => storage.save(`history_${Date.now()}`, diff),
  // ...
});
```

### 4.2 依存グラフ

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Domain Layer (依存なし - 純粋なビジネスロジック)                │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  Types │ Entities │ Value Objects │ Pure Functions      │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              ▲                                  │
│                              │                                  │
│   Application Layer (Domainにのみ依存)                          │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  Ports (Interfaces) │ Use Cases │ State Management      │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              ▲                                  │
│                              │                                  │
│   Infrastructure Layer (Application/Domainに依存)               │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  Adapters │ External Services │ Web Workers              │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              ▲                                  │
│                              │                                  │
│   Presentation Layer (全層に依存可能)                           │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  React Components │ Hooks │ Styles                       │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 5. 状態管理設計

### 5.1 アプリケーション状態

```typescript
interface AppState {
  // 入力状態
  readonly leftInput: InputState;
  readonly rightInput: InputState;
  
  // 差分状態
  readonly diffResult: DiffState;
  
  // UI状態
  readonly viewMode: ViewMode;
  readonly settings: DiffSettings;
  readonly theme: Theme;
  
  // 履歴
  readonly history: readonly HistoryEntry[];
}

// イミュータブルな状態更新
type Action = 
  | { type: 'SET_LEFT_INPUT'; payload: string }
  | { type: 'SET_RIGHT_INPUT'; payload: string }
  | { type: 'SET_DIFF_RESULT'; payload: DiffResult }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<DiffSettings> }
  // ...

// 純粋関数としてのリデューサー
const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_LEFT_INPUT':
      return { ...state, leftInput: updateInput(state.leftInput, action.payload) };
    // ...
  }
};
```

### 5.2 状態フロー

```
User Action ──▶ Action Creator ──▶ Reducer ──▶ New State ──▶ React Re-render
                     │                              ▲
                     │                              │
                     └──▶ Side Effects ─────────────┘
                          (via useEffect/Adapter)
```

## 6. エラーハンドリング

### 6.1 Result型によるエラー伝播

```typescript
// 関数型エラーハンドリング
type Result<T, E> = 
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

// ヘルパー関数
const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

// モナド的な操作
const map = <T, U, E>(result: Result<T, E>, fn: (t: T) => U): Result<U, E> =>
  result.ok ? ok(fn(result.value)) : result;

const flatMap = <T, U, E>(result: Result<T, E>, fn: (t: T) => Result<U, E>): Result<U, E> =>
  result.ok ? fn(result.value) : result;
```

### 6.2 エラー型階層

```typescript
type AppError =
  | ParseError      // JSON解析エラー
  | ValidationError // 構造検証エラー
  | DiffError       // 差分計算エラー
  | StorageError    // ストレージエラー
  | NetworkError;   // ネットワークエラー
```

## 7. パフォーマンス最適化

### 7.1 Web Worker活用

```
Main Thread                          Worker Thread
┌────────────────┐                   ┌────────────────┐
│  UI Rendering  │◀──── Message ────▶│  Diff Engine   │
│  User Input    │                   │  (Pure Logic)  │
└────────────────┘                   └────────────────┘
```

### 7.2 メモ化戦略

```typescript
// React.memoによるコンポーネントメモ化
const DiffLine = React.memo(({ line }: DiffLineProps) => (
  // ...
));

// useMemoによる計算結果メモ化
const formattedDiff = useMemo(() => formatDiff(rawDiff), [rawDiff]);

// 関数レベルでのメモ化
const memoizedDiffer = memoize(computeDiff);
```

### 7.3 仮想スクロール

大規模JSONの表示には仮想スクロールを適用し、DOMノード数を最小化。

