# 08. Format-Before-Compare機能 設計書

## 概要

JSON比較を実行する前に、入力されたJSONを自動的にフォーマット（整形）する機能を追加します。これにより、フォーマットの違いを排除し、意味的な差分のみに焦点を当てた比較が可能になります。

## 目的

### ビジネス価値
- **ノイズの削減**: インデントや改行の違いによる不要な差分を排除
- **可読性の向上**: 整形されたJSONにより、差分の理解が容易に
- **一貫性の確保**: 異なるソースから取得したJSONでも統一されたフォーマットで比較

### ユースケース
1. 異なるエディタで編集されたJSON（インデントの違い）を比較
2. minifyされたJSONと整形されたJSONを比較
3. キーの順序を統一して比較（オプション）

## 機能要件

### FR-08-01: JSON自動フォーマット
- 比較実行前に左右のJSONを自動的にフォーマット
- フォーマットはオプトイン（デフォルトはOFF）
- パースエラーが発生した場合はフォーマットをスキップ

### FR-08-02: インデント設定
- インデントサイズを選択可能（2, 4スペース、タブ）
- デフォルトは2スペース

### FR-08-03: キーソート
- オブジェクトのキーをアルファベット順にソート（オプション）
- デフォルトはOFF（元の順序を維持）

### FR-08-04: フォーマット前後の表示
- フォーマット実行時に通知を表示
- フォーマット前の内容は破棄される（元に戻す機能は不要）

## 非機能要件

### NFR-08-01: パフォーマンス
- フォーマット処理は1MB以下のJSONに対して100ms以内
- 大きなJSONでは処理時間の警告を表示

### NFR-08-02: エラーハンドリング
- パースエラー時は元の文字列をそのまま使用
- エラーメッセージは明確に表示

### NFR-08-03: 後方互換性
- 既存のCompareSettingsと互換性を保つ
- フォーマット機能はデフォルトOFFで影響なし

## アーキテクチャ設計

### レイヤー分離

```
Presentation Layer (UI Controls)
    ↓
Application Layer (CompareJsonUseCase)
    ↓
Domain Layer (formatJson pure function)
```

### データフロー

```
User Input (leftJson, rightJson)
    ↓
[formatBeforeCompare = true?]
    ↓ YES
formatJson(leftJson, formatSettings) → formattedLeft
formatJson(rightJson, formatSettings) → formattedRight
    ↓
JsonDocument.fromString(formattedLeft)
JsonDocument.fromString(formattedRight)
    ↓
computeDiff(left, right, compareSettings)
```

## ドメイン設計

### 型定義

```typescript
// src/react-app/domain/types/diff.ts

/**
 * フォーマット設定
 */
export interface FormatSettings {
  readonly indent: 2 | 4 | '\t';
  readonly sortKeys: boolean;
}

/**
 * デフォルトフォーマット設定
 */
export const DEFAULT_FORMAT_SETTINGS: FormatSettings = {
  indent: 2,
  sortKeys: false,
};

/**
 * 比較設定（拡張）
 */
export interface CompareSettings {
  readonly ignoreArrayOrder: boolean;
  readonly keyField?: string;
  readonly floatTolerance?: number;
  readonly treatNullAsUndefined: boolean;
  // 新規追加
  readonly formatBeforeCompare: boolean;
  readonly formatSettings: FormatSettings;
}

/**
 * デフォルト比較設定（更新）
 */
export const DEFAULT_COMPARE_SETTINGS: CompareSettings = {
  ignoreArrayOrder: false,
  treatNullAsUndefined: false,
  formatBeforeCompare: false,
  formatSettings: DEFAULT_FORMAT_SETTINGS,
};
```

### 純粋関数: formatJson

```typescript
// src/react-app/domain/functions/formatter.ts

import type { Result } from '../types/result';
import { ok, err } from '../types/result';
import type { FormatSettings } from '../types/diff';
import type { ValidationError } from '../value-objects/ValidationError';

/**
 * JSONをフォーマットする純粋関数
 *
 * @param input - フォーマット対象のJSON文字列
 * @param settings - フォーマット設定
 * @returns フォーマット済みJSON文字列、またはエラー
 */
export const formatJson = (
  input: string,
  settings: FormatSettings
): Result<string, ValidationError> => {
  try {
    // 1. パース
    const parsed = JSON.parse(input);

    // 2. キーソート（オプション）
    const sorted = settings.sortKeys ? sortObjectKeys(parsed) : parsed;

    // 3. 整形
    const space = settings.indent === '\t' ? '\t' : settings.indent;
    const formatted = JSON.stringify(sorted, null, space);

    return ok(formatted);
  } catch (error) {
    return err({
      type: 'PARSE_ERROR',
      message: error instanceof Error ? error.message : 'Unknown parse error',
      location: { line: 0, column: 0 },
    });
  }
};

/**
 * オブジェクトのキーを再帰的にソートする純粋関数
 *
 * @param value - ソート対象の値
 * @returns キーがソートされた値
 */
const sortObjectKeys = (value: unknown): unknown => {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }

  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(value).sort();

  for (const key of keys) {
    sorted[key] = sortObjectKeys((value as Record<string, unknown>)[key]);
  }

  return sorted;
};
```

