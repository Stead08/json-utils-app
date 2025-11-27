import type { DiffEntry, DiffResult, ExportFormat, FormatSettings } from '../types/diff';
import type { JsonValue } from '../types/json';
import type { Result } from '../types/result';
import { ok, err } from '../types/result';
import { ValidationError } from '../value-objects/ValidationError';

/**
 * Formats diff entries for export
 */
export const formatDiff = (
  diffResult: DiffResult,
  format: ExportFormat
): string => {
  switch (format) {
    case 'json':
      return formatAsJson(diffResult);
    case 'markdown':
      return formatAsMarkdown(diffResult);
    case 'html':
      return formatAsHtml(diffResult);
    case 'json-patch':
      return formatAsJsonPatch(diffResult.entries);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
};

/**
 * Formats diff as JSON
 */
const formatAsJson = (diffResult: DiffResult): string => {
  return JSON.stringify(diffResult, null, 2);
};

/**
 * Formats diff as Markdown
 */
const formatAsMarkdown = (diffResult: DiffResult): string => {
  const lines: string[] = [];

  lines.push('# JSON Diff Report');
  lines.push('');
  lines.push('## Statistics');
  lines.push('');
  lines.push(`- **Added**: ${diffResult.stats.added}`);
  lines.push(`- **Removed**: ${diffResult.stats.removed}`);
  lines.push(`- **Modified**: ${diffResult.stats.modified}`);
  lines.push(`- **Unchanged**: ${diffResult.stats.unchanged}`);
  lines.push(`- **Total**: ${diffResult.stats.total}`);
  lines.push('');

  lines.push('## Changes');
  lines.push('');

  for (const entry of diffResult.entries) {
    if (entry.type === 'unchanged') continue;

    const pathStr = formatPath(entry.path);

    switch (entry.type) {
      case 'added':
        lines.push(`### ➕ Added: \`${pathStr}\``);
        lines.push('');
        lines.push('```json');
        lines.push(JSON.stringify(entry.rightValue, null, 2));
        lines.push('```');
        lines.push('');
        break;

      case 'removed':
        lines.push(`### ➖ Removed: \`${pathStr}\``);
        lines.push('');
        lines.push('```json');
        lines.push(JSON.stringify(entry.leftValue, null, 2));
        lines.push('```');
        lines.push('');
        break;

      case 'modified':
        lines.push(`### ✏️ Modified: \`${pathStr}\``);
        lines.push('');
        lines.push('**Before:**');
        lines.push('```json');
        lines.push(JSON.stringify(entry.leftValue, null, 2));
        lines.push('```');
        lines.push('');
        lines.push('**After:**');
        lines.push('```json');
        lines.push(JSON.stringify(entry.rightValue, null, 2));
        lines.push('```');
        lines.push('');
        break;
    }
  }

  return lines.join('\n');
};

/**
 * Formats diff as HTML
 */
const formatAsHtml = (diffResult: DiffResult): string => {
  const lines: string[] = [];

  lines.push('<!DOCTYPE html>');
  lines.push('<html lang="en">');
  lines.push('<head>');
  lines.push('  <meta charset="UTF-8">');
  lines.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
  lines.push('  <title>JSON Diff Report</title>');
  lines.push('  <style>');
  lines.push('    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }');
  lines.push('    h1 { color: #333; }');
  lines.push('    .stats { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }');
  lines.push('    .stat { margin: 5px 0; }');
  lines.push('    .change { margin: 20px 0; padding: 15px; border-radius: 5px; }');
  lines.push('    .added { background: #e6ffe6; border-left: 4px solid #50fa7b; }');
  lines.push('    .removed { background: #ffe6e6; border-left: 4px solid #ff5555; }');
  lines.push('    .modified { background: #fff3e6; border-left: 4px solid #ffb86c; }');
  lines.push('    .path { font-family: monospace; font-weight: bold; }');
  lines.push('    pre { background: #282a36; color: #f8f8f2; padding: 10px; border-radius: 3px; overflow-x: auto; }');
  lines.push('  </style>');
  lines.push('</head>');
  lines.push('<body>');
  lines.push('  <h1>JSON Diff Report</h1>');
  lines.push('  <div class="stats">');
  lines.push('    <h2>Statistics</h2>');
  lines.push(`    <div class="stat">Added: <strong>${diffResult.stats.added}</strong></div>`);
  lines.push(`    <div class="stat">Removed: <strong>${diffResult.stats.removed}</strong></div>`);
  lines.push(`    <div class="stat">Modified: <strong>${diffResult.stats.modified}</strong></div>`);
  lines.push(`    <div class="stat">Unchanged: <strong>${diffResult.stats.unchanged}</strong></div>`);
  lines.push(`    <div class="stat">Total: <strong>${diffResult.stats.total}</strong></div>`);
  lines.push('  </div>');
  lines.push('  <h2>Changes</h2>');

  for (const entry of diffResult.entries) {
    if (entry.type === 'unchanged') continue;

    const pathStr = escapeHtml(formatPath(entry.path));

    switch (entry.type) {
      case 'added':
        lines.push(`  <div class="change added">`);
        lines.push(`    <div class="path">➕ Added: ${pathStr}</div>`);
        lines.push('    <pre>' + escapeHtml(JSON.stringify(entry.rightValue, null, 2)) + '</pre>');
        lines.push('  </div>');
        break;

      case 'removed':
        lines.push(`  <div class="change removed">`);
        lines.push(`    <div class="path">➖ Removed: ${pathStr}</div>`);
        lines.push('    <pre>' + escapeHtml(JSON.stringify(entry.leftValue, null, 2)) + '</pre>');
        lines.push('  </div>');
        break;

      case 'modified':
        lines.push(`  <div class="change modified">`);
        lines.push(`    <div class="path">✏️ Modified: ${pathStr}</div>`);
        lines.push('    <strong>Before:</strong>');
        lines.push('    <pre>' + escapeHtml(JSON.stringify(entry.leftValue, null, 2)) + '</pre>');
        lines.push('    <strong>After:</strong>');
        lines.push('    <pre>' + escapeHtml(JSON.stringify(entry.rightValue, null, 2)) + '</pre>');
        lines.push('  </div>');
        break;
    }
  }

  lines.push('</body>');
  lines.push('</html>');

  return lines.join('\n');
};

/**
 * Formats diff as JSON Patch (RFC 6902)
 */
const formatAsJsonPatch = (entries: readonly DiffEntry[]): string => {
  const operations: Array<{
    op: 'add' | 'remove' | 'replace';
    path: string;
    value?: JsonValue;
  }> = [];

  for (const entry of entries) {
    if (entry.type === 'unchanged') continue;

    const path = '/' + entry.path.join('/');

    switch (entry.type) {
      case 'added':
        operations.push({
          op: 'add',
          path,
          value: entry.rightValue,
        });
        break;

      case 'removed':
        operations.push({
          op: 'remove',
          path,
        });
        break;

      case 'modified':
        operations.push({
          op: 'replace',
          path,
          value: entry.rightValue,
        });
        break;
    }
  }

  return JSON.stringify(operations, null, 2);
};

/**
 * Formats a path array as a string
 */
const formatPath = (path: readonly string[]): string => {
  if (path.length === 0) return '$';

  return '$.' + path
    .map((segment, index) => {
      if (/^\d+$/.test(segment)) {
        return `[${segment}]`;
      }
      if (index === 0) {
        return segment;
      }
      if (index > 0 && /^\d+$/.test(path[index - 1])) {
        return `.${segment}`;
      }
      return segment;
    })
    .join('.');
};

/**
 * Escapes HTML special characters
 */
const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, char => map[char]);
};

/**
 * Formats JSON string with specified settings
 *
 * @param input - JSON string to format
 * @param settings - Format settings
 * @returns Formatted JSON string or error
 */
export const formatJson = (
  input: string,
  settings: FormatSettings
): Result<string, ValidationError> => {
  try {
    // 1. Parse JSON
    const parsed = JSON.parse(input);

    // 2. Sort keys if requested
    const sorted = settings.sortKeys ? sortObjectKeys(parsed) : parsed;

    // 3. Format with specified indent
    const space = settings.indent === '\t' ? '\t' : settings.indent;
    const formatted = JSON.stringify(sorted, null, space);

    return ok(formatted);
  } catch (error) {
    return err(
      ValidationError.parse(
        error instanceof Error ? error.message : 'Unknown parse error'
      )
    );
  }
};

/**
 * Recursively sorts object keys in alphabetical order
 *
 * @param value - Value to sort (recursively processes objects and arrays)
 * @returns Value with sorted keys
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
