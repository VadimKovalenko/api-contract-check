import type { ReactNode } from 'react';
import { defaultTone } from './constants';
import { useMeterStyle } from './hooks';
import type { Tone } from '../../types';
import './styles.css';

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  tone?: Tone;
  meter?: number;
  meterVariant?: 'ring';
}

export function MetricCard({ icon, label, value, tone = defaultTone, meter, meterVariant }: MetricCardProps) {
  const meterStyle = useMeterStyle(meter);
  const showRingMeter = meterVariant === 'ring';
  const displayValue = showRingMeter && value !== '--' && meter !== undefined ? `${meter}%` : value;

  return (
    <article className={`metric-card ${tone}`}>
      {showRingMeter ? (
        <div className="metric-ring" style={meterStyle} aria-label={`${label}: ${value}`}>
          <span>{displayValue}</span>
        </div>
      ) : (
        <div className="metric-icon">{icon}</div>
      )}
      <div>
        <span>{label}</span>
        <strong>{displayValue}</strong>
      </div>
    </article>
  );
}
