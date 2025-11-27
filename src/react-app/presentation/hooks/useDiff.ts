import { useReducer, useCallback } from 'react';
import { appReducer, initialState } from '../../application/state/reducer';
import type { CompareSettings } from '../../domain/types/diff';
import { compareJson } from '../../application/use-cases/compareJson';
import { formatJson } from '../../domain/functions/formatter';

/**
 * Custom hook for managing diff state and operations
 */
export const useDiff = (initialSettings?: CompareSettings) => {
  const [state, dispatch] = useReducer(appReducer, {
    ...initialState,
    settings: initialSettings ?? initialState.settings,
  });

  const setLeftInput = useCallback((input: string) => {
    dispatch({ type: 'SET_LEFT_INPUT', payload: input });
  }, []);

  const setRightInput = useCallback((input: string) => {
    dispatch({ type: 'SET_RIGHT_INPUT', payload: input });
  }, []);

  const setSettings = useCallback((settings: Partial<CompareSettings>) => {
    dispatch({ type: 'SET_SETTINGS', payload: settings });
  }, []);

  const compare = useCallback(() => {
    dispatch({ type: 'COMPARE_START' });

    const result = compareJson({
      leftJson: state.leftInput,
      rightJson: state.rightInput,
      settings: state.settings,
    });

    if (result.ok) {
      dispatch({
        type: 'COMPARE_SUCCESS',
        payload: {
          leftDocument: result.value.leftDocument,
          rightDocument: result.value.rightDocument,
          diffResult: result.value.diffResult,
        },
      });
    } else {
      dispatch({ type: 'COMPARE_ERROR', payload: result.error });
    }
  }, [state.leftInput, state.rightInput, state.settings]);

  const clear = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const formatLeftInput = useCallback(() => {
    const result = formatJson(state.leftInput, state.settings.formatSettings);
    if (result.ok) {
      dispatch({ type: 'SET_LEFT_INPUT', payload: result.value });
    } else {
      // Show error or do nothing if format fails
      alert(`Format failed: ${result.error.getMessage()}`);
    }
  }, [state.leftInput, state.settings.formatSettings]);

  const formatRightInput = useCallback(() => {
    const result = formatJson(state.rightInput, state.settings.formatSettings);
    if (result.ok) {
      dispatch({ type: 'SET_RIGHT_INPUT', payload: result.value });
    } else {
      // Show error or do nothing if format fails
      alert(`Format failed: ${result.error.getMessage()}`);
    }
  }, [state.rightInput, state.settings.formatSettings]);

  return {
    state,
    actions: {
      setLeftInput,
      setRightInput,
      setSettings,
      compare,
      clear,
      clearError,
      formatLeftInput,
      formatRightInput,
    },
    settings: state.settings,
    setSettings,
  };
};
