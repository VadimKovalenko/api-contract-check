import { AlertTriangle, Server } from 'lucide-react';
import { ListBlock } from '../ListBlock';
import { resultLists } from './constants';
import { useCoverageStyle, useValidationErrorItems } from './hooks';
import './styles.css';

export function ResultsPanel({ error, result }) {
  const validationErrorItems = useValidationErrorItems(result);
  const coverageStyle = useCoverageStyle(result);

  return (
    <section className="panel results-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Results</p>
          <h2>Contract evidence</h2>
        </div>
        {result && <span className={`state-pill ${result.valid ? 'good' : 'bad'}`}>{result.valid ? 'Schema pass' : 'Schema fail'}</span>}
      </div>

      {error && (
        <div className="alert"><AlertTriangle size={18} /> {error}</div>
      )}

      {!result && !error && (
        <div className="empty-state">
          <Server size={32} />
          <p>Run a request to see schema validity, documented-field coverage, missing fields, and a JSON response preview.</p>
        </div>
      )}

      {result && (
        <div className="result-stack">
          <div className="coverage-band">
            <div>
              <span>Documented fields present</span>
              <strong>{result.presentFieldCount}/{result.documentedFieldCount}</strong>
            </div>
            <div className="meter"><span style={coverageStyle} /></div>
          </div>

          {resultLists.map(({ emptyText, key, title, tone }) => (
            <ListBlock emptyText={emptyText} items={result[key]} key={key} title={title} tone={tone} />
          ))}
          <ListBlock
            title="Validation errors"
            items={validationErrorItems}
            emptyText="No schema validation errors."
            tone="missing"
          />

          <div className="preview-block">
            <h3>Response preview</h3>
            <pre>{JSON.stringify(result.responsePreview, null, 2)}</pre>
          </div>
        </div>
      )}
    </section>
  );
}
