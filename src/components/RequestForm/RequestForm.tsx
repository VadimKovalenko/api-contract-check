import type { FormEvent } from 'react';
import { useRef, useState } from 'react';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { yaml } from '@codemirror/lang-yaml';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { oneDarkTheme } from '@codemirror/theme-one-dark';
import { tags } from '@lezer/highlight';
import { KeyRound, Sparkles } from 'lucide-react';
import { formatYamlSpec, useAuthTypes } from './hooks';
import type { CheckFormState, RunCheck, UpdateFormField } from '../../types';
import { colors } from '../../colors';
import './styles.css';

interface RequestFormProps {
  form: CheckFormState;
  onRunCheck: RunCheck;
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
    color: colors.text,
    backgroundColor: colors.surfaceStrong,
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    fontSize: '0.85rem',
    transition: 'border-color 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease',
  },
  '&.cm-focused': {
    outline: 'none',
    borderColor: colors.accentFocus,
    backgroundColor: colors.surfaceStrongFocus,
    boxShadow: `0 0 0 3px ${colors.accentFocusRing}`,
  },
  '.cm-scroller': {
    minHeight: '360px',
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
    lineHeight: '1.5',
  },
  '.cm-content': {
    minHeight: '360px',
    padding: '14px',
    caretColor: colors.text,
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: colors.text,
  },
  '.cm-gutters': {
    color: colors.textMutedStrong,
    backgroundColor: colors.surfaceMuted,
    borderRight: `1px solid ${colors.borderSubtle}`,
  },
  '.cm-activeLine, .cm-activeLineGutter': {
    backgroundColor: colors.surfaceRaised,
  },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: colors.accentFocusRing,
  },
});

const yamlEditorExtensions = [yaml(), oneDarkTheme, syntaxHighlighting(yamlHighlightStyle), yamlEditorTheme];

export function RequestForm({ form, onRunCheck, onUpdateField }: RequestFormProps) {
  const authTypes = useAuthTypes();
  const yamlEditorRef = useRef<ReactCodeMirrorRef | null>(null);
  const [formatError, setFormatError] = useState('');

  function updateYamlSpec(value: string) {
    setFormatError('');
    onUpdateField('yamlSpec', value);
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

  function handleSubmit(event: FormEvent) {
    void onRunCheck(event);
  }

  return (
    <form className="panel input-panel" onSubmit={handleSubmit}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Request</p>
          <h2>GET endpoint</h2>
        </div>
        <span className="method-pill">GET</span>
      </div>

      <label className="field">
        <span>URL</span>
        <input
          value={form.url}
          onChange={(event) => onUpdateField('url', event.target.value)}
          placeholder="https://api.example.com/users/1"
        />
      </label>

      <div className="auth-box">
        <div className="auth-title"><KeyRound size={16} /> Auth</div>
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
          <span>OpenAPI subset YAML</span>
          <button className="format-button" onClick={handleFormatYaml} type="button">
            <Sparkles size={15} />
            Auto Format
          </button>
        </div>
        <CodeMirror
          ref={yamlEditorRef}
          className="yaml-editor"
          value={form.yamlSpec}
          extensions={yamlEditorExtensions}
          basicSetup={{ foldGutter: false }}
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
