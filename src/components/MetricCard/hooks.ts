import type { CSSProperties } from 'react';

export function useMeterStyle(meter?: number): CSSProperties | undefined {
  return meter === undefined
    ? undefined
    : ({ '--meter-degrees': `${Math.max(0, Math.min(100, meter)) * 3.6}deg` } as CSSProperties);
}
