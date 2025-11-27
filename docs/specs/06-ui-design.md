# JSON Diff ツール UI設計書

## 1. デザインシステム

### 1.1 カラーパレット

```css
/* Light Theme - Dracula inspired */
:root {
  /* Background */
  --bg-primary: #1e1f29;
  --bg-secondary: #282a36;
  --bg-tertiary: #343746;
  
  /* Foreground */
  --fg-primary: #f8f8f2;
  --fg-secondary: #6272a4;
  --fg-muted: #44475a;
  
  /* Accent Colors */
  --accent-cyan: #8be9fd;
  --accent-green: #50fa7b;
  --accent-orange: #ffb86c;
  --accent-pink: #ff79c6;
  --accent-purple: #bd93f9;
  --accent-red: #ff5555;
  --accent-yellow: #f1fa8c;
  
  /* Diff Colors */
  --diff-added-bg: rgba(80, 250, 123, 0.15);
  --diff-added-border: #50fa7b;
  --diff-removed-bg: rgba(255, 85, 85, 0.15);
  --diff-removed-border: #ff5555;
  --diff-modified-bg: rgba(255, 184, 108, 0.15);
  --diff-modified-border: #ffb86c;
  
  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  
  /* Typography */
  --font-sans: 'JetBrains Mono', 'Fira Code', monospace;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.25rem;
  --font-size-xl: 1.5rem;
  
  /* Borders */
  --border-radius-sm: 4px;
  --border-radius-md: 8px;
  --border-radius-lg: 12px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
}
```

### 1.2 タイポグラフィ

```css
/* Typography Scale */
.text-xs { font-size: var(--font-size-xs); line-height: 1.4; }
.text-sm { font-size: var(--font-size-sm); line-height: 1.5; }
.text-md { font-size: var(--font-size-md); line-height: 1.6; }
.text-lg { font-size: var(--font-size-lg); line-height: 1.5; }
.text-xl { font-size: var(--font-size-xl); line-height: 1.4; }

/* Font Weights */
.font-normal { font-weight: 400; }
.font-medium { font-weight: 500; }
.font-bold { font-weight: 700; }
```

## 2. レイアウト構造

### 2.1 メインレイアウト

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Header                                          │
│  ┌──────────┐  ┌───────────────────────────────┐  ┌─────────────────────┐   │
│  │   Logo   │  │      View Mode Tabs           │  │  Settings / Theme   │   │
│  └──────────┘  └───────────────────────────────┘  └─────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│                             Toolbar                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │  Import  │ │  Export  │ │  Share   │ │  Clear   │ │  Compare Button  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
├────────────────────────────────┬────────────────────────────────────────────┤
│         Left Panel             │             Right Panel                     │
│  ┌──────────────────────────┐  │  ┌──────────────────────────────────────┐  │
│  │      JSON Editor         │  │  │          JSON Editor                 │  │
│  │                          │  │  │                                      │  │
│  │  (Syntax Highlighting)   │  │  │      (Syntax Highlighting)           │  │
│  │                          │  │  │                                      │  │
│  │  (Line Numbers)          │  │  │      (Line Numbers)                  │  │
│  │                          │  │  │                                      │  │
│  │  (Error Indicators)      │  │  │      (Error Indicators)              │  │
│  │                          │  │  │                                      │  │
│  └──────────────────────────┘  │  └──────────────────────────────────────┘  │
├────────────────────────────────┴────────────────────────────────────────────┤
│                           Diff Result Panel                                  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Summary: +5 added  -3 removed  ~2 modified                           │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                        │  │
│  │  Diff Viewer (Side by Side / Unified / Inline)                        │  │
│  │                                                                        │  │
│  │  ├── $.users[0].name        "Alice"  →  "Alice Smith"                 │  │
│  │  ├── $.users[1]             + { "id": 2, "name": "Bob" }              │  │
│  │  └── $.config.debug         true  →  false                            │  │
│  │                                                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│                              Footer                                          │
│  ┌──────────────────┐  ┌──────────────────────────────────────────────┐    │
│  │  Navigation      │  │  Diff Stats / Keyboard Shortcuts             │    │
│  │  ← Prev │ Next → │  │                                              │    │
│  └──────────────────┘  └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 レスポンシブ対応

```css
/* Desktop (default) */
.main-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto 1fr auto;
  height: 100vh;
}

/* Tablet */
@media (max-width: 1024px) {
  .main-container {
    grid-template-columns: 1fr;
  }
  
  .editor-panel {
    min-height: 300px;
  }
}

/* Mobile */
@media (max-width: 640px) {
  .toolbar {
    flex-wrap: wrap;
  }
  
  .editor-panel {
    min-height: 200px;
  }
}
```

## 3. コンポーネント設計

### 3.1 Atoms

#### Button

```tsx
// src/react-app/presentation/components/atoms/Button.tsx

interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}

const variantStyles = {
  primary: 'bg-accent-purple text-white hover:bg-accent-pink',
  secondary: 'bg-bg-tertiary text-fg-primary hover:bg-fg-muted',
  ghost: 'bg-transparent text-fg-primary hover:bg-bg-tertiary',
  danger: 'bg-accent-red text-white hover:opacity-80',
};
```

#### TextArea (Code Editor)

```tsx
// src/react-app/presentation/components/atoms/CodeEditor.tsx

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  lineNumbers?: boolean;
  syntaxHighlight?: boolean;
  readOnly?: boolean;
}
```

### 3.2 Molecules

#### JsonEditor