## アプリケーション層設計

### CompareJsonUseCaseの更新

```typescript
// src/react-app/application/use-cases/compareJson.ts

export const compareJson = (
  input: CompareJsonInput
): Result<CompareJsonOutput, CompareJsonError> => {
  // 1. フォーマット（オプション）
  let leftJson = input.leftJson;
  let rightJson = input.rightJson;

  if (input.settings.formatBeforeCompare) {
    const leftFormatResult = formatJson(leftJson, input.settings.formatSettings);
    if (leftFormatResult.ok) {
      leftJson = leftFormatResult.value;
    }
    // パースエラーの場合は元の文字列を使用

    const rightFormatResult = formatJson(rightJson, input.settings.formatSettings);
    if (rightFormatResult.ok) {
      rightJson = rightFormatResult.value;
    }
  }

  // 2. パース
  const leftResult = JsonDocument.fromString(leftJson, 'left');
  if (!leftResult.ok) {
    return err({ type: 'LEFT_PARSE_ERROR', error: leftResult.error });
  }

  const rightResult = JsonDocument.fromString(rightJson, 'right');
  if (!rightResult.ok) {
    return err({ type: 'RIGHT_PARSE_ERROR', error: rightResult.error });
  }

  // 3. 差分計算
  const leftDocument = leftResult.value;
  const rightDocument = rightResult.value;

  const entries = computeDiff(
    leftDocument.getData(),
    rightDocument.getData(),
    input.settings
  );

  // 4. 結果生成
  const diffResult = DiffResult.fromEntries(
    entries,
    leftDocument.getId(),
    rightDocument.getId(),
    input.settings
  );

  return ok({
    leftDocument,
    rightDocument,
    diffResult,
  });
};
```

## プレゼンテーション層設計

### UIコントロール配置

設定パネル（SettingsPanel）に以下を追加：

```
┌─ Format Before Compare ─────────────┐
│ ☐ Format before comparing           │
│                                      │
│ Indent:  [ 2 spaces ▼]              │
│ ☐ Sort object keys alphabetically   │
└──────────────────────────────────────┘
```

### コンポーネント追加

#### FormatSettings コンポーネント

```typescript
// src/react-app/presentation/components/molecules/FormatSettings.tsx

interface FormatSettingsProps {
  enabled: boolean;
  settings: FormatSettings;
  onEnabledChange: (enabled: boolean) => void;
  onSettingsChange: (settings: Partial<FormatSettings>) => void;
}

export const FormatSettingsComponent: React.FC<FormatSettingsProps> = ({
  enabled,
  settings,
  onEnabledChange,
  onSettingsChange,
}) => {
  return (
    <div className="format-settings">
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
        />
        Format before comparing
      </label>

      {enabled && (
        <>
          <label>
            Indent:
            <select
              value={settings.indent}
              onChange={(e) =>
                onSettingsChange({
                  indent: e.target.value as FormatSettings['indent']
                })
              }
            >
              <option value={2}>2 spaces</option>
              <option value={4}>4 spaces</option>
              <option value="\t">Tab</option>
            </select>
          </label>

          <label>
            <input
              type="checkbox"
              checked={settings.sortKeys}
              onChange={(e) =>
                onSettingsChange({ sortKeys: e.target.checked })
              }
            />
            Sort object keys alphabetically
          </label>
        </>
      )}
    </div>
  );
};
```

## テスト戦略

### ユニットテスト: formatJson

```typescript
// src/react-app/domain/functions/__tests__/formatter.test.ts

describe('formatJson', () => {
  it('should format minified JSON with 2 spaces', () => {
    const input = '{"name":"John","age":30}';
    const result = formatJson(input, { indent: 2, sortKeys: false });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('{\n  "name": "John",\n  "age": 30\n}');
    }
  });

  it('should sort object keys when sortKeys is true', () => {
    const input = '{"z":1,"a":2,"m":3}';
    const result = formatJson(input, { indent: 2, sortKeys: true });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain('"a"');
      const aIndex = result.value.indexOf('"a"');
      const mIndex = result.value.indexOf('"m"');
      const zIndex = result.value.indexOf('"z"');
      expect(aIndex).toBeLessThan(mIndex);
      expect(mIndex).toBeLessThan(zIndex);
    }
  });

  it('should handle nested objects', () => {
    const input = '{"outer":{"inner":{"deep":"value"}}}';
    const result = formatJson(input, { indent: 2, sortKeys: false });

    expect(result.ok).toBe(true);
  });

  it('should return error for invalid JSON', () => {
    const input = '{invalid json}';
    const result = formatJson(input, { indent: 2, sortKeys: false });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('PARSE_ERROR');
    }
  });

  it('should format with tabs when indent is \\t', () => {
    const input = '{"name":"John"}';
    const result = formatJson(input, { indent: '\t', sortKeys: false });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain('\t');
    }
  });

  it('should sort keys recursively in nested objects', () => {
    const input = '{"z":{"c":1,"a":2},"a":{"z":3,"a":4}}';
    const result = formatJson(input, { indent: 2, sortKeys: true });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const parsed = JSON.parse(result.value);
      expect(Object.keys(parsed)).toEqual(['a', 'z']);
      expect(Object.keys(parsed.a)).toEqual(['a', 'z']);
      expect(Object.keys(parsed.z)).toEqual(['a', 'c']);
    }
  });
});
```

