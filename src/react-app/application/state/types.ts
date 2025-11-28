import type { JsonDocument } from "../../domain/entities/JsonDocument";
import type { DiffResult } from "../../domain/entities/DiffResult";
import type { CompareSettings } from "../../domain/types/diff";
import type { ValidationError } from "../../domain/value-objects/ValidationError";

/**
 * Application state
 */
export interface AppState {
	readonly leftInput: string;
	readonly rightInput: string;
	readonly leftDocument: JsonDocument | null;
	readonly rightDocument: JsonDocument | null;
	readonly diffResult: DiffResult | null;
	readonly settings: CompareSettings;
	readonly isComparing: boolean;
	readonly error: AppError | null;
}

/**
 * Application error
 */
export type AppError =
	| { type: "LEFT_PARSE_ERROR"; error: ValidationError }
	| { type: "RIGHT_PARSE_ERROR"; error: ValidationError }
	| { type: "COMPARE_ERROR"; message: string };

/**
 * Action types
 */
export type AppAction =
	| { type: "SET_LEFT_INPUT"; payload: string }
	| { type: "SET_RIGHT_INPUT"; payload: string }
	| { type: "SET_SETTINGS"; payload: Partial<CompareSettings> }
	| { type: "COMPARE_START" }
	| {
			type: "COMPARE_SUCCESS";
			payload: {
				leftDocument: JsonDocument;
				rightDocument: JsonDocument;
				diffResult: DiffResult;
			};
	  }
	| { type: "COMPARE_ERROR"; payload: AppError }
	| { type: "CLEAR" }
	| { type: "CLEAR_ERROR" };
