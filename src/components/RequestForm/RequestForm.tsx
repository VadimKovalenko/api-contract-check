import type { FormEvent, KeyboardEvent } from 'react';
import { useRef, useState } from 'react';
import { KeyRound, Sparkles } from 'lucide-react';
import { applyYamlTab, formatYamlSpec, useAuthTypes } from './hooks';
import type { CheckFormState, RunCheck, UpdateFormField } from '../../types';
import './styles.css';

interface RequestFormProps {
  form: CheckFormState;
  onRunCheck: RunCheck;
  onUpdateField: UpdateFormField;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to format YAML.';
}

export function RequestForm({ form, onRunCheck, onUpdateField }: RequestFormProps) {
  const authTypes = useAuthTypes();
  const yamlInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [formatError, setFormatError] = useState('');

  function updateYamlSpec(value: string) {
    setFormatError('');
    onUpdateField('yamlSpec', value);
  }

  function restoreYamlSelection(selectionStart: number, selectionEnd: number) {
    requestAnimationFrame(() => {
      yamlInputRef.current?.focus();
      yamlInputRef.current?.setSelectionRange(selectionStart, selectionEnd);
    });
  }

  function handleYamlKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Tab') {
      return;
    }

    event.preventDefault();
    setFormatError('');

    const next = applyYamlTab(
      form.yamlSpec,
      event.currentTarget.selectionStart,
      event.currentTarget.selectionEnd,
      event.shiftKey,
    );

    onUpdateField('yamlSpec', next.value);
    restoreYamlSelection(next.selectionStart, next.selectionEnd);
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
        <textarea
          ref={yamlInputRef}
          value={form.yamlSpec}
          onChange={(event) => updateYamlSpec(event.target.value)}
          onKeyDown={handleYamlKeyDown}
          spellCheck="false"
        />
        {formatError && <p className="format-error">{formatError}</p>}
      </div>
    </form>
  );
}
