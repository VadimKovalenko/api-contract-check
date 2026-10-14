import type { FormEvent } from 'react';
import { useId, useRef, useState } from 'react';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { yaml } from '@codemirror/lang-yaml';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { Check, Copy, Info, KeyRound, Save, Sparkles } from 'lucide-react';
import { deriveExampleUrlFromOpenApi, formatYamlSpec, useAuthTypes } from './hooks';
import type { CheckFormState, RunCheck, UpdateFormField } from '../../types';
import './styles.css';

interface RequestFormProps {
  form: CheckFormState;
  onRunCheck: RunCheck;
  onSaveCurrentYaml: () => void;
  onUpdateField: UpdateFormField;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to format YAML.';
}

const yamlHighlightStyle = HighlightStyle.define([
  { tag: [tags.definition(tags.propertyName), tags.labelName], class: 'cm-yaml-key' },
  { tag: [tags.content, tags.string, tags.number, tags.attributeValue], class: 'cm-yaml-value' },
  { tag: [tags.bool, tags.null, tags.atom, tags.typeName], class: 'cm-yaml-literal' },
  { tag: [tags.comment, tags.lineComment], class: 'cm-yaml-comment' },
  { tag: [tags.punctuation, tags.separator, tags.squareBracket, tags.brace], class: 'cm-yaml-punctuation' },
]);

const yamlEditorTheme = EditorView.theme({
  '&': {
    flex: '1',
    minHeight: '360px',
    color: 'var(--color-text)',
    backgroundColor: 'var(--color-surface-strong)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    fontSize: '0.85rem',
    transition: 'border-color 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease',
  },
  '&.cm-focused': {
    outline: 'none',
    borderColor: 'var(--color-accent-focus)',
    backgroundColor: 'var(--color-surface-strong-focus)',
    boxShadow: '0 0 0 3px var(--color-accent-focus-ring)',
  },
  '.cm-scroller': {
    minHeight: '360px',
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
    lineHeight: '1.5',
  },
  '.cm-content': {
    minHeight: '360px',
    padding: '14px',
    caretColor: 'var(--color-text)',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--color-text)',
  },
  '.cm-gutters': {
    color: 'var(--color-text-muted-strong)',
    backgroundColor: 'var(--color-surface-muted)',
    borderRight: '1px solid var(--color-border-subtle)',
  },
  '.cm-activeLine, .cm-activeLineGutter': {
    backgroundColor: 'var(--color-surface-raised)',
  },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'var(--color-accent-focus-ring)',
  },
});

const yamlEditorExtensions = [yaml(), syntaxHighlighting(yamlHighlightStyle), yamlEditorTheme, EditorView.lineWrapping];
const yamlHelperText = 'Pasted specs only work when the Endpoint URL matches the documented server and path. If validation says required root fields are missing, compare Response Preview top-level keys with the schema required fields.';

export function RequestForm({ form, onRunCheck, onSaveCurrentYaml, onUpdateField }: RequestFormProps) {
  const authTypes = useAuthTypes();
  const yamlTipId = useId();
  const yamlEditorRef = useRef<ReactCodeMirrorRef | null>(null);
  const [copied, setCopied] = useState(false);
  const [formatError, setFormatError] = useState('');

  function updateYamlSpec(value: string) {
    setFormatError('');
    onUpdateField('yamlSpec', value);

    const exampleUrl = deriveExampleUrlFromOpenApi(value);
    if (exampleUrl && exampleUrl !== form.url) {
      onUpdateField('url', exampleUrl);
    }
  }

  function restoreYamlSelection(selectionStart: number, selectionEnd: number) {
    requestAnimationFrame(() => {
      const view = yamlEditorRef.current?.view;

      if (!view) {
        return;
      }

      view.focus();
      view.dispatch({ selection: { anchor: selectionStart, head: selectionEnd } });
    });
  }

  function handleFormatYaml() {
    try {
      const formatted = formatYamlSpec(form.yamlSpec);
      setFormatError('');
      onUpdateField('yamlSpec', formatted);
      restoreYamlSelection(formatted.length, formatted.length);
    } catch (error) {
      setFormatError(getErrorMessage(error));
    }
  }

  async function copyYamlSpec() {
    if (!form.yamlSpec) {
      return;
    }

    await navigator.clipboard.writeText(form.yamlSpec);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function handleSubmit(event: FormEvent) {
    void onRunCheck(event);
  }

  return (
    <form className="panel input-panel" onSubmit={handleSubmit}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Request</p>
          <h2>Endpoint URL</h2>
        </div>
        <span className="method-pill">GET</span>
      </div>

      <label className="field">
        <span>Endpoint URL</span>
        <input
          value={form.url}
          onChange={(event) => onUpdateField('url', event.target.value)}
          placeholder="https://api.example.com/users/1"
        />
      </label>

      <div className="auth-box">
        <div className="auth-title"><KeyRound size={16} /> Authentication</div>
        <div className="segmented">
          {authTypes.map((type) => (
            <button
              key={type}
              type="button"
              className={form.authType === type ? 'active' : ''}
              onClick={() => onUpdateField('authType', type)}
            >
              {type}
            </button>
          ))}
        </div>
        {form.authType === 'bearer' && (
          <input value={form.token} onChange={(event) => onUpdateField('token', event.target.value)} placeholder="Bearer token" />
        )}
        {form.authType === 'cookie' && (
          <input value={form.cookie} onChange={(event) => onUpdateField('cookie', event.target.value)} placeholder="session=abc123" />
        )}
        {form.authType === 'custom' && (
          <div className="two-col">
            <input value={form.headerName} onChange={(event) => onUpdateField('headerName', event.target.value)} placeholder="Header name" />
            <input value={form.headerValue} onChange={(event) => onUpdateField('headerValue', event.target.value)} placeholder="Header value" />
          </div>
        )}
      </div>

      <div className="field grow-field">
        <div className="field-header">
          <span className="yaml-title">
            OpenAPI subset YAML
            <span className="info-tip">
              <button
                aria-describedby={yamlTipId}
                aria-label="OpenAPI subset YAML info"
                className="info-tip-button"
                type="button"
              >
                <Info size={15} />
              </button>
              <span className="info-tip-text" id={yamlTipId} role="tooltip">{yamlHelperText}</span>
            </span>
          </span>
          <div className="yaml-actions">
            <button className="format-button" onClick={() => void copyYamlSpec()} type="button">
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button className="format-button" onClick={onSaveCurrentYaml} type="button">
              <Save size={15} />
              Save
            </button>
            <button className="format-button" onClick={handleFormatYaml} type="button">
              <Sparkles size={15} />
              Auto Format
            </button>
          </div>
        </div>
        <CodeMirror
          ref={yamlEditorRef}
          className="yaml-editor"
          value={form.yamlSpec}
          extensions={yamlEditorExtensions}
          basicSetup={{
            foldGutter: false,
            highlightActiveLine: false,
            highlightActiveLineGutter: false,
            lineNumbers: false,
          }}
          height="100%"
          indentWithTab
          onChange={updateYamlSpec}
          theme="none"
        />
        {formatError && <p className="format-error">{formatError}</p>}
      </div>
    </form>
  );
}
