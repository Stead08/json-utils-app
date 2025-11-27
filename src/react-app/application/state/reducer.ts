import type { AppState, AppAction } from './types';
import { DEFAULT_COMPARE_SETTINGS } from '../../domain/types/diff';

/**
 * Initial application state
 */
export const initialState: AppState = {
  leftInput: '',
  rightInput: '',
  leftDocument: null,
  rightDocument: null,
  diffResult: null,
  settings: DEFAULT_COMPARE_SETTINGS,
  isComparing: false,
  error: null,
};

/**
 * Application state reducer
 */
export const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_LEFT_INPUT':
      return {
        ...state,
        leftInput: action.payload,
        error: null,
      };

    case 'SET_RIGHT_INPUT':
      return {
        ...state,
        rightInput: action.payload,
        error: null,
      };

    case 'SET_SETTINGS':
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload,
        },
      };

    case 'COMPARE_START':
      return {
        ...state,
        isComparing: true,
        error: null,
      };

    case 'COMPARE_SUCCESS':
      return {
        ...state,
        leftDocument: action.payload.leftDocument,
        rightDocument: action.payload.rightDocument,
        diffResult: action.payload.diffResult,
        isComparing: false,
        error: null,
      };

    case 'COMPARE_ERROR':
      return {
        ...state,
        isComparing: false,
        error: action.payload,
      };

    case 'CLEAR':
      return {
        ...initialState,
        settings: state.settings,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
};