### 統合テスト: CompareJsonUseCase

```typescript
// src/react-app/application/use-cases/__tests__/compareJson.test.ts

describe('compareJson with format', () => {
  it('should format both JSONs before comparison', () => {
    const input: CompareJsonInput = {
      leftJson: '{"name":"John","age":30}',
      rightJson: '{"age":30,"name":"John"}',
      settings: {
        ...DEFAULT_COMPARE_SETTINGS,
        formatBeforeCompare: true,
        formatSettings: {
          indent: 2,
          sortKeys: true,
        },
      },
    };

    const result = compareJson(input);

    expect(result.ok).toBe(true);
    if (result.ok) {
      // キーをソートした結果、両方とも同じになるため差分なし
      expect(result.value.diffResult.stats.modified).toBe(0);
    }
  });

  it('should use original JSON when format fails', () => {
    const input: CompareJsonInput = {
      leftJson: '{invalid}',
      rightJson: '{"valid": true}',
      settings: {
        ...DEFAULT_COMPARE_SETTINGS,
        formatBeforeCompare: true,
      },
    };

    const result = compareJson(input);

    // フォーマットに失敗しても、パースエラーとして適切に処理される
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('LEFT_PARSE_ERROR');
    }
  });
});
```

### E2Eテスト

```typescript
// e2e/format-before-compare.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Format Before Compare', () => {
  test('should format JSON when option is enabled', async ({ page }) => {
    await page.goto('/');

    // Enable format option
    await page.click('text=Settings');
    await page.check('text=Format before comparing');
    await page.selectOption('select[name="indent"]', '2');

    // Input minified JSON
    await page.fill('[data-testid="left-input"]', '{"name":"John","age":30}');
    await page.fill('[data-testid="right-input"]', '{"age":30,"name":"John"}');

    // Enable sort keys
    await page.check('text=Sort object keys');

    // Compare
    await page.click('text=Compare');

    // Should show no differences (after sorting keys)
    await expect(page.locator('[data-testid="diff-stats"]')).toContainText('0 changes');
  });
});
```

## 実装順序

1. **ドメイン層**
   - [ ] FormatSettings型定義追加（diff.ts）
   - [ ] formatJson関数実装（formatter.ts）
   - [ ] sortObjectKeys関数実装（formatter.ts）
   - [ ] ユニットテスト作成

2. **アプリケーション層**
   - [ ] CompareSettings拡張
   - [ ] CompareJsonUseCase更新
   - [ ] 統合テスト更新

3. **プレゼンテーション層**
   - [ ] FormatSettings コンポーネント作成
   - [ ] SettingsPanel更新（統合）
   - [ ] useDiffフック更新（不要、設定を渡すだけ）
   - [ ] E2Eテスト作成

4. **ドキュメント**
   - [ ] CLAUDE.md更新
   - [ ] README更新（機能追加の記載）

## セキュリティ考慮事項

### SEC-08-01: JSONサイズ制限
- 大きすぎるJSON（10MB以上）はフォーマットをスキップ
- DoS攻撃の防止

### SEC-08-02: パフォーマンス警告
- 処理時間が長い場合（1秒以上）は警告を表示
- ユーザー体験の維持

## パフォーマンス考慮事項

### PERF-08-01: 再帰処理の最適化
- sortObjectKeys関数は再帰的だが、JSON構造の深さは一般的に浅い
- 最大深度チェックは不要（JSONパース自体に制限がある）

### PERF-08-02: メモ化
- 同じ入力に対するフォーマット結果をメモ化（将来的な最適化）
- 現時点では不要（フォーマットは1回のみ実行）

## 今後の拡張可能性

### 将来的な機能追加
1. **カスタムフォーマッター**: ユーザー定義のフォーマットルール
2. **フォーマットプレビュー**: フォーマット結果をプレビュー表示
3. **フォーマット履歴**: フォーマット前後の比較
4. **自動検出**: インデントサイズの自動検出

## 参考資料

- [JSON.stringify() - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)
- [Prettier - Code Formatter](https://prettier.io/)
- [JSON Schema Validator](https://json-schema.org/)

## 更新履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|----------|
| 2025-11-27 | 1.0.0 | 初版作成 |
