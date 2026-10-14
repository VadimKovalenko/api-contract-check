import CodeMirror from '@uiw/react-codemirror';
import { yaml } from '@codemirror/lang-yaml';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { type FormEvent, useState } from 'react';
import { Check, ChevronDown, Copy, FileCode2, Play, Trash2, X } from 'lucide-react';
import { deriveExampleUrlFromOpenApi } from '../RequestForm/hooks';
import type { SavedYaml } from '../../types';
import './styles.css';

interface MyYamlsProps {
  onCreateYaml: (input: Pick<SavedYaml, 'title' | 'url' | 'yamlSpec'>) => void;
  onRemoveYaml: (id: string) => void;
  onUseYaml: (savedYaml: SavedYaml) => void;
  savedYamls: SavedYaml[];
}

function formatSavedDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

const yamlHighlightStyle = HighlightStyle.define([
  { tag: [tags.definition(tags.propertyName), tags.labelName], class: 'cm-yaml-key' },
  { tag: [tags.content, tags.string, tags.number, tags.attributeValue], class: 'cm-yaml-value' },
  { tag: [tags.bool, tags.null, tags.atom, tags.typeName], class: 'cm-yaml-literal' },
  { tag: [tags.comment, tags.lineComment], class: 'cm-yaml-comment' },
  { tag: [tags.punctuation, tags.separator, tags.squareBracket, tags.brace], class: 'cm-yaml-punctuation' },
]);

const yamlCardTheme = EditorView.theme({
  '&': {
    maxHeight: '320px',
    overflow: 'hidden',
    color: 'var(--color-text-preview)',
    backgroundColor: 'var(--color-preview-bg)',
    border: '1px solid var(--color-border-subtle)',
    borderRadius: '8px',
    fontSize: '0.78rem',
  },
  '.cm-scroller': {
    maxHeight: '320px',
    overflow: 'auto',
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
    lineHeight: '1.45',
    scrollbarColor: 'var(--color-preview-scrollbar-thumb) var(--color-preview-scrollbar-track)',
  },
  '.cm-content': {
    padding: '12px',
  },
  '.cm-gutters': {
    display: 'none',
  },
  '.cm-activeLine, .cm-activeLineGutter': {
    backgroundColor: 'var(--color-transparent)',
  },
});

const yamlCardExtensions = [
  yaml(),
  syntaxHighlighting(yamlHighlightStyle),
  yamlCardTheme,
  EditorState.readOnly.of(true),
  EditorView.editable.of(false),
];

