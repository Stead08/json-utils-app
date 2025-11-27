/**
 * Type of validation error
 */
export type ValidationErrorType =
  | 'parse'
  | 'empty'
  | 'invalid-json'
  | 'invalid-structure'
  | 'too-large';

/**
 * Value object representing a validation error
 */
export class ValidationError {
  constructor(
    private readonly type: ValidationErrorType,
    private readonly message: string,
    private readonly details?: unknown
  ) {}

  /**
   * Creates a parse error
   */
  static parse(message: string, details?: unknown): ValidationError {
    return new ValidationError('parse', message, details);
  }

  /**
   * Creates an empty input error
   */
  static empty(): ValidationError {
    return new ValidationError('empty', 'Input is empty');
  }

  /**
   * Creates an invalid JSON error
   */
  static invalidJson(message: string): ValidationError {
    return new ValidationError('invalid-json', message);
  }

  /**
   * Creates an invalid structure error
   */
  static invalidStructure(message: string): ValidationError {
    return new ValidationError('invalid-structure', message);
  }

  /**
   * Creates a too large error
   */
  static tooLarge(maxSize: number, actualSize: number): ValidationError {
    return new ValidationError(
      'too-large',
      `Input is too large. Maximum size is ${maxSize} bytes, but got ${actualSize} bytes`,
      { maxSize, actualSize }
    );
  }

  /**
   * Returns the error type
   */
  getType(): ValidationErrorType {
    return this.type;
  }

  /**
   * Returns the error message
   */
  getMessage(): string {
    return this.message;
  }

  /**
   * Returns the error details
   */
  getDetails(): unknown {
    return this.details;
  }

  /**
   * Returns a plain object representation
   */
  toObject(): { type: ValidationErrorType; message: string; details?: unknown } {
    const result: { type: ValidationErrorType; message: string; details?: unknown } = {
      type: this.type,
      message: this.message,
    };
    if (this.details !== undefined) {
      result.details = this.details;
    }
    return result;
  }

  /**
   * Returns string representation
   */
  toString(): string {
    return `ValidationError [${this.type}]: ${this.message}`;
  }
}
