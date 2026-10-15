import { EditorView } from '@codemirror/view';

type EditorFormat = 'json' | 'yaml';

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getFieldName(path: string) {
  return path.replace(/\[\]/g, '').split('.').at(-1) ?? path;
}

export function highlightEditorField(view: EditorView | undefined, path: string, format: EditorFormat) {
  if (!view) {
    return false;
  }

  const fieldName = getFieldName(path);
  const escapedFieldName = escapeRegExp(fieldName);
  const pattern = format === 'json'
    ? new RegExp(`^\\s*"${escapedFieldName}"\\s*:.*$`, 'm')
    : new RegExp(`^\\s*(?:"${escapedFieldName}"|'${escapedFieldName}'|${escapedFieldName})\\s*:.*$`, 'm');
  const match = pattern.exec(view.state.doc.toString());

  if (!match || match.index === undefined) {
    return false;
  }

  const from = match.index;
  const to = from + match[0].length;
  view.dispatch({
    effects: EditorView.scrollIntoView(from, { y: 'center' }),
    selection: { anchor: from, head: to },
  });
  view.focus();
  return true;
}
