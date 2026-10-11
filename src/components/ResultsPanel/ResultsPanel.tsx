import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { oneDarkTheme } from '@codemirror/theme-one-dark';
import { tags } from '@lezer/highlight';
import { AlertTriangle, Server } from 'lucide-react';
import { ListBlock } from '../ListBlock';
import { resultLists } from './constants';
import { useCoverageStyle, useValidationErrorItems } from './hooks';
import type { CheckResult } from '../../types';
import { colors } from '../../colors';
import './styles.css';

interface ResultsPanelProps {
  error: string;
  result: CheckResult | null;
}

const jsonHighlightStyle = HighlightStyle.define([
  { tag: tags.propertyName, class: 'cm-json-key' },
  { tag: tags.string, class: 'cm-json-string' },
  { tag: tags.number, class: 'cm-json-number' },
  { tag: [tags.bool, tags.null], class: 'cm-json-literal' },
  { tag: [tags.punctuation, tags.separator, tags.squareBracket, tags.brace], class: 'cm-json-punctuation' },
]);

const jsonPreviewTheme = EditorView.theme({
  '&': {
    maxHeight: '360px',
    overflow: 'hidden',
    color: colors.textPreview,
    backgroundColor: colors.previewBackground,
    border: `1px solid ${colors.borderSubtle}`,
    borderRadius: '8px',
    fontSize: '0.82rem',
  },
  '.cm-scroller': {
    maxHeight: '360px',
    overflow: 'auto',
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
    lineHeight: '1.45',
  },
  '.cm-content': {
    padding: '14px',
  },
  '.cm-gutters': {
    color: colors.textMutedStrong,
    backgroundColor: colors.surfaceMuted,
    borderRight: `1px solid ${colors.borderSubtle}`,
  },
  '.cm-activeLine, .cm-activeLineGutter': {
    backgroundColor: colors.transparent,
  },
});

const jsonPreviewExtensions = [
  json(),
  oneDarkTheme,
  syntaxHighlighting(jsonHighlightStyle),
  jsonPreviewTheme,
  EditorState.readOnly.of(true),
  EditorView.editable.of(false),
];

export function ResultsPanel({ error, result }: ResultsPanelProps) {
  const validationErrorItems = useValidationErrorItems(result);
  const coverageStyle = useCoverageStyle(result);
  const responsePreview = result ? JSON.stringify(result.responsePreview, null, 2) : '';

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
            <CodeMirror
              aria-label="Response preview JSON"
              basicSetup={{ foldGutter: false, lineNumbers: false }}
              className="json-preview-editor"
              extensions={jsonPreviewExtensions}
              theme="none"
              value={responsePreview}
            />
          </div>
        </div>
      )}
    </section>
  );
}
