/**
 * Value object representing a path in a JSON structure
 */
export class JsonPath {
  constructor(private readonly segments: readonly string[]) {}

  /**
   * Creates a JsonPath from an array of segments
   */
  static fromSegments(segments: readonly string[]): JsonPath {
    return new JsonPath(segments);
  }

  /**
   * Creates a JsonPath from a string representation
   * Example: "$.foo.bar[0]" -> ["foo", "bar", "0"]
   */
  static fromString(path: string): JsonPath {
    if (path === '$' || path === '') {
      return new JsonPath([]);
    }

    // Remove leading $. if present
    const normalized = path.startsWith('$.') ? path.slice(2) : path;

    // Split by dots and brackets
    const segments = normalized
      .split(/[\.\[\]]/)
      .filter(s => s.length > 0)
      .map(s => s.replace(/['"]/g, '')); // Remove quotes

    return new JsonPath(segments);
  }

  /**
   * Creates a root path
   */
  static root(): JsonPath {
    return new JsonPath([]);
  }

  /**
   * Returns the segments of this path
   */
  getSegments(): readonly string[] {
    return this.segments;
  }

  /**
   * Creates a new path by appending a segment
   */
  append(segment: string | number): JsonPath {
    return new JsonPath([...this.segments, String(segment)]);
  }

  /**
   * Returns the parent path (all segments except the last)
   */
  parent(): JsonPath | null {
    if (this.segments.length === 0) {
      return null;
    }
    return new JsonPath(this.segments.slice(0, -1));
  }

  /**
   * Returns the last segment of this path
   */
  lastSegment(): string | null {
    if (this.segments.length === 0) {
      return null;
    }
    return this.segments[this.segments.length - 1];
  }

  /**
   * Checks if this path is a root path
   */
  isRoot(): boolean {
    return this.segments.length === 0;
  }

  /**
   * Returns string representation in dot notation
   * Example: ["foo", "bar", "0"] -> "$.foo.bar[0]"
   */
  toString(): string {
    if (this.segments.length === 0) {
      return '$';
    }

    return '$.' + this.segments
      .map((segment, index) => {
        // If segment is a number, use bracket notation
        if (/^\d+$/.test(segment)) {
          return `[${segment}]`;
        }
        // If it's the first segment, no dot
        if (index === 0) {
          return segment;
        }
        // If previous segment was a number, no dot
        if (index > 0 && /^\d+$/.test(this.segments[index - 1])) {
          return `.${segment}`;
        }
        return segment;
      })
      .join('.');
  }

  /**
   * Checks equality with another JsonPath
   */
  equals(other: JsonPath): boolean {
    if (this.segments.length !== other.segments.length) {
      return false;
    }
    return this.segments.every((segment, index) => segment === other.segments[index]);
  }
}