export function MyYamls({ onCreateYaml, onRemoveYaml, onUseYaml, savedYamls }: MyYamlsProps) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const [copiedId, setCopiedId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<SavedYaml | null>(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [yamlSpec, setYamlSpec] = useState('');

  async function copyYaml(savedYaml: SavedYaml) {
    await navigator.clipboard.writeText(savedYaml.yamlSpec);
    setCopiedId(savedYaml.id);
    window.setTimeout(() => setCopiedId(''), 1400);
  }

  function createYaml(event: FormEvent) {
    event.preventDefault();

    if (!url.trim() || !yamlSpec.trim()) {
      return;
    }

    onCreateYaml({ title, url, yamlSpec });
    setTitle('');
    setUrl('');
    setYamlSpec('');
  }

  function confirmRemoveYaml() {
    if (!deleteTarget) {
      return;
    }

    onRemoveYaml(deleteTarget.id);
    setDeleteTarget(null);
  }

  function toggleCollapsed(id: string) {
    setCollapsedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function updateYamlSpec(value: string) {
    setYamlSpec(value);

    const exampleUrl = deriveExampleUrlFromOpenApi(value);
    if (exampleUrl && exampleUrl !== url) {
      setUrl(exampleUrl);
    }
  }

  return (
    <section className="yamls-page" aria-labelledby="my-yamls-title">
      <div className="yamls-heading">
        <div>
          <p className="eyebrow">Library</p>
          <h1 id="my-yamls-title">My Yamls</h1>
        </div>
        <span className="yamls-count">{savedYamls.length} saved</span>
      </div>

      <form className="panel yaml-create-panel" onSubmit={createYaml}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Create</p>
            <h2>Save a YAML contract</h2>
          </div>
        </div>
        <div className="yaml-create-grid">
          <label className="field">
            <span>Name</span>
            <input
              onChange={(event) => setTitle(event.target.value)}
              placeholder="User profile schema"
              value={title}
            />
          </label>
          <label className="field">
            <span>Request URL</span>
            <input
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://api.example.com/resource"
              required
              value={url}
            />
          </label>
        </div>
        <label className="field">
          <span>YAML schema</span>
          <textarea
            className="yaml-create-textarea"
            onChange={(event) => updateYamlSpec(event.target.value)}
            placeholder="openapi: 3.0.1"
            required
            value={yamlSpec}
          />
        </label>
        <div className="yaml-create-actions">
          <button className="run-button create-yaml-button" disabled={!url.trim() || !yamlSpec.trim()} type="submit">
            <span>Create YAML</span>
          </button>
        </div>
      </form>

      {savedYamls.length === 0 ? (
        <div className="panel yamls-empty">
          <FileCode2 size={34} />
          <p>Your saved request and YAML pairs will appear here.</p>
        </div>
      ) : (
        <div className="yamls-grid">
          {savedYamls.map((savedYaml) => (
            <article className="yaml-card" key={savedYaml.id}>
              <div className="yaml-card-heading">
                <div>
                  <h2>{savedYaml.title}</h2>
                  <time dateTime={savedYaml.createdAt}>{formatSavedDate(savedYaml.createdAt)}</time>
                </div>
                <div className="yaml-card-actions">
                  <button
                    aria-label={`Copy ${savedYaml.title} YAML`}
                    className="preview-action-button"
                    onClick={() => void copyYaml(savedYaml)}
                    type="button"
                  >
                    {copiedId === savedYaml.id ? <Check size={14} /> : <Copy size={14} />}
                    {copiedId === savedYaml.id ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    aria-expanded={!collapsedIds.has(savedYaml.id)}
                    aria-label={collapsedIds.has(savedYaml.id) ? `Expand ${savedYaml.title} YAML` : `Collapse ${savedYaml.title} YAML`}
                    className="preview-action-button"
                    onClick={() => toggleCollapsed(savedYaml.id)}
                    type="button"
                  >
                    YAML <ChevronDown className={collapsedIds.has(savedYaml.id) ? 'collapsed' : ''} size={14} />
                  </button>
                  <button
                    className="preview-action-button"
                    onClick={() => onUseYaml(savedYaml)}
                    type="button"
                  >
                    <Play size={14} />
                    Use
                  </button>
                  <button
                    aria-label={`Remove ${savedYaml.title}`}
                    className="preview-action-button danger"
                    onClick={() => setDeleteTarget(savedYaml)}
                    type="button"
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                </div>
              </div>
              <div className="yaml-card-request">
                <span>Request</span>
                <code>{savedYaml.url}</code>
              </div>
              {!collapsedIds.has(savedYaml.id) ? (
                <CodeMirror
                  aria-label={`${savedYaml.title} YAML schema`}
                  basicSetup={{ foldGutter: false, lineNumbers: false }}
                  className="yaml-card-preview"
                  extensions={yamlCardExtensions}
                  theme="none"
                  value={savedYaml.yamlSpec}
                />
              ) : null}
            </article>
          ))}
        </div>
      )}

      {deleteTarget ? (
        <div className="confirm-backdrop" role="presentation">
          <section
            aria-labelledby="confirm-delete-title"
            aria-modal="true"
            className="confirm-dialog"
            role="dialog"
          >
            <div className="confirm-heading">
              <div>
                <p className="eyebrow">Remove YAML</p>
                <h2 id="confirm-delete-title">Delete {deleteTarget.title}?</h2>
              </div>
              <button
                aria-label="Cancel removal"
                className="privacy-icon-button"
                onClick={() => setDeleteTarget(null)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <p>
              This removes the saved request and YAML schema from this browser.
            </p>
            <div className="confirm-actions">
              <button className="privacy-link-button" onClick={() => setDeleteTarget(null)} type="button">
                Cancel
              </button>
              <button className="confirm-danger-button" onClick={confirmRemoveYaml} type="button">
                <Trash2 size={16} />
                Remove
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
