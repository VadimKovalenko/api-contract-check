import type { CSSProperties } from 'react';

export function useMeterStyle(meter?: number): CSSProperties | undefined {
  return meter === undefined ? undefined : { width: `${meter}%` };
}
