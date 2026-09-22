import YAML from 'yaml';
import { authTypes } from './constants.js';

export function useAuthTypes() {
  return authTypes;
}

export function formatYamlSpec(value) {
  const document = YAML.parseDocument(value);

  if (document.errors.length > 0) {
    throw new Error(document.errors[0].message);
  }

  return document.toString({
    indent: 2,
    lineWidth: 0,
  });
}

export function applyYamlTab(value, selectionStart, selectionEnd, outdent = false) {
  if (selectionStart === selectionEnd) {
    return outdent
      ? outdentAtCursor(value, selectionStart)
      : {
          value: value.slice(0, selectionStart) + '  ' + value.slice(selectionEnd),
          selectionStart: selectionStart + 2,
          selectionEnd: selectionStart + 2,
        };
  }

  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
  const lineEnd = selectionEnd > selectionStart && value[selectionEnd - 1] === '\n'
    ? selectionEnd - 1
    : selectionEnd;
  const selectedText = value.slice(lineStart, lineEnd);
  const lines = selectedText.split('\n');

  if (!outdent) {
    const indented = lines.map((line) => '  ' + line).join('\n');
    const added = indented.length - selectedText.length;

    return {
      value: value.slice(0, lineStart) + indented + value.slice(lineEnd),
      selectionStart: selectionStart + 2,
      selectionEnd: selectionEnd + added,
    };
  }

  let removedTotal = 0;
  const outdented = lines
    .map((line) => {
      const removed = line.startsWith('  ') ? 2 : line.startsWith('\t') ? 1 : 0;
      removedTotal += removed;
      return line.slice(removed);
    })
    .join('\n');

  return {
    value: value.slice(0, lineStart) + outdented + value.slice(lineEnd),
    selectionStart: Math.max(lineStart, selectionStart - getRemovedBeforeSelection(lines, lineStart, selectionStart)),
    selectionEnd: Math.max(lineStart, selectionEnd - removedTotal),
  };
}

function getRemovedBeforeSelection(lines, lineStart, selectionStart) {
  let offset = lineStart;
  let removedBeforeSelection = 0;

  for (const line of lines) {
    if (offset >= selectionStart) {
      break;
    }

    if (line.startsWith('  ')) {
      removedBeforeSelection += 2;
    } else if (line.startsWith('\t')) {
      removedBeforeSelection += 1;
    }

    offset += line.length + 1;
  }

  return removedBeforeSelection;
}

function outdentAtCursor(value, selectionStart) {
  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
  const beforeCursor = value.slice(lineStart, selectionStart);
  const removable = beforeCursor.endsWith('  ') ? 2 : beforeCursor.endsWith('\t') ? 1 : 0;

  if (removable === 0) {
    return { value, selectionStart, selectionEnd: selectionStart };
  }

  return {
    value: value.slice(0, selectionStart - removable) + value.slice(selectionStart),
    selectionStart: selectionStart - removable,
    selectionEnd: selectionStart - removable,
  };
}
