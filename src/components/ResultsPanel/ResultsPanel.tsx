import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { useEffect, useRef, useState } from 'react';
import { json } from '@codemirror/lang-json';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { AlertTriangle, Check, ChevronDown, Copy, FileJson, Server } from 'lucide-react';
import { highlightEditorField } from '../editorHighlight';
import { ListBlock } from '../ListBlock';
import { withUserAccessibilityThereStyle } from '../withUserAccessibilityThereStyle';
import { resultLists } from './constants';
import { useCoverageStyle, useValidationErrorItems } from './hooks';
import type { CheckResult, FieldHighlight, FieldHighlightTarget } from '../../types';
import './styles.css';

interface ResultsPanelProps {
  error: string;
  onHighlightField: (path: string, target: FieldHighlightTarget) => void;
  responseHighlight: FieldHighlight | null;
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
    color: 'var(--color-text-preview)',
    backgroundColor: 'var(--color-preview-bg)',
    border: '1px solid var(--color-border-subtle)',
    borderRadius: '8px',
    fontSize: '0.82rem',
  },
  '.cm-scroller': {
    maxHeight: '360px',
    overflow: 'auto',
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
    lineHeight: '1.45',
    scrollbarColor: 'var(--color-preview-scrollbar-thumb) var(--color-preview-scrollbar-track)',
  },
  '.cm-scroller::-webkit-scrollbar': {
    width: '12px',
    height: '12px',
  },
  '.cm-scroller::-webkit-scrollbar-track': {
    backgroundColor: 'var(--color-preview-scrollbar-track)',
  },
  '.cm-scroller::-webkit-scrollbar-thumb': {
    backgroundColor: 'var(--color-preview-scrollbar-thumb)',
    border: '3px solid var(--color-preview-scrollbar-track)',
    borderRadius: '999px',
  },
  '.cm-content': {
    padding: '14px',
  },
  '.cm-gutters': {
    color: 'var(--color-text-muted-strong)',
    backgroundColor: 'var(--color-surface-muted)',
    borderRight: '1px solid var(--color-border-subtle)',
  },
  '.cm-activeLine, .cm-activeLineGutter': {
    backgroundColor: 'var(--color-transparent)',
  },
});

const jsonPreviewExtensions = [
  json(),
  syntaxHighlighting(jsonHighlightStyle),
  jsonPreviewTheme,
  EditorState.readOnly.of(true),
  EditorView.editable.of(false),
];

const AccessibleListBlock = withUserAccessibilityThereStyle(ListBlock);

interface SchemaStatusPillProps {
  className?: string;
  valid: boolean;
}

function SchemaStatusPill({ className = '', valid }: SchemaStatusPillProps) {
  return (
    <span className={`state-pill ${valid ? 'good' : 'bad'} ${className}`}>
      {valid ? 'Schema pass' : 'Schema fail'}
    </span>
  );
}

const AccessibleSchemaStatusPill = withUserAccessibilityThereStyle(SchemaStatusPill);

export function ResultsPanel({ error, onHighlightField, responseHighlight, result }: ResultsPanelProps) {
  const validationErrorItems = useValidationErrorItems(result);
  const coverageStyle = useCoverageStyle(result);
  const responsePreview = result ? JSON.stringify(result.responsePreview, null, 2) : '';
  const [copied, setCopied] = useState(false);
  const [jsonCollapsed, setJsonCollapsed] = useState(false);
  const jsonEditorRef = useRef<ReactCodeMirrorRef | null>(null);

  useEffect(() => {
    if (responseHighlight && !jsonCollapsed) {
      highlightEditorField(jsonEditorRef.current?.view, responseHighlight.path, 'json');
    }
  }, [jsonCollapsed, responseHighlight]);

  async function copyResponsePreview() {
    if (!responsePreview) {
      return;
    }

    await navigator.clipboard.writeText(responsePreview);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function handleFieldHighlight(path: string, target: FieldHighlightTarget) {
    if (target === 'response') {
      setJsonCollapsed(false);
    }

    onHighlightField(path, target);
  }

  return (
    <section aria-labelledby="results-panel-title" className="panel results-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Results</p>
          <h2 id="results-panel-title">Contract evidence</h2>
        </div>
        {result && <AccessibleSchemaStatusPill valid={result.valid} />}
      </div>

      {error && (
        <div className="alert" role="alert"><AlertTriangle aria-hidden="true" size={18} /> {error}</div>
      )}

      {!result && !error && (
        <div className="empty-state">
          <Server size={32} />
          <p>Run a request to see schema validity, documented-field coverage, missing fields, and a JSON response preview.</p>
        </div>
      )}

      {result && (
        <div className="result-stack">
          <p aria-live="polite" className="sr-only">Schema check complete. {result.valid ? 'The schema passed.' : 'The schema failed.'}</p>
          <div className="coverage-band">
            <div>
              <span>Documented fields present</span>
              <strong>{result.presentFieldCount}/{result.documentedFieldCount}</strong>
            </div>
            <div aria-label="Documented fields present" aria-valuemax={result.documentedFieldCount} aria-valuemin={0} aria-valuenow={result.presentFieldCount} className="meter" role="progressbar"><span style={coverageStyle} /></div>
          </div>

          {resultLists.map(({ emptyText, infoText, key, title, tone }) => (
            <AccessibleListBlock
              emptyText={emptyText}
              infoText={infoText}
              itemActionTarget={key === 'unlistedFields' || key === 'presentFields' ? 'the JSON response' : 'the YAML schema'}
              items={result[key]}
              key={key}
              onItemClick={(path) => handleFieldHighlight(
                path,
                key === 'unlistedFields' || key === 'presentFields' ? 'response' : 'schema',
              )}
              title={title}
              tone={tone}
            />
          ))}
          <AccessibleListBlock
            title="Validation errors"
            items={validationErrorItems}
            emptyText="No schema validation errors."
            tone="missing"
          />

          <div className="preview-block">
            <div className="preview-heading">
              <h3><FileJson size={15} /> Response preview</h3>
              <div className="preview-actions">
                <button
                  aria-label="Copy response JSON"
                  className="preview-action-button"
                  disabled={!responsePreview}
                  onClick={() => void copyResponsePreview()}
                  type="button"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  aria-controls="response-preview"
                  aria-expanded={!jsonCollapsed}
                  aria-label={jsonCollapsed ? 'Expand response JSON' : 'Collapse response JSON'}
                  className="preview-action-button"
                  onClick={() => setJsonCollapsed((current) => !current)}
                  type="button"
                >
                  JSON <ChevronDown className={jsonCollapsed ? 'collapsed' : ''} size={14} />
                </button>
              </div>
            </div>
            {!jsonCollapsed ? (
              <CodeMirror
                aria-label="Response preview JSON"
                basicSetup={{ foldGutter: false, lineNumbers: false }}
                className="json-preview-editor"
                extensions={jsonPreviewExtensions}
                theme="none"
                value={responsePreview}
                id="response-preview"
                ref={jsonEditorRef}
              />
            ) : null}
            <p aria-live="polite" className="sr-only">{copied ? 'Response JSON copied to clipboard.' : ''}</p>
          </div>
        </div>
      )}
    </section>
  );
}
