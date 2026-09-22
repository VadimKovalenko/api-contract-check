import { useMemo } from 'react';

export function useValidationErrorItems(result) {
  return useMemo(
    () => (result?.validationErrors || []).map((item) => `${item.path} ${item.message}`),
    [result],
  );
}

export function useCoverageStyle(result) {
  return useMemo(() => ({ width: `${result?.coveragePercent ?? 0}%` }), [result]);
}