```tsx
// src/react-app/presentation/components/molecules/JsonEditor.tsx

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  error?: ValidationError;
  onFormat?: () => void;
  onClear?: () => void;
  onPaste?: () => void;
  onLoadFile?: (file: File) => void;
}

/**
 * JsonEditor - JSON入力用の複合コンポーネント
 * 
 * 機能:
 * - シンタックスハイライト
 * - 行番号表示
 * - エラー表示
 * - フォーマットボタン
 * - ファイルドロップ
 */
```

#### DiffLine

```tsx
// src/react-app/presentation/components/molecules/DiffLine.tsx

interface DiffLineProps {
  entry: DiffEntry;
  expanded: boolean;
  onToggle: () => void;
  onNavigate: (path: JsonPath) => void;
}

/**
 * DiffLine - 単一の差分行を表示
 * 
 * 表示内容:
 * - 変更タイプアイコン (+, -, ~)
 * - JSONパス
 * - 変更前/後の値
 * - 展開/折りたたみトグル
 */
```

### 3.3 Organisms

#### DiffViewer

```tsx
// src/react-app/presentation/components/organisms/DiffViewer.tsx

interface DiffViewerProps {
  diffResult: DiffResultEntity;
  viewMode: 'side-by-side' | 'unified' | 'inline';
  filter: DiffFilter;
  onNavigate: (path: JsonPath) => void;
  highlightedPath?: JsonPath;
}

/**
 * DiffViewer - 差分結果を表示するメインコンポーネント
 * 
 * 機能:
 * - 3つの表示モード切替
 * - 仮想スクロール（大規模データ対応）
 * - パスによるナビゲーション
 * - フィルタリング
 */
```

#### SettingsPanel

```tsx
// src/react-app/presentation/components/organisms/SettingsPanel.tsx

interface SettingsPanelProps {
  settings: CompareSettings;
  onChange: (settings: Partial<CompareSettings>) => void;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * SettingsPanel - 比較設定パネル
 * 
 * 設定項目:
 * - 配列順序無視
 * - 配列キーフィールド
 * - 浮動小数点許容誤差
 * - 除外パス
 * - 最大深度
 */
```

## 4. アニメーション

```css
/* Transitions */
.fade-in {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.slide-up {
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(10px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}

/* Diff highlight animation */
.diff-highlight {
  animation: diffPulse 0.5s ease-out;
}

@keyframes diffPulse {
  0% { background-color: var(--accent-yellow); }
  100% { background-color: transparent; }
}

/* Staggered list animation */
.diff-list > * {
  animation: slideUp 0.3s ease-out backwards;
}

.diff-list > *:nth-child(1) { animation-delay: 0ms; }
.diff-list > *:nth-child(2) { animation-delay: 50ms; }
.diff-list > *:nth-child(3) { animation-delay: 100ms; }
/* ... */
```

## 5. キーボードショートカット

| ショートカット | 機能 |
|--------------|------|
| `Cmd/Ctrl + Enter` | 比較実行 |
| `Cmd/Ctrl + Shift + F` | フォーマット |
| `Cmd/Ctrl + L` | 左パネルにフォーカス |
| `Cmd/Ctrl + R` | 右パネルにフォーカス |
| `Cmd/Ctrl + D` | 差分パネルにフォーカス |
| `J` / `K` | 次の差分 / 前の差分 |
| `Cmd/Ctrl + S` | 共有リンク生成 |
| `Cmd/Ctrl + E` | エクスポート |
| `Escape` | パネルを閉じる |

## 6. アクセシビリティ

```tsx
// ARIA labels and roles
<main role="main" aria-label="JSON Diff Tool">
  <section aria-label="Left JSON Input">
    <textarea 
      aria-label="Left JSON content"
      aria-describedby="left-error"
      aria-invalid={!!leftError}
    />
    {leftError && (
      <div id="left-error" role="alert" aria-live="polite">
        {leftError.message}
      </div>
    )}
  </section>
  
  <section aria-label="Diff Results" role="region">
    <ul role="list" aria-label="List of changes">
      {entries.map(entry => (
        <li 
          key={entry.path}
          role="listitem"
          aria-label={`${entry.type}: ${entry.path}`}
        />
      ))}
    </ul>
  </section>
</main>
```

## 7. 状態表示

### 7.1 ローディング状態

```tsx
const LoadingState = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full" />
    <span className="ml-3 text-fg-secondary">Comparing...</span>
  </div>
);
```

### 7.2 エラー状態

```tsx
const ErrorState = ({ error }: { error: AppError }) => (
  <div className="bg-diff-removed-bg border border-diff-removed-border rounded-md p-4">
    <div className="flex items-center">
      <AlertIcon className="w-5 h-5 text-accent-red" />
      <span className="ml-2 font-medium text-accent-red">
        {error.type === 'LEFT_PARSE_ERROR' ? 'Left JSON Error' : 'Right JSON Error'}
      </span>
    </div>
    <p className="mt-2 text-sm text-fg-secondary">{error.error.message}</p>
    {error.error.position && (
      <p className="mt-1 text-xs text-fg-muted">
        Line {error.error.position.line}, Column {error.error.position.column}
      </p>
    )}
  </div>
);
```

### 7.3 空状態

```tsx
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center p-12 text-center">
    <FileIcon className="w-16 h-16 text-fg-muted mb-4" />
    <h3 className="text-lg font-medium text-fg-primary">No JSON to compare</h3>
    <p className="mt-2 text-fg-secondary">
      Paste or drop JSON files in the panels above
    </p>
  </div>
);
```

