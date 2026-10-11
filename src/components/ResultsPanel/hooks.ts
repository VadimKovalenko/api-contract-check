import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import type { CheckResult } from '../../types';

export function useValidationErrorItems(result: CheckResult | null) {
  return useMemo(
    () => (result?.validationErrors ?? []).map((item) => `${item.path} ${item.message ?? item.keyword}`),
    [result],
  );
}

export function useCoverageStyle(result: CheckResult | null): CSSProperties {
  return useMemo(() => ({ width: `${result?.coveragePercent ?? 0}%` }), [result]);
}
