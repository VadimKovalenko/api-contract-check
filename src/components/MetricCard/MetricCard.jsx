import { defaultTone } from './constants';
import { useMeterStyle } from './hooks';
import './styles.css';

export function MetricCard({ icon, label, value, tone = defaultTone, meter }) {
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
