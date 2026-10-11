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
}

export function MetricCard({ icon, label, value, tone = defaultTone, meter }: MetricCardProps) {
  const meterStyle = useMeterStyle(meter);

  return (
    <article className={`metric-card ${tone}`}>
      <div className="metric-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      {meterStyle && <div className="mini-meter"><span style={meterStyle} /></div>}
    </article>
  );
}
